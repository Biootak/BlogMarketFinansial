'use server';

import { randomBytes } from 'node:crypto';
import { assertCsrf } from '@/lib/csrf-server';
import prisma from '@/lib/db';
import {
  isHighValueTransaction,
  requestTransactionOtp,
  verifyTransactionOtp,
} from '@/lib/fintech/transaction-guard';
import { notifyTelegramCustomer } from '@/lib/notifications/telegram-user';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

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
};

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

  const _xff = (await headers()).get('x-forwarded-for') ?? '';
  const ip =
    _xff
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ??
    (await headers()).get('x-real-ip')?.trim() ??
    'unknown';
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

  if (senderAccount.balance < BigInt(amountCents)) {
    return { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی کافی نیست' } };
  }

  const [recipientCustomer, recipientKycRecord] = await Promise.all([
    prisma.customer.findFirst({
      where: { userId: recipientUserId },
      select: {
        id: true,
        kycLevel: true,
        kycStatus: true,
        FintechAccount: { where: { currency, status: 'ACTIVE' }, select: { id: true } },
      },
    }),
    prisma.kycRecord.findUnique({
      where: { userId: recipientUserId },
      select: { expiresAt: true },
    }),
  ]);

  if (recipientKycRecord?.expiresAt && recipientKycRecord.expiresAt < new Date()) {
    return {
      success: false,
      error: {
        code: 'RECIPIENT_KYC_EXPIRED',
        message: 'احراز هویت (KYC) گیرنده منقضی شده است — گیرنده باید KYC را تمدید کند',
      },
    };
  }
  if (!recipientCustomer || recipientCustomer.FintechAccount.length === 0) {
    return {
      success: false,
      error: { code: 'RECIPIENT_NO_ACCOUNT', message: 'گیرنده حساب فعالی برای این ارز ندارد' },
    };
  }
  if (recipientCustomer.kycStatus !== 'APPROVED' || recipientCustomer.kycLevel === 'NONE') {
    return {
      success: false,
      error: {
        code: 'RECIPIENT_KYC_REQUIRED',
        message: 'گیرنده احراز هویت (KYC) تأییدشده ندارد و قادر به دریافت وجه نیست',
      },
    };
  }

  const txnRef = randomBytes(8).toString('hex');
  const amountBigInt = BigInt(amountCents);
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

  const needsOtp = isHighValueTransaction({ kind: 'TRANSFER', amountCents: amountBigInt });
  if (needsOtp) {
    const otpResult = await requestTransactionOtp({
      txnRef,
      amountCents: amountBigInt,
      kind: 'TRANSFER',
    });
    if (!otpResult.success) {
      await prisma.transaction.update({
        where: { id: txn.id },
        data: {
          status: 'FAILED',
          meta: { txnRef, failedReason: 'OTP_SEND_FAILED' } as Prisma.InputJsonValue,
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

  return { success: true, data: { txnId: txn.id, txnRef, needsOtp: false } };
}

const ConfirmSchema = z.object({
  txnId: z.string().min(1),
  txnRef: z.string().min(1),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/)
    .optional(),
  idempotencyKey: z.string().min(8).max(64).optional(),
});

export async function confirmTransfer(
  raw: unknown,
): Promise<FintechActionResult<{ txnId: string }>> {
  try {
    await assertCsrf();
  } catch {
    return {
      success: false,
      error: { code: 'CSRF_FAILED', message: 'درخواست نامعتبر — لطفاً صفحه را refresh کنید' },
    };
  }

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
  const senderCustomer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  // 2026-08-03: explicit null-check — if the customer profile was deleted
  // between the session check and here, return a clear error rather than
  // letting the query proceed with customerId='__none__'.
  if (!senderCustomer) {
    return {
      success: false,
      error: { code: 'NO_ACCOUNT', message: 'حساب مشتری یافت نشد. لطفاً مجدداً وارد شوید' },
    };
  }
  const txn = await prisma.transaction.findFirst({
    where: { id: txnId, customerId: senderCustomer.id },
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

  // The reference is transaction-bound. Without this check, any caller who knows
  // a pending transaction id could confirm a low-value transfer with a fabricated
  // reference, and high-value OTPs could be mixed across transactions.
  const meta = txn.meta as { txnRef?: string; recipientCustomerId?: string } | null;
  if (!meta?.txnRef || meta.txnRef !== txnRef) {
    return {
      success: false,
      error: { code: 'INVALID_REFERENCE', message: 'شناسه تأیید تراکنش نامعتبر است' },
    };
  }

  const needsOtp = isHighValueTransaction({ kind: 'TRANSFER', amountCents: txn.amount });
  if (needsOtp) {
    if (!otp)
      return { success: false, error: { code: 'OTP_REQUIRED', message: 'کد تأیید الزامی است' } };
    const otpResult = await verifyTransactionOtp({ txnRef, otp });
    if (!otpResult.success) return otpResult;
  }

  const recipientCustomerId = meta.recipientCustomerId;
  if (!recipientCustomerId) {
    return {
      success: false,
      error: { code: 'MISSING_RECIPIENT', message: 'اطلاعات گیرنده یافت نشد' },
    };
  }
  if (!txn.accountId || !txn.customerId) {
    return {
      success: false,
      error: { code: 'INVALID_STATE', message: 'اطلاعات حساب تراکنش ناقص است' },
    };
  }
  const accountId = txn.accountId;
  const customerId = txn.customerId;

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      // ── Atomic claim: فقط یک confirm همزمان می‌تواند PENDING→COMPLETED را
      // اجرا کند. بدون این قفل، دو درخواست همزمان هر دو debit اتمیک موفق
      // می‌شدند (اگر موجودی ≥ ۲×مبلغ بود) → دوبار برداشت برای یک تراکنش.
      const claim = await tx.transaction.updateMany({
        where: { id: txn.id, status: 'PENDING' },
        data: { status: 'COMPLETED', updatedAt: now },
      });
      if (claim.count === 0) throw new Error('ALREADY_PROCESSED');

      const recipientAccount = await tx.fintechAccount.findFirst({
        where: { customerId: recipientCustomerId, currency: txn.currency, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!recipientAccount) throw new Error('RECIPIENT_NO_ACCOUNT');

      const debit = await tx.fintechAccount.updateMany({
        where: { id: accountId, balance: { gte: txn.amount } },
        data: { balance: { decrement: txn.amount }, updatedAt: now },
      });
      if (debit.count === 0) throw new Error('INSUFFICIENT_BALANCE');

      const updatedSender = await tx.fintechAccount.findUniqueOrThrow({
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
          runningBalance: updatedSender.balance,
          createdAt: now,
        },
      });

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
      // وضعیت قبلاً در atomic claim به COMPLETED رفته — اینجا به‌روزرسانی اضافه نیست.
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
    if (msg === 'RECIPIENT_NO_ACCOUNT') {
      return {
        success: false,
        error: {
          code: 'RECIPIENT_NO_ACCOUNT',
          message: 'گیرنده دیگر حساب فعالی برای این ارز ندارد. مبلغ برگشت نخورده است.',
        },
      };
    }
    throw err;
  }

  revalidateTag('wallet');
  const _xff2 = (await headers()).get('x-forwarded-for') ?? '';
  const ip =
    _xff2
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ??
    (await headers()).get('x-real-ip')?.trim() ??
    'unknown';
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

  // اعلان تلگرام به فرستنده — «تراکنش تکمیل شد» (وعدهٔ طراحی)
  const amountFa = (Number(txn.amount) / 100).toLocaleString('fa-IR');
  void notifyTelegramCustomer(
    txn.customerId,
    `✅ <b>تراکنش تکمیل شد</b>\n\n💸 مبلغ: <b>${amountFa} ${txn.currency}</b>\n\nموجودی کیف پول شما به‌روزرسانی شد.`,
    undefined,
    { dedupeKey: `transfer:${txn.id}` },
  );

  return { success: true, data: { txnId } };
}
