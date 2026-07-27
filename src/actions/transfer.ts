'use server';

/**
 * transferActions.ts — Server Actions برای انتقال P2P وجه
 *
 * جریان:
 *   کاربر → findRecipient (پیدا کردن گیرنده)
 *   کاربر → initiateTransfer (ثبت تراکنش PENDING + دریافت txnRef)
 *   کاربر → confirmTransfer (تأیید با OTP اگر مبلغ بالا باشد)
 *
 * امنیت:
 *   - requireUser برای هر عملیات
 *   - idempotencyKey اجباری در initiateTransfer
 *   - OTP guard برای مبالغ بالا (بیش از ۱۰۰,۰۰۰ AFN)
 *   - audit log برای هر عملیات
 */

import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import {
  isHighValueTransaction,
  requestTransactionOtp,
  verifyTransactionOtp,
} from '@/lib/fintech/transaction-guard';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecipientInfo = {
  id: string;
  fullName: string;
  phone: string;
  kycStatus: string;
};

export type TransferResult = {
  txnId: string;
  txnRef: string;
  needsOtp: boolean;
  expiresInSeconds?: number;
  devCode?: string;
};

// ─── FIND RECIPIENT ────────────────────────────────────────────────────────────

const FindRecipientSchema = z.object({
  identifier: z.string().min(8, 'شناسه گیرنده باید حداقل ۸ کاراکتر باشد').max(50),
});

export async function findTransferRecipient(
  raw: unknown,
): Promise<FintechActionResult<RecipientInfo>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  // T1-P1: rate-limit ضد phone-number enumeration
  // کاربر احراز هویت‌شده نمی‌تواند بیش از ۱۰ جستجو در دقیقه انجام دهد
  const rl = await checkRateLimit(`transfer-find:${auth.user.id}`, 'transfer-find');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد جستجوی گیرنده زیاد است. لطفاً صبر کنید.' },
    };
  }

  const parsed = FindRecipientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'ورودی نامعتبر',
      },
    };
  }

  const { identifier } = parsed.data;

  // جستجو با شماره موبایل
  const user = await prisma.user.findFirst({
    where: {
      phoneNumber: identifier,
      NOT: { id: auth.user.id },
    },
    select: {
      id: true,
      name: true,
      KycRecord: { select: { reviewedAt: true, rejectedReason: true } },
    },
  });

  if (!user) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'کاربری با این شناسه یافت نشد' },
    };
  }

  // چک KYC گیرنده (باید تأیید شده باشد)
  const kycOk = user.KycRecord?.reviewedAt && !user.KycRecord?.rejectedReason;

  return {
    success: true,
    data: {
      id: user.id,
      fullName: user.name ?? 'کاربر',
      phone: identifier,
      kycStatus: kycOk ? 'APPROVED' : 'PENDING',
    },
  };
}

// ─── INITIATE TRANSFER ─────────────────────────────────────────────────────────

const InitiateSchema = z.object({
  recipientUserId: z.string().min(1),
  amountCents: z.number().int().positive('مبلغ باید مثبت باشد'),
  currency: z.string().default('AFN'),
  note: z.string().max(200).optional(),
  idempotencyKey: z.string().min(8).max(64),
});

export async function initiateTransfer(raw: unknown): Promise<FintechActionResult<TransferResult>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  // rate-limit: 3 انتقال در ۵ دقیقه
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await checkRateLimit(`transfer:${auth.user.id}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌های انتقال زیاد است. لطفاً صبر کنید.' },
    };
  }

  const parsed = InitiateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'ورودی نامعتبر',
      },
    };
  }

  const { recipientUserId, amountCents, currency, note, idempotencyKey } = parsed.data;

  // پیدا کردن حساب فرستنده قبل از idempotency lookup تا کلید به customer جاری scope شود.
  const senderCustomer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: {
      id: true,
      FintechAccount: {
        where: { currency, status: 'ACTIVE' },
        select: { id: true, balance: true, exchangeId: true },
      },
    },
  });

  if (!senderCustomer) {
    return {
      success: false,
      error: { code: 'NO_ACCOUNT', message: 'حساب فعالی برای این ارز یافت نشد' },
    };
  }

  // Idempotency check — فقط تراکنش متعلق به customer جاری قابل replay است.
  // اگر کلید قبلاً برای customer دیگری ثبت شده باشد، جزئیات آن افشا نمی‌شود
  // و از تلاش مجدد برای insert با unique key جلوگیری می‌کنیم.
  const existing = await prisma.transaction.findFirst({
    where: { idempotencyKey },
    select: { id: true, customerId: true, meta: true },
  });
  if (existing) {
    if (existing.customerId !== senderCustomer.id) {
      return {
        success: false,
        error: { code: 'IDEMPOTENCY_CONFLICT', message: 'کلید درخواست قبلاً استفاده شده است' },
      };
    }

    const meta = existing.meta as { txnRef?: string } | null;
    return {
      success: true,
      data: {
        txnId: existing.id,
        txnRef: meta?.txnRef ?? existing.id,
        needsOtp: false,
      },
    };
  }

  if (senderCustomer.FintechAccount.length === 0) {
    return {
      success: false,
      error: { code: 'NO_ACCOUNT', message: 'حساب فعالی برای این ارز یافت نشد' },
    };
  }

  const senderAccount = senderCustomer.FintechAccount[0];
  if (!senderAccount) {
    return {
      success: false,
      error: { code: 'NO_ACCOUNT', message: 'حساب فعالی برای این ارز یافت نشد' },
    };
  }

  // بررسی موجودی
  if (senderAccount.balance < BigInt(amountCents)) {
    return {
      success: false,
      error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی کافی نیست' },
    };
  }

  // پیدا کردن حساب گیرنده
  const recipientCustomer = await prisma.customer.findFirst({
    where: { userId: recipientUserId },
    select: {
      id: true,
      FintechAccount: { where: { currency, status: 'ACTIVE' }, select: { id: true } },
    },
  });

  if (!recipientCustomer || recipientCustomer.FintechAccount.length === 0) {
    return {
      success: false,
      error: { code: 'RECIPIENT_NO_ACCOUNT', message: 'گیرنده حساب فعالی برای این ارز ندارد' },
    };
  }

  // txnRef برای OTP
  const txnRef = randomBytes(8).toString('hex');
  const amountBigInt = BigInt(amountCents);

  // ایجاد Transaction در وضعیت PENDING
  const txn = await prisma.transaction.create({
    data: {
      id: createId(),
      exchangeId: senderAccount.exchangeId,
      customerId: senderCustomer.id,
      accountId: senderAccount.id,
      kind: 'TRANSFER',
      status: 'PENDING',
      amount: amountBigInt,
      currency,
      idempotencyKey,
      note: note ?? null,
      meta: { txnRef, recipientCustomerId: recipientCustomer.id } as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: senderAccount.exchangeId,
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'TRANSFER_INITIATED',
      entityType: 'Transaction',
      entityId: txn.id,
      ip,
      meta: { amountCents, currency, txnRef } as Prisma.InputJsonValue,
    },
  });

  // بررسی نیاز به OTP
  const needsOtp = isHighValueTransaction({ kind: 'TRANSFER', amountCents: amountBigInt });

  if (needsOtp) {
    const otpResult = await requestTransactionOtp({
      txnRef,
      amountCents: amountBigInt,
      kind: 'TRANSFER',
    });

    return {
      success: true,
      data: {
        txnId: txn.id,
        txnRef,
        needsOtp: true,
        expiresInSeconds: otpResult.success ? otpResult.data.expiresInSeconds : undefined,
        devCode: otpResult.success ? otpResult.data.devCode : undefined,
      },
    };
  }

  // مبلغ کم — OTP لازم نیست، مستقیم تأیید می‌کنیم
  return {
    success: true,
    data: { txnId: txn.id, txnRef, needsOtp: false },
  };
}

// ─── CONFIRM TRANSFER (با یا بدون OTP) ────────────────────────────────────────

const ConfirmSchema = z.object({
  txnId: z.string().min(1),
  txnRef: z.string().min(1),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/)
    .optional(),
});

export async function confirmTransfer(
  raw: unknown,
): Promise<FintechActionResult<{ txnId: string }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const parsed = ConfirmSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'ورودی نامعتبر',
      },
    };
  }

  const { txnId, txnRef, otp } = parsed.data;

  // بازیابی تراکنش — ownership check: فقط customer خودِ کاربر مجاز است
  const senderCustomer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });

  const txn = await prisma.transaction.findFirst({
    where: {
      id: txnId,
      customerId: senderCustomer?.id ?? '__none__',
    },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      accountId: true,
      meta: true,
      exchangeId: true,
      customerId: true,
    },
  });

  if (!txn) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'تراکنش یافت نشد' } };
  }
  if (txn.status !== 'PENDING') {
    if (txn.status === 'COMPLETED') return { success: true, data: { txnId } };
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'این تراکنش قابل تأیید نیست' },
    };
  }

  // OTP verification اگر لازم باشد
  const needsOtp = isHighValueTransaction({ kind: 'TRANSFER', amountCents: txn.amount });
  if (needsOtp) {
    if (!otp) {
      return { success: false, error: { code: 'OTP_REQUIRED', message: 'کد تأیید الزامی است' } };
    }
    const otpResult = await verifyTransactionOtp({ txnRef, otp });
    if (!otpResult.success) return otpResult;
  }

  const meta = txn.meta as { recipientCustomerId?: string } | null;
  const recipientCustomerId = meta?.recipientCustomerId;
  if (!recipientCustomerId) {
    return {
      success: false,
      error: { code: 'MISSING_RECIPIENT', message: 'اطلاعات گیرنده یافت نشد' },
    };
  }

  // accountId و customerId در TRANSFER transactions همیشه set هستند (در initiateTransfer ثبت شد)
  if (!txn.accountId || !txn.customerId) {
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'اطلاعات حساب تراکنش ناقص است' },
    };
  }
  const accountId = txn.accountId;
  const customerId = txn.customerId;

  // Double-entry ledger + atomic balance update
  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      // DEBIT از حساب فرستنده — balance کم می‌شود
      // race-condition fix: شرط balance >= amount در همان UPDATE چک می‌شود تا
      // دو درخواست هم‌زمان (یا retry) نتوانند موجودی را منفی کنند (double-spend).
      // updateMany چون Prisma روی .update() اجازه شرط‌های غیر-unique در where را نمی‌دهد.
      const debit = await tx.fintechAccount.updateMany({
        where: { id: accountId, balance: { gte: txn.amount } },
        data: { balance: { decrement: txn.amount }, updatedAt: now },
      });
      if (debit.count === 0) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      const updatedSender = await tx.fintechAccount.findUniqueOrThrow({
        where: { id: accountId },
        select: { balance: true },
      });

      await tx.ledgerEntry.create({
        data: {
          id: createId(),
          exchangeId: txn.exchangeId,
          accountId: accountId,
          customerId: customerId,
          txnId: txn.id,
          direction: 'DEBIT',
          amount: txn.amount,
          currency: txn.currency,
          runningBalance: updatedSender.balance,
          createdAt: now,
        },
      });

      // پیدا کردن حساب گیرنده
      const recipientAccount = await tx.fintechAccount.findFirst({
        where: { customerId: recipientCustomerId, currency: txn.currency, status: 'ACTIVE' },
        select: { id: true },
      });

      if (recipientAccount) {
        // CREDIT به حساب گیرنده — balance زیاد می‌شود
        const updatedRecipient = await tx.fintechAccount.update({
          where: { id: recipientAccount.id },
          data: { balance: { increment: txn.amount }, updatedAt: now },
          select: { balance: true },
        });

        await tx.ledgerEntry.create({
          data: {
            id: createId(),
            exchangeId: txn.exchangeId,
            accountId: recipientAccount.id,
            customerId: recipientCustomerId,
            txnId: txn.id,
            direction: 'CREDIT',
            amount: txn.amount,
            currency: txn.currency,
            runningBalance: updatedRecipient.balance,
            createdAt: now,
          },
        });
      }

      // COMPLETED کردن تراکنش
      await tx.transaction.update({
        where: { id: txn.id },
        data: { status: 'COMPLETED', updatedAt: now },
      });
    }); // end $transaction
  } catch (err) {
    if ((err as Error).message === 'INSUFFICIENT_BALANCE') {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی کافی نیست' },
      };
    }
    throw err;
  }

  revalidateTag('wallet');

  // Audit Log
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: txn.exchangeId,
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'TRANSFER_COMPLETED',
      entityType: 'Transaction',
      entityId: txn.id,
      ip,
    },
  });

  return { success: true, data: { txnId } };
}
