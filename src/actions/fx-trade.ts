'use server';

/**
 * fx-trade.ts — Server Action برای تبدیل ارز درون کیف پول.
 *
 * جریان:
 *   1. کاربر account مبدأ (مثلاً AFN) و ارز مقصد (مثلاً USD) و مبلغ را انتخاب می‌کند
 *   2. نرخ از ExchangeRateQuote فعال صرافی مبدأ گرفته می‌شود
 *   3. اگر حساب مقصد نداشت → ساخته می‌شود
 *   4. تراکنش EXCHANGE ساخته می‌شود (status=COMPLETED چون بین حساب‌های خود کاربر است)
 *   5. LedgerEntry برای هر دو حساب
 *   6. AuditLog ثبت می‌شود
 *
 * امنیت:
 *   - requireUser
 *   - idempotencyKey اجباری
 *   - rate-limit (api)
 *   - چک balance مبدأ
 *   - چک فعال بودن نرخ
 */

import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

const SUPPORTED_CURRENCIES = ['AFN', 'USD', 'EUR', 'IRR'] as const;
type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const FxTradeSchema = z.object({
  fromCurrency: z.enum(SUPPORTED_CURRENCIES),
  toCurrency: z.enum(SUPPORTED_CURRENCIES),
  amountCents: z
    .number()
    .int()
    .positive('مبلغ باید مثبت باشد')
    .max(50_000_000_00, 'سقف تبدیل ۵۰ میلیون'),
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

/**
 * FxGetQuote — محاسبه نرخ و سقف/کف برای نمایش در UI.
 *
 * نرخ از ExchangeRateQuote فعال صرافی مبدأ گرفته می‌شود.
 * اگر صرافی صرافی برای این جفت quote نداشت → fallback به assembled market rates.
 */
export async function getFxQuote(raw: {
  fromCurrency: Currency;
  toCurrency: Currency;
}): Promise<FintechActionResult<FxQuote>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب شوید' } };
  }
  if (raw.fromCurrency === raw.toCurrency) {
    return {
      success: false,
      error: { code: 'INVALID_PAIR', message: 'ارز مبدأ و مقصد یکسان است' },
    };
  }

  const customer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: { id: true, exchangeId: true },
  });
  if (!customer) {
    return { success: false, error: { code: 'NO_CUSTOMER', message: 'پروفایل مشتری یافت نشد' } };
  }

  const pair = `${raw.fromCurrency}/${raw.toCurrency}`;

  // 1. ExchangeRateQuote
  const quote = await prisma.exchangeRateQuote.findFirst({
    where: {
      exchangeId: customer.exchangeId,
      currencyPair: pair,
      status: 'ACTIVE',
    },
    orderBy: { approvedAt: 'desc' },
  });

  let rate: number;
  let updatedAt: Date;
  if (quote) {
    // صرافی می‌فروشد (sellRate) → وقتی کاربر fromCurrency می‌دهد و toCurrency می‌گیرد
    // نرخ تبدیل = sellRate قیمت‌گذاری شده توسط صرافی
    rate = Number(quote.sellRate);
    updatedAt = quote.approvedAt ?? quote.createdAt;
  } else {
    // 2. Fallback: assembled market rate
    const { assembleMarketRates } = await import('@/lib/market-rates/assembler');
    const items = await assembleMarketRates();
    // جست‌وجوی جفت معکوس
    const inversePair = `${raw.toCurrency}/${raw.fromCurrency}`;
    const item = items.find((it) => it.symbol === pair || it.symbol === inversePair);
    if (!item) {
      return {
        success: false,
        error: { code: 'NO_RATE', message: 'نرخی برای این جفت ارز یافت نشد' },
      };
    }
    rate = item.value;
    updatedAt = new Date(item.updatedAt);
  }

  return {
    success: true,
    data: {
      fromCurrency: raw.fromCurrency,
      toCurrency: raw.toCurrency,
      rate,
      feePercent: 0.5, // ۰.۵٪ کارمزد پیش‌فرض
      minAmountCents: 100_00, // ۱۰۰
      maxAmountCents: 50_000_000_00,
      updatedAt: updatedAt.toISOString(),
    },
  };
}

/**
 * FxTrade — اجرای تبدیل ارز بین حساب‌های یک کاربر.
 *
 * اگر حساب مقصد وجود نداشت → در حین تراکنش ساخته می‌شود.
 */
export async function executeFxTrade(raw: unknown): Promise<FintechActionResult<FxTradeResult>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب شوید' } };
  }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await checkRateLimit(`fx:${auth.user.id}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌های تبدیل زیاد است' },
    };
  }

  const parsed = FxTradeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }
  const { fromCurrency, toCurrency, amountCents, idempotencyKey, note } = parsed.data;
  if (fromCurrency === toCurrency) {
    return {
      success: false,
      error: { code: 'INVALID_PAIR', message: 'ارز مبدأ و مقصد یکسان است' },
    };
  }

  // Idempotency
  const existing = await prisma.transaction.findFirst({
    where: { idempotencyKey },
    select: { id: true, meta: true, status: true },
  });
  if (existing) {
    if (existing.status === 'COMPLETED') {
      const meta = existing.meta as Record<string, unknown> | null;
      return {
        success: true,
        data: {
          txnId: existing.id,
          fromCurrency,
          toCurrency,
          fromAmountCents: amountCents,
          toAmountCents: Number(meta?.toAmountCents ?? 0),
          rate: Number(meta?.rate ?? 0),
          feeCents: Number(meta?.feeCents ?? 0),
          fromBalance: '0',
          toBalance: '0',
        },
      };
    }
    return {
      success: false,
      error: { code: 'IN_PROGRESS', message: 'تراکنش تکراری در حال پردازش است' },
    };
  }

  const customer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: { id: true, exchangeId: true },
  });
  if (!customer) {
    return { success: false, error: { code: 'NO_CUSTOMER', message: 'پروفایل مشتری یافت نشد' } };
  }

  // Account مبدأ
  const fromAccount = await prisma.fintechAccount.findFirst({
    where: { customerId: customer.id, currency: fromCurrency, status: 'ACTIVE' },
    select: { id: true, balance: true },
  });
  if (!fromAccount) {
    return {
      success: false,
      error: { code: 'NO_ACCOUNT', message: `حساب فعال ${fromCurrency} ندارید` },
    };
  }
  if (fromAccount.balance < BigInt(amountCents)) {
    return {
      success: false,
      error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی مبدأ کافی نیست' },
    };
  }

  // Account مقصد (در صورت نبود، ساخته می‌شود)
  let toAccount = await prisma.fintechAccount.findFirst({
    where: { customerId: customer.id, currency: toCurrency },
    select: { id: true, balance: true, status: true },
  });

  // نرخ
  const pair = `${fromCurrency}/${toCurrency}`;
  const inversePair = `${toCurrency}/${fromCurrency}`;

  let rate: number;
  const quote = await prisma.exchangeRateQuote.findFirst({
    where: {
      exchangeId: customer.exchangeId,
      currencyPair: pair,
      status: 'ACTIVE',
    },
    orderBy: { approvedAt: 'desc' },
  });
  if (quote) {
    rate = Number(quote.sellRate);
  } else {
    const { assembleMarketRates } = await import('@/lib/market-rates/assembler');
    const items = await assembleMarketRates();
    const item = items.find((it) => it.symbol === pair || it.symbol === inversePair);
    if (!item) {
      return {
        success: false,
        error: { code: 'NO_RATE', message: 'نرخی برای این جفت ارز یافت نشد' },
      };
    }
    // اگر جفت معکوس بود، rate را معکوس می‌کنیم
    rate = item.symbol === pair ? item.value : 1 / item.value;
  }

  // محاسبه با کارمزد ۰.۵٪
  const feePercent = 0.5;
  const feeCents = Math.floor((amountCents * feePercent) / 100);
  const netFromCents = amountCents - feeCents;
  // destAmount بر اساس rate — rate به ازای هر 1 واحد fromCurrency
  const toAmountCents = Math.floor(netFromCents * rate);
  if (toAmountCents <= 0) {
    return {
      success: false,
      error: { code: 'AMOUNT_TOO_SMALL', message: 'مبلغ خیلی کم است' },
    };
  }

  const now = new Date();
  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      // اگر account مقصد نداشت، در حین تراکنش بساز
      if (!toAccount) {
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
            updatedAt: now,
          },
          select: { id: true, balance: true, status: true },
        });
      } else if (toAccount.status === 'PENDING') {
        // فعال‌سازی در اولین تبدیل
        toAccount = await tx.fintechAccount.update({
          where: { id: toAccount.id },
          data: { status: 'ACTIVE', updatedAt: now },
          select: { id: true, balance: true, status: true },
        });
      } else if (toAccount.status === 'FROZEN' || toAccount.status === 'CLOSED') {
        throw new Error('حساب مقصد غیرفعال است');
      }

      // Debit fromAccount
      // race-condition fix: شرط balance >= amount در همان UPDATE چک می‌شود تا
      // دو درخواست هم‌زمان نتوانند موجودی را منفی کنند (double-spend).
      const debit = await tx.fintechAccount.updateMany({
        where: { id: fromAccount.id, balance: { gte: BigInt(amountCents) } },
        data: { balance: { decrement: BigInt(amountCents) }, updatedAt: now },
      });
      if (debit.count === 0) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      const fromUpdated = await tx.fintechAccount.findUniqueOrThrow({
        where: { id: fromAccount.id },
        select: { balance: true },
      });

      // Credit toAccount
      const toUpdated = await tx.fintechAccount.update({
        where: { id: toAccount.id },
        data: { balance: { increment: BigInt(toAmountCents) }, updatedAt: now },
        select: { balance: true },
      });

      // Transaction
      const txn = await tx.transaction.create({
        data: {
          id: createId(),
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
          } as Prisma.InputJsonValue,
          updatedAt: now,
        },
      });

      // Ledger entries (debit + credit + fee)
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
          runningBalance: fromUpdated.balance,
          description: `تبدیل ${fromCurrency} → ${toCurrency}`,
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
          runningBalance: toUpdated.balance,
          description: `تبدیل ${fromCurrency} → ${toCurrency}`,
          createdAt: now,
        },
      });
      // fee entry
      if (feeCents > 0) {
        await tx.ledgerEntry.create({
          data: {
            id: createId(),
            exchangeId: customer.exchangeId,
            accountId: fromAccount.id,
            customerId: customer.id,
            txnId: txn.id,
            direction: 'DEBIT',
            amount: BigInt(feeCents),
            currency: fromCurrency,
            runningBalance: fromUpdated.balance - BigInt(feeCents),
            description: 'کارمزد تبدیل ارز',
            createdAt: now,
          },
        });
      }

      // AuditLog
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
          } as Prisma.InputJsonValue,
        },
      });

      return {
        txnId: txn.id,
        fromBalance: fromUpdated.balance.toString(),
        toBalance: toUpdated.balance.toString(),
      };
    });

    revalidateTag('wallet');

    return {
      success: true,
      data: {
        txnId: transactionResult.txnId,
        fromCurrency,
        toCurrency,
        fromAmountCents: amountCents,
        toAmountCents,
        rate,
        feeCents,
        fromBalance: transactionResult.fromBalance,
        toBalance: transactionResult.toBalance,
      },
    };
  } catch (err) {
    if ((err as Error).message === 'INSUFFICIENT_BALANCE') {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی مبدأ کافی نیست' },
      };
    }
    return {
      success: false,
      error: { code: 'TXN_FAILED', message: (err as Error).message || 'خطا در تبدیل ارز' },
    };
  }
}
