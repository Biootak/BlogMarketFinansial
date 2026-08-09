/**
 * notifications/telegram-user.ts — اعلان به تلگرامِ خودِ کاربر (نه ادمین)
 * ----------------------------------------------------------------------------
 * وعدهٔ طراحی: «کدهای امنیتی و اعلان‌های حساب به همین گفتگو ارسال می‌شوند».
 *
 * این ماژول اعلان‌های پیش‌فعال حساب را به chat تلگرامی که کاربر با /start
 * به حساب وصل کرده می‌فرستد — مثل تأیید/رد KYC یا تغییر وضعیت تراکنش.
 *
 * تحویل: پیام در صف persistent (notifications/queue.ts) ثبت می‌شود تا در
 * نوسان شبکه از دست نرود (retry با backoff + dedupe). این توابع فقط chatId
 * را پیدا می‌کنند و enqueue می‌کنند — هرگز throw نمی‌کنند و فراخوان را بلاک
 * نمی‌کنند. اگر کاربر تلگرام وصل نکرده باشد → سکوت (تلگرام اختیاری است).
 */

import prisma from '@/lib/db';
import { enqueueTelegramNotification } from '@/lib/notifications/queue';
import type { TelegramReplyMarkup } from '@/lib/telegram';

export interface TelegramNotifyOpts {
  /**
   * dedupeKey — جلوگیری از ارسال دوبارهٔ همان رویداد (مثلاً دابل‌کلیک یا
   * retry وب‌هوک). پیشنهاد: «eventType:entityId».
   */
  dedupeKey?: string;
}

/**
 * notifyTelegramUser — اعلان به chat تلگرامِ کاربر (از userId).
 * اگر کاربر لینک تلگرام نداشته باشد بی‌صدا برمی‌گردد.
 */
export async function notifyTelegramUser(
  userId: string,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
  opts?: TelegramNotifyOpts,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    if (!user?.telegramChatId) return;
    await enqueueTelegramNotification({
      chatId: user.telegramChatId,
      text,
      replyMarkup,
      dedupeKey: opts?.dedupeKey,
    });
  } catch {
    // best-effort — اعلان تلگرام نباید عملیات اصلی را مختل کند
  }
}

/**
 * notifyTelegramCustomer — اعلان به تلگرامِ صاحب یک Customer (از customerId).
 * برای جریان‌هایی که فقط customerId در دسترس است (مثل تراکنش‌های مالی).
 */
export async function notifyTelegramCustomer(
  customerId: string,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
  opts?: TelegramNotifyOpts,
): Promise<void> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { userId: true },
    });
    if (!customer?.userId) return;
    await notifyTelegramUser(customer.userId, text, replyMarkup, opts);
  } catch {
    // best-effort
  }
}
