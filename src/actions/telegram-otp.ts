'use server';

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import {
  createTelegramLinkToken,
  getTelegramBotUsername,
  getTelegramLinkUrl,
} from '@/lib/telegram';
import type { FintechActionResult } from '@/types/types';

export interface TelegramLinkResultData {
  /** آیا تلگرام از قبل وصل است؟ */
  linked: boolean;
  /** لینک اتصال یک‌بارمصرف — اگر linked باشد خالی است */
  url: string;
  /** username ربات — برای نمایش به کاربر */
  username: string;
}

/**
 * sendPhoneOtpViaTelegram — شماره رو ثبت + OTP رو از طریق تلگرام می‌فرسته.
 * اگر تلگرام وصل نباشد، لینک اتصال رو برمی‌گردونه تا UI بلافاصله تلگرام رو باز کنه.
 */
export type PhoneOtpOrLinkResult =
  | {
      /** OTP فرستاده شد */
      kind: 'sent';
      message: string;
    }
  | {
      /** تلگرام وصل نیست — URL برای باز کردن فوری */
      kind: 'need-telegram';
      telegramUrl: string;
    }
  | {
      /** خطا */
      kind: 'error';
      message: string;
      retryAfterMs?: number;
    };

export async function getTelegramLink(): Promise<FintechActionResult<TelegramLinkResultData>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { telegramChatId: true },
  });

  if (user?.telegramChatId) {
    return {
      success: true,
      data: { linked: true, url: '', username: getTelegramBotUsername() },
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

  const token = await createTelegramLinkToken(auth.user.id);
  return {
    success: true,
    data: { linked: false, url: getTelegramLinkUrl(token), username },
  };
}

/**
 * requestPhoneOtpOrTelegramLink — یک action برای هر دو حالت:
 *
 *   ۱. تلگرام وصل است  → OTP می‌فرسته و 'sent' برمی‌گردونه
 *   ۲. تلگرام وصل نیست → توکن یک‌بارمصرف می‌سازه، URL برمی‌گردونه
 *      تا UI بلافاصله تلگرام رو باز کنه (بدون کلیک جداگانه)
 *
 * UI بعد از دریافت 'need-telegram': window.open(telegramUrl) + polling
 * UI بعد از دریافت 'sent': مستقیم به صفحه وارد کردن کد می‌ره
 */
export async function requestPhoneOtpOrTelegramLink(phone: string): Promise<PhoneOtpOrLinkResult> {
  const authResult = await requireUser();
  if (!authResult.success) {
    return { kind: 'error', message: 'وارد حساب کاربری شوید.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: authResult.user.id },
    select: { telegramChatId: true },
  });

  // تلگرام وصل نیست → لینک اتصال برگردان تا UI فوری باز کنه
  if (!user?.telegramChatId) {
    const username = getTelegramBotUsername();
    if (!username) {
      return { kind: 'error', message: 'سرویس تلگرام هنوز راه‌اندازی نشده است.' };
    }
    const token = await createTelegramLinkToken(authResult.user.id);
    return { kind: 'need-telegram', telegramUrl: getTelegramLinkUrl(token) };
  }

  // تلگرام وصل است → OTP بفرست از طریق phone-verify action
  const { sendPhoneOtp } = await import('@/actions/phone-verify');
  const res = await sendPhoneOtp({ phone });
  if (!res.success) {
    return { kind: 'error', message: res.message, retryAfterMs: res.retryAfterMs };
  }
  return { kind: 'sent', message: res.message };
}
