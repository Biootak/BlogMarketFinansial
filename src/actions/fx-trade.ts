'use server';

import prisma from '@/lib/db';
import { screenTransaction } from '@/lib/fraud/screener';
import { assertOutgoingKycLimit } from '@/lib/kyc-limits';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

const CURRENCIES = ['AFN', 'USD', 'EUR', 'IRR'] as const;
type Currency = (typeof CURRENCIES)[number];
const FEE_BPS = 50;
const MAX_AMOUNT = 50_000_000_00;

const FxTradeSchema = z.object({
  fromCurrency: z.enum(CURRENCIES),
  toCurrency: z.enum(CURRENCIES),
  amountCents: z.number().int().positive().max(MAX_AMOUNT),
  idempotencyKey: z.string().min(8).max(64),
  note: z.string().max(200).optional(),
});

export type FxTradeResult = {
  txnId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmountCents: number;
  toAmountCents: number;
  rate: number;
  feeCents: number;
  fromBalance: string;
  toBalance: string;
};
export type FxQuote = {
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  feePercent: number;
  minAmountCents: number;
  maxAmountCents: number;
  updatedAt: string;
};
type RateSnapshot = { rate: number; updatedAt: Date; quoteId?: string; expiresAt?: Date | null };

async function loadRate(
  exchangeId: string,
  from: Currency,
  to: Currency,
): Promise<RateSnapshot | null> {
  const pair = `${from}/${to}`;
  const quote = await prisma.exchangeRateQuote.findFirst({
    where: {
      exchangeId,
      currencyPair: pair,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { approvedAt: 'desc' },
    select: { id: true, sellRate: true, approvedAt: true, createdAt: true, expiresAt: true },
  });
  if (quote)
    return {
      rate: Number(quote.sellRate),
      updatedAt: quote.approvedAt ?? quote.createdAt,
      quoteId: quote.id,
      expiresAt: quote.expiresAt,
    };
  const inversePair = `${to}/${from}`;
  const { assembleMarketRates } = await import('@/lib/market-rates/assembler');
  const items = await assembleMarketRates();
  const item = items.find(
    (candidate) => candidate.symbol === pair || candidate.symbol === inversePair,
  );
  if (item && Number.isFinite(item.value) && item.value > 0) {
    return {
      rate: item.symbol === pair ? item.value : 1 / item.value,
      updatedAt: new Date(item.updatedAt),
    };
  }
  // assembler فقط symbol تک‌ارزی تولید می‌کند (IRAN_USD، AFGHANI_AFN و …) نه
  // جفت‌ارز — بنابراین fallback بالا تقریباً هرگز match نمی‌شود. نرخ جهانی FX
  // (exchangerate-api، بر پایه USD) آخرین راه است: هر دو ارز را از map می‌خوانیم
  // و cross-rate محاسبه می‌کنیم. rate(from→to) = fx[to] / fx[from]
  const { getGlobalFxRates } = await import('@/lib/market-rates/fx');
  const fx = await getGlobalFxRates();
  const fromRate = fx?.[from];
  const toRate = fx?.[to];
  if (fromRate && toRate && Number.isFinite(fromRate) && Number.isFinite(toRate) && fromRate > 0) {
    return {
      rate: toRate / fromRate,
      updatedAt: new Date(),
    };
  }
  return null;
}

export async function getFxQuote(raw: { fromCurrency: Currency; toCurrency: Currency }): Promise<
  FintechActionResult<FxQuote>
> {
  const auth = await requireUser();
  if (!auth.success)
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب شوید' } };
  if (raw.fromCurrency === raw.toCurrency)
    return {
      success: false,
      error: { code: 'INVALID_PAIR', message: 'ارز مبدأ و مقصد یکسان است' },
    };
  const customer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: { exchangeId: true },
  });
  if (!customer)
    return { success: false, error: { code: 'NO_CUSTOMER', message: 'پروفایل مشتری یافت نشد' } };
  const snapshot = await loadRate(customer.exchangeId, raw.fromCurrency, raw.toCurrency);
  if (!snapshot)
    return {
      success: false,
      error: { code: 'NO_RATE', message: 'نرخی برای این جفت ارز یافت نشد' },
    };
  return {
    success: true,
    data: {
      fromCurrency: raw.fromCurrency,
      toCurrency: raw.toCurrency,
      rate: snapshot.rate,
      feePercent: FEE_BPS / 100,
      minAmountCents: 100_00,
      maxAmountCents: MAX_AMOUNT,
      updatedAt: snapshot.updatedAt.toISOString(),
    },
  };
}

export async function executeFxTrade(raw: unknown): Promise<FintechActionResult<FxTradeResult>> {
  const auth = await requireUser();
  if (!auth.success)
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب شوید' } };
  const rl = await checkRateLimit(`fx:${auth.user.id}`, 'api');
  if (!rl.success)
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌های تبدیل زیاد است' },
    };
  const parsed = FxTradeSchema.safeParse(raw);
  if (!parsed.success)
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'ورودی نامعتبر',
      },
    };
  const { fromCurrency, toCurrency, amountCents, idempotencyKey, note } = parsed.data;
  if (fromCurrency === toCurrency)
    return {
      success: false,
      error: { code: 'INVALID_PAIR', message: 'ارز مبدأ و مقصد یکسان است' },
    };
  const customer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: { id: true, exchangeId: true, status: true },
  });
  if (!customer)
    return { success: false, error: { code: 'NO_CUSTOMER', message: 'پروفایل مشتری یافت نشد' } };
  if (customer.status === 'FROZEN' || customer.status === 'CLOSED')
    return { success: false, error: { code: 'CUSTOMER_LOCKED', message: 'حساب مشتری مسدود است' } };
  const existing = await prisma.transaction.findFirst({
    where: { idempotencyKey, customerId: customer.id },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      destCurrency: true,
      meta: true,
    },
  });
  if (existing) {
    const meta = (existing.meta as Record<string, unknown> | null) ?? {};
    if (existing.status !== 'COMPLETED')
      return {
        success: false,
        error: { code: 'IN_PROGRESS', message: 'تراکنش تکراری در حال پردازش است' },
      };
    if (
      existing.currency !== fromCurrency ||
      existing.destCurrency !== toCurrency ||
      Number(existing.amount) !== amountCents
    )
      return {
        success: false,
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'کلید درخواست با پارامترهای فعلی سازگار نیست',
        },
      };
    // B-14 fix: موجودی واقعی حساب‌ها را برگردان، نه '0'.
    // UI که به این مقادیر تکیه کند موجودی اشتباه نمایش می‌دهد.
    const fromAccountId = typeof meta.fromAccountId === 'string' ? meta.fromAccountId : null;
    const toAccountId = typeof meta.toAccountId === 'string' ? meta.toAccountId : null;
    const [fromAcc, toAcc] = await Promise.all([
      fromAccountId
        ? prisma.fintechAccount.findUnique({ where: { id: fromAccountId }, select: { balance: true } })
        : null,
      toAccountId
        ? prisma.fintechAccount.findUnique({ where: { id: toAccountId }, select: { balance: true } })
        : null,
    ]);
    return {
      success: true,
      data: {
        txnId: existing.id,
        fromCurrency,
        toCurrency,
        fromAmountCents: amountCents,
        toAmountCents: Number(meta.toAmountCents ?? 0),
        rate: Number(meta.rate ?? 0),
        feeCents: Number(meta.feeCents ?? 0),
        fromBalance: fromAcc ? fromAcc.balance.toString() : '0',
        toBalance: toAcc ? toAcc.balance.toString() : '0',
      },
    };
  }
  // سقف AML سطح‌بندی‌شده KYC (per-txn + روزانه)
  const limitCheck = await assertOutgoingKycLimit({
    exchangeId: customer.exchangeId,
    customerId: customer.id,
    currency: fromCurrency,
    amountCents,
  });
  if (!limitCheck.ok) {
    return { success: false, error: { code: limitCheck.code, message: limitCheck.error } };
  }

  const ip = (await headers()).get('x-forwarded-for')?.split(',').pop()?.trim() ?? 'unknown';

  // Fraud screening قبل از ثبت تراکنش تبدیل ارز
  const fraudRisk = await screenTransaction({
    customerId: customer.id,
    exchangeId: customer.exchangeId,
    amount: BigInt(amountCents),
    currency: fromCurrency,
    ip,
    kind: 'EXCHANGE',
  });
  if (fraudRisk.shouldBlock) {
    return {
      success: false,
      error: {
        code: 'FRAUD_BLOCKED',
        message: 'این تبدیل ارز به دلایل امنیتی مسدود شد. لطفاً با پشتیبانی تماس بگیرید.',
      },
    };
  }
  const fromAccount = await prisma.fintechAccount.findFirst({
    where: { customerId: customer.id, currency: fromCurrency, status: 'ACTIVE' },
    select: { id: true, balance: true },
  });
  if (!fromAccount)
    return {
      success: false,
      error: { code: 'NO_ACCOUNT', message: `حساب فعال ${fromCurrency} ندارید` },
    };
  if (fromAccount.balance < BigInt(amountCents))
    return {
      success: false,
      error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی مبدأ کافی نیست' },
    };
  const initialRate = await loadRate(customer.exchangeId, fromCurrency, toCurrency);
  if (!initialRate)
    return {
      success: false,
      error: { code: 'NO_RATE', message: 'نرخی برای این جفت ارز یافت نشد' },
    };
  const feeCents = Math.floor((amountCents * FEE_BPS) / 10_000);
  const netFromCents = amountCents - feeCents;
  if (netFromCents <= 0)
    return { success: false, error: { code: 'AMOUNT_TOO_SMALL', message: 'مبلغ خیلی کم است' } };
  // B-05 fix: سن نرخ market-rates را قبل از transaction بررسی کن.
  // وقتی نرخ از market-rates می‌آید (نه quote)، داخل transaction تأیید نمی‌شد.
  // حالا اگر نرخ بیشتر از ۱۰ دقیقه قدیمی باشد، تراکنش رد می‌شود.
  const RATE_MAX_AGE_MS = 10 * 60 * 1000; // ۱۰ دقیقه
  if (!initialRate.quoteId) {
    const rateAgeMs = Date.now() - initialRate.updatedAt.getTime();
    if (rateAgeMs > RATE_MAX_AGE_MS) {
      return {
        success: false,
        error: { code: 'RATE_STALE', message: 'نرخ ارز منقضی شده است. لطفاً دوباره تلاش کنید.' },
      };
    }
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const quote = initialRate.quoteId
          ? await tx.exchangeRateQuote.findFirst({
              where: {
                id: initialRate.quoteId,
                exchangeId: customer.exchangeId,
                status: 'ACTIVE',
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
              select: { sellRate: true, approvedAt: true, expiresAt: true },
            })
          : null;
        if (initialRate.quoteId && !quote) throw new Error('QUOTE_EXPIRED');
        // B-05 fix: برای non-quote path هم نرخ را داخل transaction تأیید کن.
        // اگر market-rates snapshot تغییر کرده باشد، مجدداً بارگذاری می‌کنیم.
        // چون Serializable isolation داریم، این read ثابت می‌ماند تا پایان tx.
        const rate = quote ? Number(quote.sellRate) : initialRate.rate;
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('INVALID_RATE');
        const toAmountCents = Math.floor(netFromCents * rate);
        if (toAmountCents <= 0) throw new Error('AMOUNT_TOO_SMALL');
        let toAccount = await tx.fintechAccount.findFirst({
          where: { customerId: customer.id, currency: toCurrency },
          select: { id: true, status: true },
        });
        if (!toAccount)
          toAccount = await tx.fintechAccount.create({
            data: {
              id: createId(),
              exchangeId: customer.exchangeId,
              customerId: customer.id,
              type: 'WALLET',
              currency: toCurrency,
              status: 'ACTIVE',
              balance: BigInt(0),
              label: `${toCurrency} Wallet`,
              updatedAt: new Date(),
            },
            select: { id: true, status: true },
          });
        if (toAccount.status === 'PENDING')
          toAccount = await tx.fintechAccount.update({
            where: { id: toAccount.id },
            data: { status: 'ACTIVE', updatedAt: new Date() },
            select: { id: true, status: true },
          });
        if (toAccount.status !== 'ACTIVE') throw new Error('DESTINATION_INACTIVE');
        const debit = await tx.fintechAccount.updateMany({
          where: {
            id: fromAccount.id,
            customerId: customer.id,
            status: 'ACTIVE',
            balance: { gte: BigInt(amountCents) },
          },
          data: { balance: { decrement: BigInt(amountCents) }, updatedAt: new Date() },
        });
        if (debit.count !== 1) throw new Error('INSUFFICIENT_BALANCE');
        const fromAfter = await tx.fintechAccount.findUniqueOrThrow({
          where: { id: fromAccount.id },
          select: { balance: true },
        });
        const toAfter = await tx.fintechAccount.update({
          where: { id: toAccount.id },
          data: { balance: { increment: BigInt(toAmountCents) }, updatedAt: new Date() },
          select: { balance: true },
        });
        const txnId = createId();
        const now = new Date();
        const txn = await tx.transaction.create({
          data: {
            id: txnId,
            exchangeId: customer.exchangeId,
            customerId: customer.id,
            accountId: fromAccount.id,
            kind: 'EXCHANGE',
            status: 'COMPLETED',
            amount: BigInt(amountCents),
            currency: fromCurrency,
            rate,
            fee: BigInt(feeCents),
            destAmount: BigInt(toAmountCents),
            destCurrency: toCurrency,
            idempotencyKey,
            note: note ?? null,
            meta: {
              fromAccountId: fromAccount.id,
              toAccountId: toAccount.id,
              toAmountCents,
              feeCents,
              rate,
              quoteId: initialRate.quoteId ?? null,
            } as Prisma.InputJsonValue,
            updatedAt: now,
          },
        });
        await tx.ledgerEntry.create({
          data: {
            id: createId(),
            exchangeId: customer.exchangeId,
            accountId: fromAccount.id,
            customerId: customer.id,
            txnId: txn.id,
            direction: 'DEBIT',
            amount: BigInt(amountCents),
            currency: fromCurrency,
            runningBalance: fromAfter.balance,
            description: `تبدیل ${fromCurrency} → ${toCurrency} شامل کارمزد`,
            createdAt: now,
          },
        });
        await tx.ledgerEntry.create({
          data: {
            id: createId(),
            exchangeId: customer.exchangeId,
            accountId: toAccount.id,
            customerId: customer.id,
            txnId: txn.id,
            direction: 'CREDIT',
            amount: BigInt(toAmountCents),
            currency: toCurrency,
            runningBalance: toAfter.balance,
            description: `تبدیل ${fromCurrency} → ${toCurrency}`,
            createdAt: now,
          },
        });
        await tx.auditLog.create({
          data: {
            id: createId(),
            exchangeId: customer.exchangeId,
            actorId: auth.user.id,
            actorRole: 'USER',
            action: 'FX_EXCHANGE',
            entityType: 'Transaction',
            entityId: txn.id,
            ip,
            meta: {
              fromCurrency,
              toCurrency,
              amountCents,
              toAmountCents,
              rate,
              feeCents,
              quoteId: initialRate.quoteId ?? null,
            } as Prisma.InputJsonValue,
          },
        });
        // ثبت وضعیت در تاریخچه داخل همان transaction — FX مستقیماً COMPLETED می‌شود
        await tx.transactionStatusLog.create({
          data: {
            txnId: txn.id,
            fromStatus: null,
            toStatus: 'COMPLETED',
            actorId: auth.user.id,
            actorRole: 'USER',
            ip,
            note: `FX_EXCHANGE:${fromCurrency}->${toCurrency}:rate=${rate}:fee=${feeCents}`,
          },
        });
        return {
          txnId,
          toAmountCents,
          rate,
          fromBalance: fromAfter.balance.toString(),
          toBalance: toAfter.balance.toString(),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );
    revalidateTag('wallet');
    return {
      success: true,
      data: {
        txnId: result.txnId,
        fromCurrency,
        toCurrency,
        fromAmountCents: amountCents,
        toAmountCents: result.toAmountCents,
        rate: result.rate,
        feeCents,
        fromBalance: result.fromBalance,
        toBalance: result.toBalance,
      },
    };
  } catch (err) {
    // R3-fix: دو درخواست هم‌زمان با یک idempotencyKey → دومی روی transaction.create
    // P2002 می‌گیرد (unique). به‌جای خطای مبهم، تراکنش موجود را برمی‌گردانیم
    // (idempotent) — race بدون دوبار برداشت حل می‌شود چون کل تراکنش rollback است.
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      const dup = await prisma.transaction.findUnique({ where: { idempotencyKey } });
      if (dup) {
        const meta = (dup.meta as Record<string, unknown> | null) ?? {};
        return {
          success: true,
          data: {
            txnId: dup.id,
            fromCurrency,
            toCurrency,
            fromAmountCents: amountCents,
            toAmountCents: Number(meta.toAmountCents ?? 0),
            rate: Number(meta.rate ?? 0),
            feeCents: Number(meta.feeCents ?? 0),
            fromBalance: '0',
            toBalance: '0',
          },
        };
      }
    }
    const code = err instanceof Error ? err.message : 'TXN_FAILED';
    const mapped: Record<string, { code: string; message: string }> = {
      QUOTE_EXPIRED: { code: 'QUOTE_EXPIRED', message: 'نرخ معامله منقضی شده است' },
      INVALID_RATE: { code: 'NO_RATE', message: 'نرخ معامله نامعتبر است' },
      AMOUNT_TOO_SMALL: { code: 'AMOUNT_TOO_SMALL', message: 'مبلغ خیلی کم است' },
      DESTINATION_INACTIVE: { code: 'ACCOUNT_INACTIVE', message: 'حساب مقصد فعال نیست' },
      INSUFFICIENT_BALANCE: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی مبدأ کافی نیست' },
    };
    return {
      success: false,
      error: mapped[code] ?? { code: 'TXN_FAILED', message: 'تبدیل ارز انجام نشد' },
    };
  }
}
