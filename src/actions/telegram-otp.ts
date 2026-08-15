'use server';

import prisma from '@/lib/db';
import { validatePhone } from '@/lib/phone-validation';
import { requireUser } from '@/lib/require-auth';
import {
  createTelegramLinkToken,
  formatTelegramPhone,
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

  // توکن موجود معتبر را برگردان — هرگز createTelegramLinkToken بدون بررسی
  // موجودی صدا نزن، آن همه توکن‌های قبلی را باطل می‌کند و کاربری که لینک
  // را دارد با «نامعتبر» روبرو می‌شود. polling این action را هر چند ثانیه
  // صدا می‌زند — بدون این guard هر بار لینک در دست کاربر کِش می‌شد.
  const existing = await prisma.telegramLinkToken.findFirst({
    where: {
      userId: auth.user.id,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: { token: true },
  });

  // فقط اگر هیچ توکن معتبری نیست، جدید بساز
  // (createTelegramLinkToken ابتدا همه قبلی‌ها را باطل می‌کند — باید آخرین راه باشد)
  const activeToken = existing?.token ?? (await createTelegramLinkToken(auth.user.id));

  return {
    success: true,
    data: {
      linked: false,
      url: getTelegramLinkUrl(activeToken),
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
    // تلگرام وصل است → دکمهٔ ارسال شماره تماس را همین حالا بفرست + شماره مورد انتظار نشان بده
    if (username) {
      const sent = await sendTelegramMessage(
        user.telegramChatId,
        `🔐 <b>تأیید شماره موبایل</b>\n\n📱 شماره‌ای که وارد کردید: <code>${formatTelegramPhone(e164)}</code>\n\nبرای تأیید، دکمهٔ زیر را بزنید. <b>شمارهٔ تلگرام شما باید همین شماره باشد</b> تا تأیید خودکار انجام شود.`,
        { requestContact: true },
      );
      if (sent.success) telegramAction = 'contact-request';
    }
  } else if (username) {
    // تلگرام وصل نیست → لینک اتصال بساز (یا توکن معتبر موجود را reuse کن)
    // ⚠️ هرگز createTelegramLinkToken بدون بررسی موجودی صدا نزن — آن توکن‌های
    // قبلی را باطل می‌کند و کاربری که لینک را دارد با «نامعتبر» روبرو می‌شود.
    try {
      const existingForOtp = await prisma.telegramLinkToken.findFirst({
        where: {
          userId: authResult.user.id,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: { token: true },
      });
      const token = existingForOtp?.token ?? (await createTelegramLinkToken(authResult.user.id));
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
    message = `پیامی در تلگرام برای شما ارسال شد — شمارهٔ ثبت‌شده (${e164}) را با دکمهٔ «ارسال شماره تماس» تأیید کنید. کد پشتیبان هم ارسال شد.`;
  } else if (telegramAction === 'link') {
    message = `تلگرام را باز کنید، روی «Start» بزنید و سپس دکمهٔ «ارسال شماره تماس» را بزنید — شمارهٔ تلگرام شما باید ${e164} باشد. کد پشتیبان هم ارسال شد.`;
  }

  return { kind: 'sent', message, devCode: res.devCode, telegramUrl };
}
