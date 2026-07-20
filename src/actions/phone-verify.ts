'use server';

/**
 * Phone Verification — Server Actions
 *
 * جریان:
 *   1. sendPhoneOtp({ phone }) — اعتبارسنجی + ذخیره شماره موقت + ارسال SMS OTP
 *   2. verifyPhoneOtp({ phone, code }) — تأیید کد + ذخیره phoneNumber در User + mark verified
 *
 * امنیت:
 *   - rate-limit per IP و per user
 *   - کد ۶ رقمی با OTP_EXPIRES_MS = 10 دقیقه
 *   - OTP روی email+intent کاربر ذخیره می‌شود (از جدول VerificationToken موجود)
 */

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { isPhoneValid, normalizeToE164 } from '@/lib/phone-validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import { sendSms } from '@/lib/sms';
import { consumeOtpToken, generateOtpToken } from '@/lib/tokens';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

// intent اختصاصی برای تأیید موبایل
const PHONE_VERIFY_INTENT = 'service-verify' as const;

export interface PhoneOtpResult {
  success: boolean;
  message: string;
  retryAfterMs?: number;
  /** فقط در dev: کد برای نمایش */
  devCode?: string;
}

// ─── sendPhoneOtp ─────────────────────────────────────────────────────────── //

export async function sendPhoneOtp(args: {
  phone: string;
}): Promise<PhoneOtpResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return { success: false, message: 'ابتدا وارد حساب کاربری شوید.' };
    }

    const headersList = await headers();
    const ip =
      headersList.get('x-real-ip')?.trim() ||
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';

    // rate-limit per IP
    const ipRate = await checkRateLimit(`phone-otp-ip:${ip}`, 'auth');
    if (!ipRate.success) {
      const ms = Math.max(0, ipRate.reset - Date.now());
      return {
        success: false,
        message: 'تعداد درخواست‌ها بیش از حد است. چند دقیقه صبر کنید.',
        retryAfterMs: ms,
      };
    }

    // rate-limit per user
    const userRate = await checkRateLimit(`phone-otp-user:${session.user.id}`, 'auth');
    if (!userRate.success) {
      const ms = Math.max(0, userRate.reset - Date.now());
      return { success: false, message: 'تعداد درخواست‌ها بیش از حد است.', retryAfterMs: ms };
    }

    // اعتبارسنجی شماره
    const phone = args.phone.trim();
    if (!isPhoneValid(phone)) {
      return { success: false, message: 'شماره موبایل معتبر نیست (مثال: ۰۷۰۱۲۳۴۵۶۷)' };
    }
    const e164 = normalizeToE164(phone);

    // تولید کد OTP — از email کاربر به عنوان کلید VerificationToken استفاده می‌کنیم
    const email = session.user.email.trim().toLowerCase();
    const otpResult = await generateOtpToken({ email, intent: PHONE_VERIFY_INTENT });
    if (!otpResult.ok) {
      const ms = (otpResult as { retryAfterMs: number }).retryAfterMs;
      const sec = Math.ceil(ms / 1000);
      return { success: false, message: `لطفاً ${sec} ثانیه صبر کنید.`, retryAfterMs: ms };
    }

    // ارسال SMS
    const body = `کد تأیید موبایل شما: ${otpResult.code}\nاعتبار: ۱۰ دقیقه`;
    const smsResult = await sendSms(e164, body);
    if (!smsResult.success) {
      return { success: false, message: 'ارسال پیامک با خطا مواجه شد. لطفاً دوباره تلاش کنید.' };
    }

    return {
      success: true,
      message: `کد تأیید به ${e164.slice(0, 5)}**** ارسال شد.`,
      devCode: smsResult.devCode,
    };
  } catch {
    return { success: false, message: 'خطای سرور. لطفاً دوباره تلاش کنید.' };
  }
}

// ─── verifyPhoneOtp ───────────────────────────────────────────────────────── //

export async function verifyPhoneOtp(args: {
  phone: string;
  code: string;
}): Promise<PhoneOtpResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return { success: false, message: 'ابتدا وارد حساب کاربری شوید.' };
    }

    // اعتبارسنجی شماره
    const phone = args.phone.trim();
    if (!isPhoneValid(phone)) {
      return { success: false, message: 'شماره موبایل معتبر نیست.' };
    }
    const e164 = normalizeToE164(phone);

    // verify OTP
    const email = session.user.email.trim().toLowerCase();
    const result = await consumeOtpToken({
      email,
      code: args.code.trim(),
      intent: PHONE_VERIFY_INTENT,
    });

    if (!result.ok) {
      const messages: Record<string, string> = {
        'not-found': 'کد معتبر نیست. لطفاً دوباره درخواست کنید.',
        expired: 'کد منقضی شده. لطفاً کد جدید دریافت کنید.',
        'too-many-attempts': 'تعداد تلاش بیش از حد. لطفاً کد جدید دریافت کنید.',
        'wrong-code': 'کد اشتباه است.',
      };
      return { success: false, message: messages[result.reason] ?? 'کد نامعتبر است.' };
    }

    // ذخیره شماره تأیید شده در DB
    await prisma.user.update({
      where: { id: session.user.id },
      data: { phoneNumber: e164 },
    });

    // sync داشبورد — صفحه مدیریت کاربران را revalidate کن
    revalidatePath('/dashboard/users');

    return { success: true, message: 'شماره موبایل با موفقیت تأیید شد.' };
  } catch {
    return { success: false, message: 'خطای سرور. لطفاً دوباره تلاش کنید.' };
  }
}
