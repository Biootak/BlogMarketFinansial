'use server';

import { randomBytes } from 'node:crypto';
import { assertCsrf } from '@/lib/csrf-server';
import prisma from '@/lib/db';
import {
  enqueueHighValueJob,
  getHighValueJobStatus,
  mapQueuedJobError,
  processHighValueQueue,
} from '@/lib/fintech/high-value-queue';
import {
  isHighValueTransaction,
  requestTransactionOtp,
  verifyTransactionOtp,
} from '@/lib/fintech/transaction-guard';
import { logTxnStatusChange } from '@/lib/fintech/txn-trail';
import { screenTransaction } from '@/lib/fraud/screener';
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
  // B-01 fix: CSRF guard — جلوگیری از cross-site transfer initiation.
  // confirmTransfer قبلاً داشت ولی initiateTransfer نداشت؛ یک صفحه مخرب
  // می‌توانست تراکنش PENDING بسازد و موجودی را قفل کند.
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
    select: { id: true },
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

  // ── validation گیرنده (بدون قفل DB — فقط read) ────────────────────────────
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

  // B-02 fix: account fetch + balance check داخل transaction اتمیک.
  // بررسی موجودی خارج از transaction (TOCTOU) حذف شد — دو درخواست هم‌زمان
  // هر دو موجودی را کافی می‌دیدند و دو PENDING روی یک حساب می‌ساختند.
  // حالا account داخل $transaction با READ COMMITTED خوانده می‌شود؛
  // اگر موجودی ناکافی باشد داخل transaction rollback می‌شود.
  const amountBigInt = BigInt(amountCents);
  const txnRef = randomBytes(8).toString('hex');

  // ── Fraud screening قبل از ثبت تراکنش ──────────────────────────────────────
  // account را برای exchangeId نیاز داریم — یک read سریع قبل از transaction
  const senderAccountForFraud = await prisma.fintechAccount.findFirst({
    where: { customerId: senderCustomer.id, currency, status: 'ACTIVE' },
    select: { exchangeId: true },
  });
  if (senderAccountForFraud) {
    const fraudRisk = await screenTransaction({
      customerId: senderCustomer.id,
      exchangeId: senderAccountForFraud.exchangeId,
      amount: amountBigInt,
      currency,
      ip,
      kind: 'TRANSFER',
    });
    if (fraudRisk.shouldBlock) {
      return {
        success: false,
        error: {
          code: 'FRAUD_BLOCKED',
          message: 'این انتقال به دلایل امنیتی مسدود شد. لطفاً با پشتیبانی تماس بگیرید.',
        },
      };
    }
  }

  let txn: { id: string; accountId: string | null; exchangeId: string };
  try {
    txn = await prisma.$transaction(async (tx) => {
      // account را داخل transaction بخوان — قفل READ اتفاق می‌افتد
      const account = await tx.fintechAccount.findFirst({
        where: {
          customerId: senderCustomer.id,
          currency,
          status: 'ACTIVE',
        },
        select: { id: true, balance: true, exchangeId: true },
      });
      if (!account) throw new Error('NO_ACCOUNT');
      if (account.balance < amountBigInt) throw new Error('INSUFFICIENT_BALANCE');

      const created = await tx.transaction.create({
        data: {
          id: createId(),
          exchangeId: account.exchangeId,
          customerId: senderCustomer.id,
          accountId: account.id,
          kind: 'TRANSFER',
          status: 'PENDING',
          amount: amountBigInt,
          currency,
          idempotencyKey,
          note: note ?? null,
          meta: { txnRef, recipientCustomerId: recipientCustomer.id } as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
        select: { id: true, accountId: true, exchangeId: true },
      });
      // ثبت وضعیت اولیه در تاریخچه داخل همان transaction
      await tx.transactionStatusLog.create({
        data: {
          txnId: created.id,
          fromStatus: null,
          toStatus: 'PENDING',
          actorId: auth.user.id,
          actorRole: 'USER',
          ip,
          note: 'TRANSFER_INITIATED',
        },
      });
      return created;
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'NO_ACCOUNT') {
      return { success: false, error: { code: 'NO_ACCOUNT', message: 'حساب فعالی برای این ارز یافت نشد' } };
    }
    if (msg === 'INSUFFICIENT_BALANCE') {
      return { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'موجودی کافی نیست' } };
    }
    throw err;
  }

  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: txn.exchangeId,
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
      // ثبت انتقال به FAILED در تاریخچه
      void logTxnStatusChange({
        txnId: txn.id,
        fromStatus: 'PENDING',
        toStatus: 'FAILED',
        actorId: auth.user.id,
        actorRole: 'USER',
        ip,
        note: 'OTP_SEND_FAILED',
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
): Promise<FintechActionResult<{ txnId: string; queued?: boolean }>> {
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
  const customerId = txn.customerId;

  const _xff2 = (await headers()).get('x-forwarded-for') ?? '';
  const ip =
    _xff2
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ??
    (await headers()).get('x-real-ip')?.trim() ??
    'unknown';

  const isHighValue = isHighValueTransaction({ kind: 'TRANSFER', amountCents: txn.amount });

  // ── مسیر پرمقدار: صف زیرساختی (single-flight + retry + idempotency) ───────
  // atomic claim داخل executeConfirmTransfer همچنان لایهٔ نهایی دفاع است؛ صف
  // تضمین می‌کند دوبار confirm هم‌زمان فقط یک job می‌سازد و خطای موقت DB توسط
  // cron با backoff دوباره تلاش می‌شود (بدون نیاز به تلاش دستی کاربر).
  if (isHighValue) {
    const enqueued = await enqueueHighValueJob({
      operation: 'CONFIRM_TRANSFER',
      targetId: txn.id,
      payload: { customerId, actorId: auth.user.id },
      triggeredBy: auth.user.id,
    });
    if (!enqueued.success) {
      return {
        success: false,
        error: { code: 'QUEUE_FAILED', message: 'ثبت در صف پردازش تراکنش ناموفق بود' },
      };
    }
    // اجرای فوری best-effort تا پاسخ هم‌زمان باشد؛ اگر موقتاً خطا داد، cron
    // در کمتر از یک دقیقه job را برمی‌دارد و تراکنش کامل می‌شود.
    await processHighValueQueue();
    const job = await getHighValueJobStatus('CONFIRM_TRANSFER', txn.id);
    if (job.status === 'completed') return { success: true, data: { txnId } };
    if (job.status === 'failed' || job.status === 'dead') {
      return {
        success: false,
        error: mapQueuedJobError(job.lastError, 'پردازش تراکنش ناموفق بود'),
      };
    }
    return { success: true, data: { txnId, queued: true } };
  }

  // ── مسیر عادی (مبلغ کم): اجرای مستقیم ────────────────────────────────────
  const res = await executeConfirmTransfer({
    txnId: txn.id,
    customerId,
    actorId: auth.user.id,
    ip,
  });
  return mapConfirmTransferCore(res, txn.id);
}

export type ConfirmTransferCoreResult =
  | { ok: true; alreadyProcessed?: boolean }
  | { ok: false; retryable: boolean; code: string; message: string };

/**
 * executeConfirmTransfer — اجرای خالص تأیید انتقال (atomic claim + debit + credit + ledger + side effects).
 * هم از مسیر inline (مبلغ کم) و هم از کارگر صف تراکنش‌های پرمقدار صدا زده می‌شود.
 * idempotent: اگر تراکنش قبلاً COMPLETED شده باشد → { ok: true, alreadyProcessed: true }.
 * خطاهای موقت DB (timeout / pool) → retryable — صف با backoff دوباره تلاش می‌کند.
 */
export async function executeConfirmTransfer(input: {
  txnId: string;
  customerId: string;
  actorId: string;
  ip?: string;
}): Promise<ConfirmTransferCoreResult> {
  const { txnId, customerId, actorId, ip } = input;
  const txn = await prisma.transaction.findFirst({
    where: { id: txnId, customerId },
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
    return { ok: false, retryable: false, code: 'NOT_FOUND', message: 'تراکنش یافت نشد' };
  }
  if (txn.status !== 'PENDING') {
    if (txn.status === 'COMPLETED') return { ok: true, alreadyProcessed: true };
    return {
      ok: false,
      retryable: false,
      code: 'INVALID_STATE',
      message: 'این تراکنش قابل تأیید نیست',
    };
  }
  const meta = txn.meta as { recipientCustomerId?: string } | null;
  const recipientCustomerId = meta?.recipientCustomerId;
  if (!recipientCustomerId) {
    return {
      ok: false,
      retryable: false,
      code: 'MISSING_RECIPIENT',
      message: 'اطلاعات گیرنده یافت نشد',
    };
  }
  if (!txn.accountId || !txn.customerId) {
    return {
      ok: false,
      retryable: false,
      code: 'INVALID_STATE',
      message: 'اطلاعات حساب تراکنش ناقص است',
    };
  }
  const ownerAccountId = txn.accountId;
  const ownerCustomerId = txn.customerId;

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
        where: { id: ownerAccountId, balance: { gte: txn.amount } },
        data: { balance: { decrement: txn.amount }, updatedAt: now },
      });
      if (debit.count === 0) throw new Error('INSUFFICIENT_BALANCE');

      const updatedSender = await tx.fintechAccount.findUniqueOrThrow({
        where: { id: ownerAccountId },
        select: { balance: true },
      });
      await tx.ledgerEntry.create({
        data: {
          id: createId(),
          exchangeId: txn.exchangeId,
          accountId: ownerAccountId,
          customerId: ownerCustomerId,
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
      // ثبت تغییر وضعیت PENDING→COMPLETED در تاریخچه داخل همان transaction
      await tx.transactionStatusLog.create({
        data: {
          txnId: txn.id,
          fromStatus: 'PENDING',
          toStatus: 'COMPLETED',
          actorId,
          actorRole: 'USER',
          ip: ip ?? 'queue-worker',
          note: 'TRANSFER_COMPLETED',
        },
      });
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'ALREADY_PROCESSED') {
      // confirm هم‌زمان دیگر همین تراکنش را کامل کرده — idempotent success
      return { ok: true, alreadyProcessed: true };
    }
    if (msg === 'INSUFFICIENT_BALANCE') {
      // تراکنش PENDING می‌ماند — بهتر است FAILED شود تا کاربر در UI گیر نکند
      // (best-effort — اگر این update هم fail کند، cron می‌تواند PENDING های قدیمی را پاک کند)
      void prisma.transaction
        .update({
          where: { id: txnId },
          data: { status: 'FAILED', updatedAt: new Date() },
        })
        .then(() =>
          prisma.transactionStatusLog.create({
            data: {
              txnId,
              fromStatus: 'PENDING',
              toStatus: 'FAILED',
              actorId,
              actorRole: 'USER',
              ip: ip ?? 'system',
              note: 'TRANSFER_FAILED:INSUFFICIENT_BALANCE',
            },
          }),
        )
        .catch(() => {});
      return {
        ok: false,
        retryable: false,
        code: 'INSUFFICIENT_BALANCE',
        message: 'موجودی کافی نیست',
      };
    }
    if (msg === 'RECIPIENT_NO_ACCOUNT') {
      // گیرنده حساب ندارد → تراکنش باید FAILED شود (rollback نشده چون claim انجام نشد)
      void prisma.transaction
        .update({
          where: { id: txnId },
          data: { status: 'FAILED', updatedAt: new Date() },
        })
        .then(() =>
          prisma.transactionStatusLog.create({
            data: {
              txnId,
              fromStatus: 'PENDING',
              toStatus: 'FAILED',
              actorId,
              actorRole: 'USER',
              ip: ip ?? 'system',
              note: 'TRANSFER_FAILED:RECIPIENT_NO_ACCOUNT',
            },
          }),
        )
        .catch(() => {});
      return {
        ok: false,
        retryable: false,
        code: 'RECIPIENT_NO_ACCOUNT',
        message: 'گیرنده دیگر حساب فعالی برای این ارز ندارد. مبلغ برگشت نخورده است.',
      };
    }
    // خطای موقت (timeout / pool) → retryable — صف با backoff دوباره تلاش می‌کند
    return {
      ok: false,
      retryable: true,
      code: 'INTERNAL_ERROR',
      message: 'خطای موقت در پردازش تراکنش',
    };
  }

  revalidateTag('wallet');
  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: txn.exchangeId,
      actorId,
      actorRole: 'USER',
      action: 'TRANSFER_COMPLETED',
      entityType: 'Transaction',
      entityId: txn.id,
      ip: ip ?? 'queue-worker',
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

  return { ok: true };
}

function mapConfirmTransferCore(
  res: ConfirmTransferCoreResult,
  txnId: string,
): FintechActionResult<{ txnId: string; queued?: boolean }> {
  if (res.ok) return { success: true, data: { txnId } };
  return { success: false, error: { code: res.code, message: res.message } };
}
