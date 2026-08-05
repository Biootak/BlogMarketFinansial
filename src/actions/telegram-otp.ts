'use server';

/**
 * telegram-otp.ts — اتصال تلگرام کاربر برای دریافت OTP رایگان
 *
 * جریان:
 *   1. UI «اتصال تلگرام» را صدا می‌زند → توکن یک‌بارمصرف + لینک deep-link
 *   2. کاربر لینک را در تلگرام باز می‌کند → webhook chat_id را به حساب وصل می‌کند
 *   3. OTP های بعدی (تأیید شماره، تراکنش بالا، برداشت) به تلگرام می‌روند
 */

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
