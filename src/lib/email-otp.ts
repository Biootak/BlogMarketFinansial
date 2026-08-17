/**
 * email-otp.ts — OTP delivery: telegram → email → sms (اولویت رایگان‌ترین)
 *
 * جریان تحویل برای هر دو مورد (تأیید شماره + تراکنش مالی):
 *   ۱. تلگرام وصل دارد → پیام تلگرام (رایگان، یک‌ثانیه‌ای)
 *   ۲. ایمیل دارد      → Resend email (رایگان ۳۰۰۰/روز)
 *   ۳. شماره دارد      → SMS (Twilio — فقط fallback آخر)
 *
 * هرگز throw نمی‌کند — نتیجه channel + خطا بازگردانده می‌شود.
 */

import { getEmailProvider } from '@/lib/email';
import { otpEmail } from '@/lib/email/templates';
import type { OtpEmailIntent } from '@/lib/email/templates';
import { serverLog } from '@/lib/server-logger';
import { sendSms } from '@/lib/sms';
import { sendTelegramMessage } from '@/lib/telegram';

export type OtpChannel = 'telegram' | 'email' | 'sms';

export interface OtpDeliveryResult {
  success: boolean;
  channel?: OtpChannel;
  /** فقط dev — برای لاگ server-side */
  devCode?: string;
  errorCode?: 'NO_CHANNEL' | 'SEND_FAILED';
}

export interface OtpDeliveryTarget {
  /** chatId تلگرام — اگر کاربر تلگرام وصل کرده باشد */
  telegramChatId?: string | null;
  /** ایمیل کاربر */
  email?: string | null;
  /** شماره موبایل E.164 — fallback آخر */
  phone?: string | null;
}

/**
 * sendOtp — OTP را از بهترین کانال موجود ارسال می‌کند.
 *
 * @param target   اطلاعات تحویل کاربر
 * @param code     کد ۶ رقمی OTP
 * @param intent   نوع OTP برای متن ایمیل
 * @param smsBody  متن کامل برای SMS/تلگرام (فارسی)
 */
export async function sendOtp(
  target: OtpDeliveryTarget,
  code: string,
  intent: OtpEmailIntent,
  smsBody: string,
): Promise<OtpDeliveryResult> {
  // ۱. تلگرام — رایگان، آنی، بهترین گزینه برای افغانستان
  if (target.telegramChatId) {
    const res = await sendTelegramMessage(target.telegramChatId, smsBody);
    if (res.success) return { success: true, channel: 'telegram' };
    // USER_BLOCKED و…: تلگرام را skip کن، به ایمیل برو — ولی اگر chatId وجود
    // داشت و ارسال واقعاً fail شد، لاگ کن (اتصال کاربر خراب است و OTP فقط از
    // کانال بعدی می‌رسد — قابل مشاهده در مرکز پایش).
    serverLog.warn('email-otp', `telegram-send-failed (${res.errorCode ?? 'UNKNOWN'})`, {
      intent,
      hasEmail: !!target.email,
      hasPhone: !!target.phone,
    });
  }

  // ۲. ایمیل — رایگان (Resend 3000/روز)، برای همه کاربران
  if (target.email) {
    try {
      const provider = getEmailProvider();
      await provider.send(otpEmail({ to: target.email, code, intent, expiresLabel: '۵ دقیقه' }));
      return { success: true, channel: 'email' };
    } catch (err) {
      // 2026-08-17: قبلاً `catch {}` بود — خطای واقعی (کلید معتبر نبودن، دامنه
      // verify نشده، recipient نامعتبر، محدودیت Resend و…) کاملاً ناپیدا می‌ماند
      // و کاربر فقط پیام عمومی «ارسال کد تأیید ناموفق بود» می‌دید. حالا خطا در
      // SystemLog + Sentry ثبت می‌شود تا علت قابل‌تشخیص باشد.
      serverLog.error('email-otp', 'email-send-failed', err);
      // ایمیل fail شد — به SMS برو
    }
  }

  // ۳. SMS — پولی، فقط fallback آخر
  if (target.phone) {
    const res = await sendSms(target.phone, smsBody);
    if (res.success) return { success: true, channel: 'sms', devCode: res.devCode };

    // SMS هم fail شد
    if (process.env.NODE_ENV !== 'production' && res.devCode) {
      // dev-only: در console لاگ کن
      // biome-ignore lint/suspicious/noConsole: dev-only OTP logging
      console.log(`[DEV OTP] intent=${intent} code=${res.devCode}`);
      return { success: true, channel: 'sms', devCode: res.devCode };
    }
    // فقط وقتی Twilio واقعاً ست شده باشد لاگ بگیر (ناموجود بودن Twilio حالت
    // عادی است و هر ارسال را پر از لاگ می‌کند) — fail واقعی یعنی مشکل حساب.
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
    ) {
      serverLog.error('email-otp', 'sms-send-failed', { intent, phone: target.phone });
    }
    return { success: false, errorCode: 'SEND_FAILED' };
  }

  return { success: false, errorCode: 'NO_CHANNEL' };
}
