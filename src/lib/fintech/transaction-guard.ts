/**
 * transaction-guard.ts — 2FA/OTP guard برای تراکنش‌های حساس
 */

import { createHash, randomInt } from 'node:crypto';
import prisma from '@/lib/db';
import { sendOtp } from '@/lib/email-otp';
import { requireUser } from '@/lib/require-auth';
import type { FintechActionResult } from '@/types/types';
import { z } from 'zod';

const OTP_VALIDITY_MINUTES = 5;
const HIGH_VALUE_THRESHOLD_CENTS = BigInt(10_000_000);

export function isHighValueTransaction(params: {
  kind: string;
  amountCents: bigint | number;
}): boolean {
  return (
    ['WITHDRAWAL', 'TRANSFER'].includes(params.kind) &&
    BigInt(params.amountCents) >= HIGH_VALUE_THRESHOLD_CENTS
  );
}

export async function requestTransactionOtp(params: {
  txnRef: string;
  amountCents: bigint;
  kind: string;
}): Promise<
  FintechActionResult<{
    expiresInSeconds: number;
    devCode?: string;
    channel?: 'telegram' | 'email' | 'sms';
  }>
> {
  const auth = await requireUser();
  if (!auth.success)
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  if (!isHighValueTransaction(params))
    return {
      success: false,
      error: { code: 'NOT_REQUIRED', message: 'این تراکنش نیاز به OTP ندارد' },
    };

  const otp = String(randomInt(100_000, 1_000_000));
  const otpHash = createHash('sha256').update(`${auth.user.id}:${otp}`).digest('hex');
  const expiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);
  await prisma.transactionOtp.upsert({
    where: { userId_txnRef: { userId: auth.user.id, txnRef: params.txnRef } },
    create: { userId: auth.user.id, txnRef: params.txnRef, otpHash, expiresAt, used: false },
    update: { otpHash, expiresAt, used: false },
  });

  const userRecord = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { phoneNumber: true, telegramChatId: true, email: true },
  });
  const otpText = `کد تأیید تراکنش شما: ${otp}\nاعتبار: ${OTP_VALIDITY_MINUTES} دقیقه. این کد را با کسی به اشتراک نگذارید.`;
  const delivery = await sendOtp(
    {
      telegramChatId: userRecord?.telegramChatId,
      email: userRecord?.email,
      phone: userRecord?.phoneNumber,
    },
    otp,
    'fintech-otp',
    otpText,
  );

  if (!delivery.success) {
    if (process.env.NODE_ENV === 'production') {
      await prisma.transactionOtp.updateMany({
        where: { userId: auth.user.id, txnRef: params.txnRef, used: false },
        data: { used: true },
      });
      return {
        success: false,
        error: {
          code: delivery.errorCode === 'NO_CHANNEL' ? 'PHONE_REQUIRED' : 'SEND_FAILED',
          message:
            delivery.errorCode === 'NO_CHANNEL'
              ? 'برای دریافت کد OTP، تلگرام را وصل کنید یا شماره موبایل را در پروفایل ثبت کنید.'
              : 'ارسال کد تأیید ناموفق بود. لطفاً مجدداً تلاش کنید.',
        },
      };
    }
    return { success: true, data: { expiresInSeconds: OTP_VALIDITY_MINUTES * 60, devCode: otp } };
  }
  return {
    success: true,
    data: { expiresInSeconds: OTP_VALIDITY_MINUTES * 60, channel: delivery.channel },
  };
}

const VerifySchema = z.object({
  txnRef: z.string().min(1).max(200),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

export async function verifyTransactionOtp(raw: unknown): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success)
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  const parsed = VerifySchema.safeParse(raw);
  if (!parsed.success)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'کد OTP باید ۶ رقم باشد' },
    };

  const { txnRef, otp } = parsed.data;
  const stored = await prisma.transactionOtp.findUnique({
    where: { userId_txnRef: { userId: auth.user.id, txnRef } },
    select: { otpHash: true, expiresAt: true, used: true },
  });
  if (!stored)
    return {
      success: false,
      error: { code: 'OTP_NOT_FOUND', message: 'کد OTP یافت نشد — لطفاً مجدداً درخواست دهید' },
    };
  if (stored.used)
    return { success: false, error: { code: 'OTP_USED', message: 'این کد قبلاً استفاده شده است' } };
  if (new Date() > stored.expiresAt)
    return {
      success: false,
      error: { code: 'OTP_EXPIRED', message: 'کد OTP منقضی شده — کد جدید درخواست دهید' },
    };

  const inputHash = createHash('sha256').update(`${auth.user.id}:${otp}`).digest('hex');
  if (inputHash !== stored.otpHash)
    return { success: false, error: { code: 'OTP_INVALID', message: 'کد OTP نادرست است' } };

  // Atomic compare-and-set: two concurrent requests cannot both consume the OTP.
  const consumed = await prisma.transactionOtp.updateMany({
    where: {
      userId: auth.user.id,
      txnRef,
      used: false,
      expiresAt: { gt: new Date() },
      otpHash: stored.otpHash,
    },
    data: { used: true },
  });
  if (consumed.count !== 1)
    return { success: false, error: { code: 'OTP_USED', message: 'این کد قبلاً استفاده شده است' } };
  return { success: true, data: undefined };
}
