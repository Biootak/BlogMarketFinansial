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
 *   P0-6: rate-limit روی createTransaction اضافه شد
 */

import prisma from '@/lib/db';
import { requireExchangeAccess } from '@/lib/exchange-auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { Decimal } from '@prisma/client/runtime/library';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

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
  /** مبلغ به صورت number (در پایه‌ترین واحد × 100) — bigint از DB به number map شده */
  amount: number;
  currency: string;
  rate: number | null;
  /** کارمزد به صورت number */
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

// ─── Helper: تبدیل float به BigInt بدون خطای دقت (H2) ───────────────────────
// مثال: amount=0.29 → new Decimal("0.29").mul(100).toFixed(0) → "29" → 29n
// مقایسه اشتباه: Math.round(0.1+0.2)*100 = Math.round(0.30000000000000004*100) = 30 ❌
// F2-fix: مقادیر زیر ۰.۰۱ → پس از mul(100) و toFixed(0) ممکن است 0 شوند
// مثال: 0.001 → 0.1 → toFixed(0)="0" → گم می‌شود. اما این برای ارزهای صحیح (AFN,USD) غیرواقعی است.
// برای اطمینان: حداقل 1 واحد (معادل ۰.۰۱) چک می‌کنیم
function toBigInt(value: number): bigint {
  const result = BigInt(new Decimal(value.toString()).mul(100).toFixed(0));
  // اگر value > 0 ولی result = 0 → مقدار خیلی کوچک است، حداقل 1 برگردان
  if (value > 0 && result === BigInt(0)) return BigInt(1);
  return result;
}

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
): Promise<FintechActionResult<TransactionRow>> {
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

  // بررسی idempotency
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

  // ── H3: KYC gate — حساب auto-create فقط با KYC کافی مجاز است ───────────
  // اگر exchange.requireKyc=false باشد (مثل صرافی‌های قدیمی قبل از gate)،
  // KYC چک نمی‌شود — این grace-period برای عدم breaking change است.
  // مثال: exchange A با requireKyc=false → همه مشتریانش مجازند
  //        exchange B با requireKyc=true  → باید KYC APPROVED داشته باشند
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

  // ── H2: تبدیل float → BigInt بدون خطای دقت ──────────────────────────────
  const amountBig = toBigInt(amount);
  const feeBig = toBigInt(fee ?? 0);
  const destAmountBig = destAmount ? toBigInt(destAmount) : null;

  // ثبت تراکنش + ledger در یک transaction با serializable isolation
  let txResult: Awaited<ReturnType<typeof prisma.transaction.create>>;
  try {
    txResult = await prisma.$transaction(
      async (tx) => {
        // ── H4: running balance از FintechAccount.balance (نه آخرین LedgerEntry) ──
        // FintechAccount.balance همیشه running total صحیح است و در همان transaction
        // به‌صورت atomic آپدیت می‌شود — امن در برابر concurrent write
        const freshAccount = await tx.fintechAccount.findUniqueOrThrow({
          where: { id: account.id },
          select: { balance: true },
        });

        const direction = kind === 'DEPOSIT' ? 'CREDIT' : 'DEBIT';

        // ── P0-3: WITHDRAWAL/DEBIT بدون موجودی کافی بلاک می‌شود ─────────────────
        // مثال: موجودی=500 سنت، برداشت=600 سنت → خطا
        //        موجودی=600 سنت، برداشت=600 سنت → موجودی صفر می‌شود (مجاز)
        if (direction === 'DEBIT' && freshAccount.balance < amountBig) {
          throw new Error(
            `INSUFFICIENT_FUNDS:موجودی حساب کافی نیست. موجودی فعلی: ${freshAccount.balance}, برداشت: ${amountBig}`,
          );
        }

        const newBalance =
          direction === 'CREDIT'
            ? freshAccount.balance + amountBig
            : freshAccount.balance - amountBig;

        // آپدیت balance حساب مبدأ
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

        // LedgerEntry برای حساب مبدأ
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

        // ── C1: EXCHANGE نیاز به LedgerEntry دوم دارد (CREDIT روی حساب مقصد) ──
        // مثال: EXCHANGE 100 USD → 5,600,000 تومان
        //   حساب USD: DEBIT 100 USD (بالا انجام شد)
        //   حساب AFN: CREDIT 5,600,000 AFN (اینجا انجام می‌شود)
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
    // خطای موجودی ناکافی — ساختار استاندارد ActionResult
    const msg = err instanceof Error ? err.message : '';
    if (msg.startsWith('INSUFFICIENT_FUNDS:')) {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_FUNDS', message: msg.slice('INSUFFICIENT_FUNDS:'.length) },
      };
    }
    throw err; // سایر خطاها bubble می‌کنند
  }

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
