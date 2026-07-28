/**
 * transaction-guard.ts — 2FA/OTP guard برای تراکنش‌های حساس
 *
 * جریان:
 *   کاربر → requestTransactionOtp → OTP در TransactionOtp ذخیره می‌شود
 *   کاربر → verifyTransactionOtp → OTP تأیید و burn می‌شود (single-use)
 *   هر Action مالی حساس → verifyTransactionOtp قبل از اجرا می‌گیرد
 *
 * تنظیمات:
 *   OTP_VALIDITY_MINUTES = 5
 *   HIGH_VALUE_THRESHOLD = 100,000 AFN (در cents: 10,000,000)
 */

import { createHash, randomInt } from 'node:crypto';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { sendSms } from '@/lib/sms';
import type { FintechActionResult } from '@/types/types';
import { z } from 'zod';

// ─── Config ───────────────────────────────────────────────────────────────────

const OTP_VALIDITY_MINUTES = 5;

/** بیش از ۱۰۰,۰۰۰ افغانی (در cents) */
const HIGH_VALUE_THRESHOLD_CENTS = BigInt(10_000_000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * isHighValueTransaction — آیا این تراکنش نیاز به OTP دارد؟
 *
 * WITHDRAWAL و TRANSFER بالای آستانه نیاز به تأیید OTP دارند.
 */
export function isHighValueTransaction(params: {
  kind: string;
  amountCents: bigint | number;
}): boolean {
  const HIGH_VALUE_KINDS = ['WITHDRAWAL', 'TRANSFER'];
  const amount = BigInt(params.amountCents);
  return HIGH_VALUE_KINDS.includes(params.kind) && amount >= HIGH_VALUE_THRESHOLD_CENTS;
}

// ─── REQUEST OTP ─────────────────────────────────────────────────────────────

/**
 * requestTransactionOtp — تولید و ذخیره OTP برای تراکنش
 *
 * در محیط واقعی باید OTP از طریق SMS/Email ارسال شود.
 * این پیاده‌سازی OTP را برمی‌گرداند — در production از demo UI نمایش نده.
 */
export async function requestTransactionOtp(params: {
  txnRef: string;
  amountCents: bigint;
  kind: string;
}): Promise<FintechActionResult<{ expiresInSeconds: number; devCode?: string }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  if (!isHighValueTransaction({ kind: params.kind, amountCents: params.amountCents })) {
    return {
      success: false,
      error: { code: 'NOT_REQUIRED', message: 'این تراکنش نیاز به OTP ندارد' },
    };
  }

  const otp = String(randomInt(100_000, 999_999));
  const otpHash = createHash('sha256').update(`${auth.user.id}:${otp}`).digest('hex');
  const expiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);

  await prisma.transactionOtp.upsert({
    where: { userId_txnRef: { userId: auth.user.id, txnRef: params.txnRef } },
    create: {
      userId: auth.user.id,
      txnRef: params.txnRef,
      otpHash,
      expiresAt,
      used: false,
    },
    update: {
      otpHash,
      expiresAt,
      used: false,
    },
  });

  // ارسال OTP از طریق SMS
  // در dev mode اگر Twilio تنظیم نشده باشد، sendSms کد را در devCode برمی‌گرداند
  const userRecord = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { phoneNumber: true },
  });
  const phoneNumber = userRecord?.phoneNumber;

  // اگر شماره تلفن تأیید نشده → در production خطا؛ در dev کد را مستقیم برگردان
  if (!phoneNumber) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: {
          code: 'PHONE_REQUIRED',
          message:
            'شماره تلفن تأیید‌شده برای ارسال کد OTP الزامی است. لطفاً ابتدا شماره تلفن خود را در پروفایل ثبت کنید.',
        },
      };
    }
    // dev-only: OTP را مستقیم برگردان تا تست بتوان کرد
    return {
      success: true,
      data: { expiresInSeconds: OTP_VALIDITY_MINUTES * 60, devCode: otp },
    };
  }

  const smsResult = await sendSms(
    phoneNumber,
    `کد تأیید تراکنش شما: ${otp}\nاعتبار: ${OTP_VALIDITY_MINUTES} دقیقه. این کد را با کسی به اشتراک نگذارید.`,
  );

  if (!smsResult.success) {
    // اگر SMS ارسال نشد در production، OTP را از DB پاک کن تا منقضی‌شده باشد
    if (process.env.NODE_ENV === 'production') {
      await prisma.transactionOtp.update({
        where: { userId_txnRef: { userId: auth.user.id, txnRef: params.txnRef } },
        data: { used: true }, // burn کن — کاربر باید دوباره request کند
      });
      return {
        success: false,
        error: {
          code: 'SMS_FAILED',
          message: 'ارسال کد تأیید ناموفق بود. لطفاً مجدداً تلاش کنید.',
        },
      };
    }
  }

  // SECURITY (P0): OTP هرگز در response به client نباید بیاید — حتی در dev/staging.
  // نشت OTP در preview/staging deployments که NODE_ENV !== 'production' دارند،
  // به مهاجم اجازه می‌دهد کد را مستقیم از response بخواند.
  // در dev، OTP فقط در server log چاپ می‌شود (برای تست دستی).
  if (process.env.NODE_ENV !== 'production' && smsResult.devCode !== undefined) {
    // biome-ignore lint/suspicious/noConsole: dev-only OTP logging for manual testing
    console.log(`[DEV OTP] txnRef=${params.txnRef} code=${smsResult.devCode}`);
  }

  return {
    success: true,
    data: { expiresInSeconds: OTP_VALIDITY_MINUTES * 60 },
  };
}

// ─── VERIFY OTP ──────────────────────────────────────────────────────────────

const VerifySchema = z.object({
  txnRef: z.string().min(1),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

/**
 * verifyTransactionOtp — تأیید و سوزاندن OTP (single-use)
 */
export async function verifyTransactionOtp(raw: unknown): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const parsed = VerifySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'کد OTP باید ۶ رقم باشد' },
    };
  }

  const { txnRef, otp } = parsed.data;

  const stored = await prisma.transactionOtp.findUnique({
    where: { userId_txnRef: { userId: auth.user.id, txnRef } },
    select: { otpHash: true, expiresAt: true, used: true },
  });

  if (!stored) {
    return {
      success: false,
      error: { code: 'OTP_NOT_FOUND', message: 'کد OTP یافت نشد — لطفاً مجدداً درخواست دهید' },
    };
  }

  if (stored.used) {
    return { success: false, error: { code: 'OTP_USED', message: 'این کد قبلاً استفاده شده است' } };
  }

  if (new Date() > stored.expiresAt) {
    return {
      success: false,
      error: {
        code: 'OTP_EXPIRED',
        message: 'کد OTP منقضی شده — کد جدید درخواست دهید',
      },
    };
  }

  const inputHash = createHash('sha256').update(`${auth.user.id}:${otp}`).digest('hex');
  if (inputHash !== stored.otpHash) {
    return { success: false, error: { code: 'OTP_INVALID', message: 'کد OTP نادرست است' } };
  }

  // Burn — single-use: پس از استفاده، پرچم used را فعال می‌کنیم
  await prisma.transactionOtp.update({
    where: { userId_txnRef: { userId: auth.user.id, txnRef } },
    data: { used: true },
  });

  return { success: true, data: undefined };
}
