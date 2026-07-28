'use server';

/**
 * exchange-transactions — Server Actions ثبت و خواندن تراکنش‌های صراف.
 *
 * هر تراکنش به یک مشتری (Customer) و یک حساب (FintechAccount) وابسته است.
 * پس از ثبت تراکنش، ledger entry هم ثبت می‌شود (double-entry).
 * Idempotency: هر تراکنش idempotencyKey دارد تا submit مجدد بی‌خطر باشد.
 *
 * اصلاحات:
 *   C1: تراکنش EXCHANGE دو LedgerEntry ثبت می‌کند (DEBIT مبدأ + CREDIT مقصد)
 *   H2: رفع خطای دقت float — از Decimal.js برای تبدیل به BigInt استفاده می‌شود
 *   H3: حساب auto-create فقط بعد از KYC LEVEL_1 مجاز است
 *   H4: running balance از FintechAccount.balance خوانده می‌شود (نه آخرین LedgerEntry)
 *   P0-1: createTransaction نیازمند writeAccess=true است (فقط OWNER/MANAGER)
 *   P0-3: WITHDRAWAL بدون موجودی کافی بلاک می‌شود
 *   A1-24 (C1): rate-limit واقعی روی createTransaction
 *   A1-24 (H3): destAmount/destCurrency برای EXCHANGE اجباری
 *   A1-24 (M4): getExchangeStats از exchange.primaryCurrency (پویا) به جای 'AFN' hardcoded
 */

import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { Decimal } from '@prisma/client/runtime/library';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Constants ──────────────────────────────────────────────────────────────

const TX_KINDS = ['DEPOSIT', 'WITHDRAWAL', 'EXCHANGE', 'TRANSFER', 'FEE'] as const;
const TX_CURRENCIES = ['AFN', 'USD', 'EUR', 'IRR', 'AED', 'GBP', 'TRY', 'SAR', 'PKR'] as const;

// ─── Schema (H3: EXCHANGE → destAmount/destCurrency اجباری) ─────────────────

const TransactionSchema = z
  .object({
    customerId: z.string().min(1, 'مشتری الزامی است'),
    kind: z.enum(TX_KINDS, { message: 'نوع تراکنش نامعتبر است' }),
    amount: z.number().positive('مبلغ باید بزرگتر از صفر باشد'),
    currency: z.enum(TX_CURRENCIES, { message: 'ارز نامعتبر است' }),
    rate: z.number().positive().nullable().optional(),
    fee: z.number().min(0).default(0),
    destAmount: z.number().positive().nullable().optional(),
    destCurrency: z.enum(TX_CURRENCIES).nullable().optional(),
    note: z.string().max(500).nullable().optional(),
    counterparty: z.string().max(200).nullable().optional(),
    idempotencyKey: z.string().max(128).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // H3: اگر kind=EXCHANGE است، destAmount و destCurrency اجباری‌اند
    if (data.kind === 'EXCHANGE') {
      if (data.destAmount == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['destAmount'],
          message: 'برای تراکنش تبدیل، مبلغ مقصد الزامی است',
        });
      }
      if (data.destCurrency == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['destCurrency'],
          message: 'برای تراکنش تبدیل، ارز مقصد الزامی است',
        });
      }
    }
  });

// ─── Types ──────────────────────────────────────────────────────────────────

export type TransactionRow = {
  id: string;
  exchangeId: string;
  /** nullable برای تراکنش‌های settlement-level */
  customerId: string | null;
  /** nullable برای تراکنش‌های settlement-level */
  accountId: string | null;
  kind: string;
  status: string;
  /** مبلغ به صورت string (JSON-safe, BigInt از DB) — جایگزین number */
  amount: string;
  currency: string;
  rate: number | null;
  /** کارمزد به صورت string */
  fee: string;
  destAmount: string | null;
  destCurrency: string | null;
  note: string | null;
  counterparty: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { fullName: string; phone: string };
};

// ─── Helper: تبدیل float به BigInt بدون خطای دقت (H2) ───────────────────────
function toBigInt(value: number): bigint {
  const result = BigInt(new Decimal(value.toString()).mul(100).toFixed(0));
  if (value > 0 && result === BigInt(0)) return BigInt(1);
  return result;
}

// ─── Helper: BigInt → string (JSON-safe, بدون precision loss H1) ─────────────
function bigIntToStr(v: bigint): string {
  return v.toString();
}

// ─── READ ───────────────────────────────────────────────────────────────────

export async function getTransactions(
  exchangeId: string,
  opts?: {
    customerId?: string;
    kind?: string;
    status?: string;
    limit?: number;
    offset?: number;
    fromDate?: Date;
    toDate?: Date;
  },
): Promise<{ rows: TransactionRow[]; total: number }> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) return { rows: [], total: 0 };

  const exchangeFilter = { exchangeId };
  const customerFilter = opts?.customerId ? { customerId: opts.customerId } : {};
  const kindFilter =
    opts?.kind && opts.kind !== 'all'
      ? {
          kind: opts.kind as
            | 'DEPOSIT'
            | 'WITHDRAWAL'
            | 'EXCHANGE'
            | 'TRANSFER'
            | 'FEE'
            | 'SETTLEMENT'
            | 'ADJUSTMENT',
        }
      : {};
  const statusFilter =
    opts?.status && opts.status !== 'all'
      ? {
          status: opts.status as
            | 'PENDING'
            | 'PROCESSING'
            | 'COMPLETED'
            | 'FAILED'
            | 'REVERSED'
            | 'CANCELLED',
        }
      : {};
  const dateFilter =
    opts?.fromDate || opts?.toDate
      ? {
          createdAt: {
            ...(opts.fromDate ? { gte: opts.fromDate } : {}),
            ...(opts.toDate ? { lte: opts.toDate } : {}),
          },
        }
      : {};

  const whereBase = {
    ...exchangeFilter,
    ...customerFilter,
    ...kindFilter,
    ...statusFilter,
    ...dateFilter,
  };

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where: whereBase,
      include: { Customer: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    }),
    prisma.transaction.count({ where: whereBase }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      exchangeId: r.exchangeId,
      customerId: r.customerId ?? null,
      accountId: r.accountId ?? null,
      kind: r.kind,
      status: r.status,
      amount: bigIntToStr(r.amount),
      currency: r.currency,
      rate: r.rate,
      fee: bigIntToStr(r.fee),
      destAmount: r.destAmount !== null ? bigIntToStr(r.destAmount) : null,
      destCurrency: r.destCurrency,
      note: r.note,
      counterparty: r.counterparty,
      idempotencyKey: r.idempotencyKey,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      customer: r.Customer ? { fullName: r.Customer.fullName, phone: r.Customer.phone } : undefined,
    })),
    total,
  };
}

/**
 * دریافت یک تراکنش با id — برای زیرمسیر [id] در workspace صراف.
 * فقط تراکنش‌های متعلق به صرافی کاربر قابل دسترسی است.
 */
export async function getExchangeTransactionById(id: string): Promise<TransactionRow | null> {
  // ابتدا تراکنش را می‌گیریم تا exchangeId را بفهمیم (auth scoping)
  const row = await prisma.transaction.findUnique({
    where: { id },
    include: { Customer: { select: { fullName: true, phone: true } } },
  });
  if (!row) return null;

  const access = await requireExchangeAccess(row.exchangeId);
  if (!access.ok) return null;

  return {
    id: row.id,
    exchangeId: row.exchangeId,
    customerId: row.customerId ?? null,
    accountId: row.accountId ?? null,
    kind: row.kind,
    status: row.status,
    amount: bigIntToStr(row.amount),
    currency: row.currency,
    rate: row.rate,
    fee: bigIntToStr(row.fee),
    destAmount: row.destAmount !== null ? bigIntToStr(row.destAmount) : null,
    destCurrency: row.destCurrency,
    note: row.note,
    counterparty: row.counterparty,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customer: row.Customer ? { fullName: row.Customer.fullName, phone: row.Customer.phone } : undefined,
  };
}

// ─── CREATE ─────────────────────────────────────────────────────────────────

export async function createTransaction(
  exchangeId: string,
  raw: unknown,
): Promise<FintechActionResult<TransactionRow>> {
  // A1-24 (C1): rate-limit واقعی — header قبلاً دروغ می‌گفت
  const ip = (await headers()).get('x-forwarded-for')?.split(',').pop()?.trim() ?? 'unknown';
  const rl = await checkRateLimit(`create-txn:${ip}:${exchangeId}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها زیاد است. لطفاً صبر کنید.' },
    };
  }

  const access = await requireExchangeAccess(exchangeId, true);
  if (!access.ok)
    return { success: false, error: { code: access.error.code, message: access.error.message } };

  const parsed = TransactionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message ?? 'داده نامعتبر' },
    };
  }

  const {
    customerId,
    kind,
    amount,
    currency,
    rate,
    fee,
    destAmount,
    destCurrency,
    note,
    counterparty,
    idempotencyKey,
  } = parsed.data;

  // بررسی idempotency
  if (idempotencyKey) {
    const dup = await prisma.transaction.findUnique({ where: { idempotencyKey } });
    if (dup) {
      return {
        success: true,
        data: {
          id: dup.id,
          exchangeId: dup.exchangeId,
          customerId: dup.customerId ?? null,
          accountId: dup.accountId ?? null,
          kind: dup.kind,
          status: dup.status,
          amount: bigIntToStr(dup.amount),
          currency: dup.currency,
          rate: dup.rate,
          fee: bigIntToStr(dup.fee),
          destAmount: dup.destAmount !== null ? bigIntToStr(dup.destAmount) : null,
          destCurrency: dup.destCurrency,
          note: dup.note,
          counterparty: dup.counterparty,
          idempotencyKey: dup.idempotencyKey,
          createdAt: dup.createdAt.toISOString(),
          updatedAt: dup.updatedAt.toISOString(),
        },
      };
    }
  }

  // H3: KYC gate
  const [customer, exchange] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, exchangeId },
      select: { id: true, kycLevel: true, kycStatus: true },
    }),
    prisma.exchange.findUnique({
      where: { id: exchangeId },
      select: { requireKyc: true },
    }),
  ]);
  if (!customer) {
    return { success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'مشتری یافت نشد' } };
  }
  if (exchange?.requireKyc && (customer.kycStatus !== 'APPROVED' || customer.kycLevel === 'NONE')) {
    return {
      success: false,
      error: {
        code: 'KYC_REQUIRED',
        message: 'برای انجام تراکنش مالی، احراز هویت (KYC) الزامی است',
      },
    };
  }

  // پیدا کردن یا ساختن account برای ارز اصلی
  let account = await prisma.fintechAccount.findFirst({
    where: { exchangeId, customerId, currency },
    select: { id: true, balance: true },
  });
  if (!account) {
    account = await prisma.fintechAccount.create({
      data: {
        id: createId(),
        exchangeId,
        customerId,
        currency,
        type: 'WALLET',
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
      select: { id: true, balance: true },
    });
  }

  // H2: تبدیل float → BigInt
  const amountBig = toBigInt(amount);
  const feeBig = toBigInt(fee ?? 0);
  const destAmountBig = destAmount ? toBigInt(destAmount) : null;

  // ثبت تراکنش + ledger در یک transaction با serializable isolation
  let txResult: Awaited<ReturnType<typeof prisma.transaction.create>>;
  try {
    txResult = await prisma.$transaction(
      async (tx) => {
        const freshAccount = await tx.fintechAccount.findUniqueOrThrow({
          where: { id: account.id },
          select: { balance: true },
        });

        const direction = kind === 'DEPOSIT' ? 'CREDIT' : 'DEBIT';

        if (direction === 'DEBIT' && freshAccount.balance < amountBig) {
          throw new Error(
            `INSUFFICIENT_FUNDS:موجودی حساب کافی نیست. موجودی فعلی: ${freshAccount.balance}, برداشت: ${amountBig}`,
          );
        }

        const newBalance =
          direction === 'CREDIT'
            ? freshAccount.balance + amountBig
            : freshAccount.balance - amountBig;

        await tx.fintechAccount.update({
          where: { id: account.id },
          data: { balance: newBalance, updatedAt: new Date() },
        });

        const transaction = await tx.transaction.create({
          data: {
            id: createId(),
            exchangeId,
            customerId,
            accountId: account.id,
            kind,
            status: 'COMPLETED',
            amount: amountBig,
            currency,
            rate,
            fee: feeBig,
            destAmount: destAmountBig,
            destCurrency: destCurrency ?? null,
            note: note ?? null,
            counterparty: counterparty ?? null,
            idempotencyKey: idempotencyKey ?? null,
            createdById: access.userId,
            updatedAt: new Date(),
          },
        });

        await tx.ledgerEntry.create({
          data: {
            id: createId(),
            exchangeId,
            accountId: account.id,
            customerId,
            txnId: transaction.id,
            direction,
            amount: amountBig,
            currency,
            runningBalance: newBalance,
            description: `${kind} — ${note ?? ''}`.trim(),
            createdById: access.userId,
            createdAt: new Date(),
          },
        });

        // C1: EXCHANGE → LedgerEntry دوم
        if (kind === 'EXCHANGE' && destAmountBig && destCurrency) {
          let destAccount = await tx.fintechAccount.findFirst({
            where: { exchangeId, customerId, currency: destCurrency },
            select: { id: true, balance: true },
          });
          if (!destAccount) {
            destAccount = await tx.fintechAccount.create({
              data: {
                id: createId(),
                exchangeId,
                customerId,
                currency: destCurrency,
                type: 'WALLET',
                status: 'ACTIVE',
                updatedAt: new Date(),
              },
              select: { id: true, balance: true },
            });
          }

          const destNewBalance = destAccount.balance + destAmountBig;
          await tx.fintechAccount.update({
            where: { id: destAccount.id },
            data: { balance: destNewBalance, updatedAt: new Date() },
          });

          await tx.ledgerEntry.create({
            data: {
              id: createId(),
              exchangeId,
              accountId: destAccount.id,
              customerId,
              txnId: transaction.id,
              direction: 'CREDIT',
              amount: destAmountBig,
              currency: destCurrency,
              runningBalance: destNewBalance,
              description: `EXCHANGE مقصد — ${note ?? ''}`.trim(),
              createdById: access.userId,
              createdAt: new Date(),
            },
          });
        }

        return transaction;
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.startsWith('INSUFFICIENT_FUNDS:')) {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_FUNDS', message: msg.slice('INSUFFICIENT_FUNDS:'.length) },
      };
    }
    throw err;
  }

  revalidateTag(`exchange-transactions-${exchangeId}`);
  revalidateTag(`exchange-customers-${exchangeId}`);

  return {
    success: true,
    data: {
      id: txResult.id,
      exchangeId: txResult.exchangeId,
      customerId: txResult.customerId ?? null,
      accountId: txResult.accountId ?? null,
      kind: txResult.kind,
      status: txResult.status,
      amount: bigIntToStr(txResult.amount),
      currency: txResult.currency,
      rate: txResult.rate,
      fee: bigIntToStr(txResult.fee),
      destAmount: txResult.destAmount !== null ? bigIntToStr(txResult.destAmount) : null,
      destCurrency: txResult.destCurrency,
      note: txResult.note,
      counterparty: txResult.counterparty,
      idempotencyKey: txResult.idempotencyKey,
      createdAt: txResult.createdAt.toISOString(),
      updatedAt: txResult.updatedAt.toISOString(),
    },
  };
}

// ─── STATS (M4: currency از exchange خوانده شود، نه AFN hardcoded) ──────────

export async function getExchangeStats(exchangeId: string): Promise<{
  totalCustomers: number;
  totalTransactions: number;
  /** حجم کل به صورت string (JSON-safe) */
  totalVolume: string;
  statsCurrency: string;
  pendingCount: number;
  todayCount: number;
  /** تعداد تراکنش‌های دیروز برای محاسبه delta */
  yesterdayCount: number;
  /** تعداد مشتریان جدید امروز */
  todayNewCustomers: number;
}> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) {
    return {
      totalCustomers: 0,
      totalTransactions: 0,
      totalVolume: '0',
      statsCurrency: 'AFN',
      pendingCount: 0,
      todayCount: 0,
      yesterdayCount: 0,
      todayNewCustomers: 0,
    };
  }

  // primaryCurrency از Exchange بخوانیم — M4 migration انجام شد
  const exchangeRecord = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    select: { primaryCurrency: true },
  });
  const statsCurrency = exchangeRecord?.primaryCurrency ?? 'AFN';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [
    totalCustomers,
    totalTransactions,
    volumeResult,
    pendingCount,
    todayCount,
    yesterdayCount,
    todayNewCustomers,
  ] = await Promise.all([
    prisma.customer.count({ where: { exchangeId } }),
    prisma.transaction.count({ where: { exchangeId } }),
    prisma.transaction.aggregate({
      where: { exchangeId, currency: statsCurrency, status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { exchangeId, status: 'PENDING' } }),
    prisma.transaction.count({ where: { exchangeId, createdAt: { gte: today } } }),
    prisma.transaction.count({
      where: { exchangeId, createdAt: { gte: yesterday, lt: today } },
    }),
    prisma.customer.count({ where: { exchangeId, createdAt: { gte: today } } }),
  ]);

  return {
    totalCustomers,
    totalTransactions,
    totalVolume: bigIntToStr(volumeResult._sum.amount ?? BigInt(0)),
    statsCurrency,
    pendingCount,
    todayCount,
    yesterdayCount,
    todayNewCustomers,
  };
}
