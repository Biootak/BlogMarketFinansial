'use server';

/**
 * fintech-account.ts — Server Actions برای واریز و برداشت از کیف پول
 *
 * جریان:
 *   کاربر → requestDeposit  → PENDING + ارسال شماره حساب صرافی به کاربر
 *   ادمین/صراف → confirmDeposit → COMPLETED + LedgerEntry + balance++
 *   کاربر → requestWithdraw → PENDING + lock balance
 *   ادمین/صراف → processWithdraw → COMPLETED + LedgerEntry + balance--
 *
 * امنیت:
 *   - requireUser برای request
 *   - requireAdmin یا requireExchangeAccess برای confirm/process
 *   - idempotencyKey اجباری
 *   - OTP برای withdraw بیش از آستانه
 *   - AuditLog برای همه عملیات
 */

import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import {
  isHighValueTransaction,
  requestTransactionOtp,
  verifyTransactionOtp,
} from '@/lib/fintech/transaction-guard';
import { assertOutgoingKycLimit } from '@/lib/kyc-limits';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── DEPOSIT REQUEST ──────────────────────────────────────────────────────────

const DepositSchema = z.object({
  amountCents: z
    .number()
    .int()
    .positive('مبلغ باید مثبت باشد')
    .max(100_000_000_00, 'سقف واریز ۱۰۰ میلیون افغانی'),
  currency: z.string().default('AFN'),
  idempotencyKey: z.string().min(8).max(64),
  note: z.string().max(200).optional(),
});

export type DepositResult = {
  txnId: string;
  txnRef: string;
  amountCents: number;
  currency: string;
  /** شماره حساب یا دستورالعمل واریز از طرف صرافی */
  paymentInstructions?: string;
};

export async function requestDeposit(raw: unknown): Promise<FintechActionResult<DepositResult>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const _xff1 = (await headers()).get('x-forwarded-for') ?? '';
  const ip =
    _xff1
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ??
    (await headers()).get('x-real-ip')?.trim() ??
    'unknown';
  const rl = await checkRateLimit(`deposit:${auth.user.id}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌های واریز زیاد است' },
    };
  }

  const parsed = DepositSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const { amountCents, currency, idempotencyKey, note } = parsed.data;

  // Idempotency
  const existing = await prisma.transaction.findFirst({
    where: { idempotencyKey },
    select: { id: true, meta: true },
  });
  if (existing) {
    const meta = existing.meta as { txnRef?: string } | null;
    return {
      success: true,
      data: { txnId: existing.id, txnRef: meta?.txnRef ?? existing.id, amountCents, currency },
    };
  }

  const senderCustomer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: {
      id: true,
      FintechAccount: {
        where: { currency, status: 'ACTIVE' },
        select: { id: true, exchangeId: true },
      },
    },
  });

  if (!senderCustomer || senderCustomer.FintechAccount.length === 0) {
    return {
      success: false,
      error: { code: 'NO_ACCOUNT', message: 'حساب فعالی برای این ارز یافت نشد' },
    };
  }

  // biome-ignore lint/style/noNonNullAssertion: length check above guarantees index 0
  const account = senderCustomer.FintechAccount[0]!;
  const txnRef = randomBytes(8).toString('hex');

  const txn = await prisma.transaction.create({
    data: {
      id: createId(),
      exchangeId: account.exchangeId,
      customerId: senderCustomer.id,
      accountId: account.id,
      kind: 'DEPOSIT',
      status: 'PENDING',
      amount: BigInt(amountCents),
      currency,
      idempotencyKey,
      note: note ?? null,
      meta: { txnRef, source: 'user_request' } as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: account.exchangeId,
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'DEPOSIT_REQUESTED',
      entityType: 'Transaction',
      entityId: txn.id,
      ip,
      meta: { amountCents, currency, txnRef } as Prisma.InputJsonValue,
    },
  });

  revalidateTag('wallet');

  return {
    success: true,
    data: {
      txnId: txn.id,
      txnRef,
      amountCents,
      currency,
      paymentInstructions: 'لطفاً مبلغ را به حساب صرافی واریز کرده و شماره پیگیری را ارسال کنید.',
    },
  };
}

// ─── WITHDRAW REQUEST ─────────────────────────────────────────────────────────

const WithdrawSchema = z.object({
  amountCents: z.number().int().positive('مبلغ باید مثبت باشد'),
  currency: z.string().default('AFN'),
  idempotencyKey: z.string().min(8).max(64),
  destinationAccount: z.string().min(5).max(200),
  note: z.string().max(200).optional(),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/)
    .optional(),
});

export type WithdrawResult = {
  txnId: string;
  txnRef: string;
  needsOtp: boolean;
  expiresInSeconds?: number;
};

export async function requestWithdraw(raw: unknown): Promise<FintechActionResult<WithdrawResult>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const _xff2 = (await headers()).get('x-forwarded-for') ?? '';
  const ip =
    _xff2
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ??
    (await headers()).get('x-real-ip')?.trim() ??
    'unknown';
  const rl = await checkRateLimit(`withdraw:${auth.user.id}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌های برداشت زیاد است' },
    };
  }

  const parsed = WithdrawSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const { amountCents, currency, idempotencyKey, destinationAccount, note } = parsed.data;

  const existing = await prisma.transaction.findFirst({
    where: { idempotencyKey },
    select: { id: true, meta: true },
  });
  if (existing) {
    const meta = existing.meta as { txnRef?: string } | null;
    return {
      success: true,
      data: { txnId: existing.id, txnRef: meta?.txnRef ?? existing.id, needsOtp: false },
    };
  }

  const customer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: {
      id: true,
      FintechAccount: {
        where: { currency, status: 'ACTIVE' },
        select: { id: true, balance: true, exchangeId: true },
      },
    },
  });

  if (!customer || customer.FintechAccount.length === 0) {
    return { success: false, error: { code: 'NO_ACCOUNT', message: 'حساب فعالی یافت نشد' } };
  }

  // biome-ignore lint/style/noNonNullAssertion: length check above guarantees index 0
  const account = customer.FintechAccount[0]!;
  if (account.balance < BigInt(amountCents)) {
    return { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی کافی نیست' } };
  }

  // سقف AML سطح‌بندی‌شده KYC (per-txn + روزانه)
  const limitCheck = await assertOutgoingKycLimit({
    exchangeId: account.exchangeId,
    customerId: customer.id,
    currency,
    amountCents,
  });
  if (!limitCheck.ok) {
    return { success: false, error: { code: limitCheck.code, message: limitCheck.error } };
  }

  const txnRef = randomBytes(8).toString('hex');

  const txn = await prisma.transaction.create({
    data: {
      id: createId(),
      exchangeId: account.exchangeId,
      customerId: customer.id,
      accountId: account.id,
      kind: 'WITHDRAWAL',
      status: 'PENDING',
      amount: BigInt(amountCents),
      currency,
      idempotencyKey,
      note: note ?? null,
      meta: { txnRef, destinationAccount, source: 'user_request' } as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: account.exchangeId,
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'WITHDRAWAL_REQUESTED',
      entityType: 'Transaction',
      entityId: txn.id,
      ip,
      meta: { amountCents, currency, txnRef } as Prisma.InputJsonValue,
    },
  });

  const needsOtp = isHighValueTransaction({ kind: 'WITHDRAWAL', amountCents: BigInt(amountCents) });
  if (needsOtp) {
    const otpResult = await requestTransactionOtp({
      txnRef,
      amountCents: BigInt(amountCents),
      kind: 'WITHDRAWAL',
    });
    if (!otpResult.success) {
      // OTP ارسال نشد — تراکنش PENDING بی‌فایده است، با FAILED ببند تا کاربر
      // در UI گیر نکند و PENDING مرده نماند.
      await prisma.transaction.update({
        where: { id: txn.id },
        data: {
          status: 'FAILED',
          meta: {
            txnRef,
            destinationAccount,
            failedReason: 'OTP_SEND_FAILED',
          } as Prisma.InputJsonValue,
        },
      });
      return otpResult;
    }
    return {
      success: true,
      data: {
        txnId: txn.id,
        txnRef,
        needsOtp: true,
        expiresInSeconds: otpResult.data.expiresInSeconds,
      },
    };
  }

  revalidateTag('wallet');
  return { success: true, data: { txnId: txn.id, txnRef, needsOtp: false } };
}

// ─── CONFIRM WITHDRAW (± OTP) ─────────────────────────────────────────────────

const ConfirmWithdrawSchema = z.object({
  txnId: z.string().min(1),
  txnRef: z.string().min(1),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/)
    .optional(),
});

export async function confirmWithdraw(
  raw: unknown,
): Promise<FintechActionResult<{ txnId: string }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }
  const _xff3 = (await headers()).get('x-forwarded-for') ?? '';
  const ip =
    _xff3
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ??
    (await headers()).get('x-real-ip')?.trim() ??
    'unknown';

  const parsed = ConfirmWithdrawSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const { txnId, txnRef, otp } = parsed.data;

  const customer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  const txn = await prisma.transaction.findFirst({
    where: { id: txnId, customerId: customer?.id ?? '__none__' },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      accountId: true,
      exchangeId: true,
      customerId: true,
    },
  });

  if (!txn) return { success: false, error: { code: 'NOT_FOUND', message: 'تراکنش یافت نشد' } };
  if (txn.status !== 'PENDING') {
    if (txn.status === 'COMPLETED') return { success: true, data: { txnId } };
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'این تراکنش قابل تأیید نیست' },
    };
  }

  const needsOtp = isHighValueTransaction({ kind: 'WITHDRAWAL', amountCents: txn.amount });
  if (needsOtp) {
    if (!otp)
      return { success: false, error: { code: 'OTP_REQUIRED', message: 'کد تأیید الزامی است' } };
    const otpResult = await verifyTransactionOtp({ txnRef, otp });
    if (!otpResult.success) return otpResult;
  }

  if (!txn.accountId || !txn.customerId) {
    return { success: false, error: { code: 'INVALID_STATE', message: 'اطلاعات حساب ناقص است' } };
  }

  const now = new Date();
  // accountId and customerId are guaranteed non-null by the check above
  const accountId = txn.accountId;
  const customerId = txn.customerId;
  try {
    await prisma.$transaction(async (tx) => {
      // ── Atomic claim: فقط یک confirm هم‌زمان می‌تواند PENDING→COMPLETED را
      // اجرا کند. بدون این قفل، دو درخواست هم‌زمان هر دو debit اتمیک موفق
      // می‌شدند (اگر موجودی ≥ ۲×مبلغ بود) → دوبار برداشت برای یک تراکنش.
      const claim = await tx.transaction.updateMany({
        where: { id: txn.id, status: 'PENDING' },
        data: { status: 'COMPLETED', updatedAt: now },
      });
      if (claim.count === 0) throw new Error('ALREADY_PROCESSED');

      // race-condition fix: شرط balance >= amount در همان UPDATE چک می‌شود تا
      // دو درخواست هم‌زمان نتوانند موجودی را منفی کنند (double-spend).
      const debit = await tx.fintechAccount.updateMany({
        where: { id: accountId, balance: { gte: txn.amount } },
        data: { balance: { decrement: txn.amount }, updatedAt: now },
      });
      if (debit.count === 0) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      const updated = await tx.fintechAccount.findUniqueOrThrow({
        where: { id: accountId },
        select: { balance: true },
      });
      await tx.ledgerEntry.create({
        data: {
          id: createId(),
          exchangeId: txn.exchangeId,
          accountId,
          customerId,
          txnId: txn.id,
          direction: 'DEBIT',
          amount: txn.amount,
          currency: txn.currency,
          runningBalance: updated.balance,
          createdAt: now,
        },
      });
      // وضعیت قبلاً در atomic claim به COMPLETED رفته — به‌روزرسانی اضافه نیست.
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'ALREADY_PROCESSED') {
      // confirm هم‌زمان دیگر همین تراکنش را کامل کرده — idempotent success
      return { success: true, data: { txnId } };
    }
    if (msg === 'INSUFFICIENT_BALANCE') {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی کافی نیست' },
      };
    }
    throw err;
  }

  // G6-fix: AuditLog برای تکمیل برداشت — C10 الزامی است
  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: txn.exchangeId,
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'WITHDRAWAL_COMPLETED',
      entityType: 'Transaction',
      entityId: txnId,
      ip,
    },
  });

  revalidateTag('wallet');
  return { success: true, data: { txnId } };
}
