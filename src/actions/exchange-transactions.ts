'use server';

/**
 * exchange-transactions — Server Actions ثبت و خواندن تراکنش‌های صراف.
 *
 * هر تراکنش به یک مشتری (Customer) و یک حساب (FintechAccount) وابسته است.
 * پس از ثبت تراکنش، ledger entry هم ثبت می‌شود (double-entry).
 * Idempotency: هر تراکنش idempotencyKey دارد تا submit مجدد بی‌خطر باشد.
 */

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireExchangeAccess(exchangeId: string) {
  const auth = await requireUser();
  if (!auth.success) return { ok: false as const, error: auth };

  const { user } = auth;
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return { ok: true as const, userId: user.id };
  }

  const staff = await prisma.exchangeStaff.findFirst({
    where: { exchangeId, userId: user.id, revokedAt: null },
  });
  if (!staff) {
    return {
      ok: false as const,
      error: {
        success: false as const,
        status: 403 as const,
        code: 'FORBIDDEN' as const,
        message: 'دسترسی به این صرافی ندارید',
      },
    };
  }

  return { ok: true as const, userId: user.id };
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const TX_KINDS = ['DEPOSIT', 'WITHDRAWAL', 'EXCHANGE', 'TRANSFER', 'FEE'] as const;
const TX_CURRENCIES = ['AFN', 'USD', 'EUR', 'IRR', 'AED', 'GBP', 'TRY', 'SAR', 'PKR'] as const;

const TransactionSchema = z.object({
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
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionRow = {
  id: string;
  exchangeId: string;
  customerId: string;
  accountId: string;
  kind: string;
  status: string;
  /** مبلغ به صورت number (در cents/پول کوچک) — bigint از DB به number map شده */
  amount: number;
  currency: string;
  rate: number | null;
  /** کارمزد به صورت number (در cents) */
  fee: number;
  destAmount: number | null;
  destCurrency: string | null;
  note: string | null;
  counterparty: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { fullName: string; phone: string };
};

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ─── READ ─────────────────────────────────────────────────────────────────────

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

  // Prisma enum types are narrow; build the where object incrementally
  // to avoid spreading string into a typed enum field.
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
    rows: rows.map((r) => {
      const tx = r as typeof r & { Customer?: { fullName: string; phone: string } | null };
      return {
        id: tx.id,
        exchangeId: tx.exchangeId,
        customerId: tx.customerId,
        accountId: tx.accountId,
        kind: tx.kind,
        status: tx.status,
        amount: Number(tx.amount),
        currency: tx.currency,
        rate: tx.rate,
        fee: Number(tx.fee),
        destAmount: tx.destAmount !== null ? Number(tx.destAmount) : null,
        destCurrency: tx.destCurrency,
        note: tx.note,
        counterparty: tx.counterparty,
        idempotencyKey: tx.idempotencyKey,
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
        customer: tx.Customer
          ? { fullName: tx.Customer.fullName, phone: tx.Customer.phone }
          : undefined,
      };
    }),
    total,
  };
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createTransaction(
  exchangeId: string,
  raw: unknown,
): Promise<ActionResult<TransactionRow>> {
  const access = await requireExchangeAccess(exchangeId);
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

  // بررسی idempotency — مقدار dup نیاز به map دارد چون bigint fields دارد
  if (idempotencyKey) {
    const dup = await prisma.transaction.findUnique({ where: { idempotencyKey } });
    if (dup) {
      return {
        success: true,
        data: {
          id: dup.id,
          exchangeId: dup.exchangeId,
          customerId: dup.customerId,
          accountId: dup.accountId,
          kind: dup.kind,
          status: dup.status,
          amount: Number(dup.amount),
          currency: dup.currency,
          rate: dup.rate,
          fee: Number(dup.fee),
          destAmount: dup.destAmount !== null ? Number(dup.destAmount) : null,
          destCurrency: dup.destCurrency,
          note: dup.note,
          counterparty: dup.counterparty,
          idempotencyKey: dup.idempotencyKey,
          createdAt: dup.createdAt.toISOString(),
          updatedAt: dup.updatedAt.toISOString(),
        } satisfies TransactionRow,
      };
    }
  }

  // پیدا کردن یا ساختن account پیش‌فرض مشتری
  let account = await prisma.fintechAccount.findFirst({
    where: { exchangeId, customerId, currency },
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
    });
  }

  const amountBig = BigInt(Math.round(amount * 100));
  const feeBig = BigInt(Math.round((fee ?? 0) * 100));
  const destAmountBig = destAmount ? BigInt(Math.round(destAmount * 100)) : null;

  // ثبت تراکنش + ledger در یک transaction
  const txResult = await prisma.$transaction(async (tx) => {
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

    // Ledger: DEPOSIT/EXCHANGE-IN = CREDIT، بقیه = DEBIT
    const direction = kind === 'DEPOSIT' ? 'CREDIT' : 'DEBIT';

    // running balance (ساده‌شده — در production باید atomic باشد)
    const lastEntry = await tx.ledgerEntry.findFirst({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
    const prevBalance = lastEntry?.runningBalance ?? BigInt(0);
    const runningBalance =
      direction === 'CREDIT' ? prevBalance + amountBig : prevBalance - amountBig;

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
        runningBalance,
        description: `${kind} — ${note ?? ''}`.trim(),
        createdById: access.userId,
        createdAt: new Date(),
      },
    });

    return transaction;
  });

  revalidateTag(`exchange-transactions-${exchangeId}`);
  revalidateTag(`exchange-customers-${exchangeId}`);

  return {
    success: true,
    data: {
      id: txResult.id,
      exchangeId: txResult.exchangeId,
      customerId: txResult.customerId,
      accountId: txResult.accountId,
      kind: txResult.kind,
      status: txResult.status,
      amount: Number(txResult.amount),
      currency: txResult.currency,
      rate: txResult.rate,
      fee: Number(txResult.fee),
      destAmount: txResult.destAmount !== null ? Number(txResult.destAmount) : null,
      destCurrency: txResult.destCurrency,
      note: txResult.note,
      counterparty: txResult.counterparty,
      idempotencyKey: txResult.idempotencyKey,
      createdAt: txResult.createdAt.toISOString(),
      updatedAt: txResult.updatedAt.toISOString(),
    } satisfies TransactionRow,
  };
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export async function getExchangeStats(exchangeId: string): Promise<{
  totalCustomers: number;
  totalTransactions: number;
  /** حجم کل به صورت number (در cents) */
  totalVolumeAfn: number;
  pendingCount: number;
  todayCount: number;
}> {
  const access = await requireExchangeAccess(exchangeId);
  if (!access.ok) {
    return {
      totalCustomers: 0,
      totalTransactions: 0,
      totalVolumeAfn: 0,
      pendingCount: 0,
      todayCount: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalCustomers, totalTransactions, volumeResult, pendingCount, todayCount] =
    await Promise.all([
      prisma.customer.count({ where: { exchangeId } }),
      prisma.transaction.count({ where: { exchangeId } }),
      prisma.transaction.aggregate({
        where: { exchangeId, currency: 'AFN', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.count({ where: { exchangeId, status: 'PENDING' } }),
      prisma.transaction.count({ where: { exchangeId, createdAt: { gte: today } } }),
    ]);

  return {
    totalCustomers,
    totalTransactions,
    totalVolumeAfn: Number(volumeResult._sum.amount ?? BigInt(0)),
    pendingCount,
    todayCount,
  };
}
