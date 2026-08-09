'use server';

import prisma from '@/lib/db';
import { validatePhone } from '@/lib/phone-validation';
import { requireUser } from '@/lib/require-auth';
import {
  createTelegramLinkToken,
  getTelegramBotUsername,
  getTelegramLinkUrl,
  sendTelegramMessage,
} from '@/lib/telegram';
import type { FintechActionResult } from '@/types/types';

export interface TelegramLinkResultData {
  /** آیا تلگرام از قبل وصل است؟ */
  linked: boolean;
  /** لینک اتصال یک‌بارمصرف — اگر linked باشد خالی است */
  url: string;
  /** username ربات — برای نمایش به کاربر */
  username: string;
  /**
   * شمارهٔ در انتظار با تلگرام خودکار تأیید شده است؟ (pendingPhone پاک شده)
   * UI بعد از ارسال کد/لینک هر چند ثانیه این را چک می‌کند تا دیالوگ را
   * خودکار ببندد — بدون نیاز به وارد کردن OTP.
   */
  pendingPhoneVerified: boolean;
}

/**
 * PhoneOtpOrLinkResult — نتیجهٔ ارسال کد تأیید شماره.
 * OTP همیشه از بهترین کانال موجود ارسال می‌شود (تلگرام ← ایمیل ← پیامک)؛
 * تلگرام بلاک‌کننده نیست. اگر کاربر تلگرام وصل نکرده باشد، لینک اتصال هم
 * به‌صورت خودکار ساخته و (اختیاری) برگردانده می‌شود.
 */
export type PhoneOtpOrLinkResult =
  | {
      /** OTP فرستاده شد */
      kind: 'sent';
      message: string;
      /** فقط dev — کد برای نمایش */
      devCode?: string;
      /** لینک اتصال تلگرام (اگر وصل نباشد — اختیاری) */
      telegramUrl?: string;
    }
  | {
      /** خطا */
      kind: 'error';
      message: string;
      retryAfterMs?: number;
      /** لینک اتصال تلگرام (اگر ساخته شده باشد) */
      telegramUrl?: string;
    };

export async function getTelegramLink(): Promise<FintechActionResult<TelegramLinkResultData>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { telegramChatId: true, pendingPhone: true },
  });

  if (user?.telegramChatId) {
    return {
      success: true,
      data: {
        linked: true,
        url: '',
        username: getTelegramBotUsername(),
        // pendingPhone پاک شده → وبهوک شماره را تأیید کرده (auto-verify)
        pendingPhoneVerified: !user.pendingPhone,
      },
    };
  }

  const username = getTelegramBotUsername();
  if (!username) {
    return {
      success: false,
      error: {
        code: 'TELEGRAM_NOT_CONFIGURED',
        message: 'سرویس تلگرام هنوز راه‌اندازی نشده است. لطفاً بعداً تلاش کنید.',
      },
    };
  }

  // FIX: توکن موجود (استفاده‌نشده و منقضی‌نشده) را برگردان — ساخت توکن جدید
  // هر بار، لینک نمایش‌داده‌شده به کاربر را باطل می‌کرد (پولینگ UI هر ۳ ثانیه
  // این اکشن را صدا می‌زند و هر بار توکن قبلی را used می‌کرد → «لینک قبلاً
  // استفاده شده است»). فقط وقتی توکن معتبری نیست، یکی جدید ساخته می‌شود.
  const existing = await prisma.telegramLinkToken.findFirst({
    where: {
      userId: auth.user.id,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: { token: true },
  });
  if (existing) {
    return {
      success: true,
      data: {
        linked: false,
        url: getTelegramLinkUrl(existing.token),
        username,
        pendingPhoneVerified: false,
      },
    };
  }

  const token = await createTelegramLinkToken(auth.user.id);
  return {
    success: true,
    data: {
      linked: false,
      url: getTelegramLinkUrl(token),
      username,
      pendingPhoneVerified: false,
    },
  };
}

/**
 * requestPhoneOtpOrTelegramLink — یک action برای هر دو حالت:
 *
 *   ۱. شماره در User.pendingPhone ثبت می‌شود (مبنای مقایسهٔ خودکار تلگرام)
 *   ۲. تلگرام وصل است → دکمهٔ «ارسال شماره تماس» مستقیم به چت فرستاده می‌شود؛
 *      کاربر که بزند، وبهوک شماره را مقایسه و خودکار تأیید می‌کند (بدون OTP)
 *   ۳. تلگرام وصل نیست → لینک اتصال ساخته می‌شود؛ بعد از /start ربات دکمهٔ
 *      «ارسال شماره تماس» را می‌فرستد
 *   ۴. OTP همیشه به‌عنوان fallback از بهترین کانال موجود (تلگرام ← ایمیل ← پیامک)
 *      ارسال می‌شود تا کاربر هیچ‌وقت گیر نکند
 */
export async function requestPhoneOtpOrTelegramLink(phone: string): Promise<PhoneOtpOrLinkResult> {
  const authResult = await requireUser();
  if (!authResult.success) {
    return { kind: 'error', message: 'وارد حساب کاربری شوید.' };
  }

  // اعتبارسنجی + نرمال‌سازی به E.164 (همان مبنایی که وبهوک مقایسه می‌کند)
  const norm = validatePhone(phone);
  if (!norm.valid) {
    return { kind: 'error', message: norm.message };
  }
  const e164 = norm.e164;

  const user = await prisma.user.findUnique({
    where: { id: authResult.user.id },
    select: { telegramChatId: true },
  });

  // ثبت شمارهٔ در انتظار — اگر با شمارهٔ تلگرام یکی بود، خودکار تأیید می‌شود
  await prisma.user.update({
    where: { id: authResult.user.id },
    data: { pendingPhone: e164 },
  });

  let telegramUrl: string | undefined;
  let telegramAction: 'contact-request' | 'link' | 'none' = 'none';
  const username = getTelegramBotUsername();

  if (user?.telegramChatId) {
    // تلگرام وصل است → دکمهٔ ارسال شماره تماس را همین حالا بفرست
    if (username) {
      const sent = await sendTelegramMessage(
        user.telegramChatId,
        'برای تأیید خودکار شماره موبایل، دکمهٔ زیر را بزنید تا شمارهٔ تلگرام شما با شمارهٔ واردشده در سایت مقایسه و تأیید شود.',
        { requestContact: true },
      );
      if (sent.success) telegramAction = 'contact-request';
    }
  } else if (username) {
    // تلگرام وصل نیست → لینک اتصال بساز؛ بعد از /start ربات دکمهٔ شماره را می‌فرستد
    try {
      const token = await createTelegramLinkToken(authResult.user.id);
      telegramUrl = getTelegramLinkUrl(token);
      telegramAction = 'link';
    } catch {
      // اتصال تلگرام اختیاری است — نبودش نباید ارسال کد را مختل کند
    }
  }

  // OTP همیشه به‌عنوان fallback بفرست — از بهترین کانال موجود
  const { sendPhoneOtp } = await import('@/actions/phone-verify');
  const res = await sendPhoneOtp({ phone: e164 });
  if (!res.success) {
    return { kind: 'error', message: res.message, retryAfterMs: res.retryAfterMs, telegramUrl };
  }

  let message = res.message;
  if (telegramAction === 'contact-request') {
    message =
      'در تلگرام روی دکمهٔ «ارسال شماره تماس» بزنید — اگر شماره یکی بود، خودکار تأیید می‌شوید. کد هم به‌عنوان پشتیبان ارسال شد.';
  } else if (telegramAction === 'link') {
    message =
      'برای تأیید خودکار: تلگرام را باز کنید و Start بزنید، سپس روی دکمهٔ «ارسال شماره تماس» — کد هم به‌عنوان پشتیبان ارسال شد.';
  }

  return { kind: 'sent', message, devCode: res.devCode, telegramUrl };
}
