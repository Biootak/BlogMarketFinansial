/**
 * telegram.ts — Telegram Bot API wrapper (کانال رایگان تحویل OTP)
 *
 * چرا: در افغانستان SMS گران/محدود است (Twilio/Vonage پولی + ثبت Sender ID).
 * تلگرام تقریباً در همه‌جا استفاده می‌شود و Bot API کاملاً رایگان است.
 *
 * جریان اتصال:
 *   1. کاربر logged-in → getTelegramLink action → توکن یک‌بارمصرف
 *   2. کاربر `https://t.me/<bot>?start=link_<token>` را باز می‌کند
 *   3. webhook /api/telegram/webhook توکن را consume می‌کند و
 *      `User.telegramChatId` را ست می‌کند
 *   4. OTP بعدی به همان chat تلگرام ارسال می‌شود (رایگان)
 *
 * امنیت:
 *   - توکن اتصال: یک‌بارمصرف + انقضا ۱۵ دقیقه
 *   - webhook: secret header (X-Telegram-Bot-Api-Secret-Token) — fail-closed
 *   - هرگز throw نمی‌کند — نتیجه همیشه بازگردانده می‌شود
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/db';

const TELEGRAM_API = 'https://api.telegram.org';

const LINK_TOKEN_TTL_MS = 15 * 60 * 1000;
const LINK_PREFIX = 'link_';

export interface TelegramSendResult {
  success: boolean;
  /** کد خطا برای لاگ/پیام فارسی — نه جزئیات فنی */
  errorCode?: 'NOT_CONFIGURED' | 'NETWORK_ERROR' | 'TG_ERROR' | 'USER_BLOCKED';
}

/**
 * reply_markup — دکمهٔ «ارسال شماره تماس» (request_contact) یا کیبورد اینلاین.
 * تلگرام خودش شمارهٔ کاربر را تأیید کرده است — مبنای auto-verify.
 */
export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export type TelegramReplyMarkup =
  | { requestContact: true; text?: string }
  | { inlineKeyboard: TelegramInlineButton[][] };

/** لینک پورتال مشتری برای دکمه‌های اینلاین ربات */
export function getPortalUrl(path = '/customer/dashboard'): string {
  const base = process.env.APP_URL?.trim() || 'https://financialmarket.page';
  return `${base.replace(/\/$/, '')}${path}`;
}

/**
 * formatTelegramPhone — نمایش خوانای شمارهٔ E.164 در پیام‌های ربات.
 * `+989165200952` → `+98 916 520 0952` (کد کشور + گروه‌های ۳-۳-۴).
 */
export function formatTelegramPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length < 4) return e164;
  const cc = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `+${cc} ${rest}`;
  const groups: string[] = [];
  for (let i = 0; i < rest.length; i += 3) {
    if (rest.length - i <= 4) {
      groups.push(rest.slice(i));
      break;
    }
    groups.push(rest.slice(i, i + 3));
  }
  return `+${cc} ${groups.join(' ')}`;
}

/**
 * sendTelegramChatAction — نشانگر «در حال نوشتن» (typing) قبل از پاسخ ربات.
 * مطابق طراحی: بعد از دریافت شمارهٔ تماس، ربات چند لحظه typing نشان می‌دهد
 * و سپس نتیجه را می‌فرستد. بدون throw — همیشه نتیجه برمی‌گرداند.
 */
export async function sendTelegramChatAction(
  chatId: string,
  action: 'typing' = 'typing',
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { success: false, errorCode: 'NOT_CONFIGURED' };
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
    if (!res.ok) return { success: false, errorCode: 'TG_ERROR' };
    return { success: true };
  } catch {
    return { success: false, errorCode: 'NETWORK_ERROR' };
  }
}

/**
 * sendTelegramMessage — ارسال پیام به یک chat (بدون throw)
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return { success: false, errorCode: 'NOT_CONFIGURED' };
  }

  try {
    let reply_markup: unknown;
    if (replyMarkup && 'requestContact' in replyMarkup) {
      reply_markup = {
        keyboard: [
          [
            {
              text: replyMarkup.text ?? '📱 ارسال شماره تماس',
              request_contact: true,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
        input_field_placeholder: 'تأیید خودکار شماره',
      };
    } else if (replyMarkup && 'inlineKeyboard' in replyMarkup) {
      reply_markup = { inline_keyboard: replyMarkup.inlineKeyboard };
    }

    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(reply_markup ? { reply_markup } : {}),
      }),
    });

    if (!res.ok) {
      // 403: کاربر ربات را بلاک کرده یا هرگز Start نزده است
      if (res.status === 403) {
        return { success: false, errorCode: 'USER_BLOCKED' };
      }
      return { success: false, errorCode: 'TG_ERROR' };
    }
    return { success: true };
  } catch {
    return { success: false, errorCode: 'NETWORK_ERROR' };
  }
}

/**
 * createTelegramLinkToken — توکن یک‌بارمصرف اتصال برای کاربر
 */
export async function createTelegramLinkToken(userId: string): Promise<string> {
  // لینک‌های قبلی استفاده‌نشده همین کاربر را باطل کن — فقط آخرین لینک معتبر است.
  // (جلوگیری از «لینک اتصال نامعتبر است» وقتی کاربر لینک قدیمی را باز می‌کند)
  await prisma.telegramLinkToken.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });
  const token = `${LINK_PREFIX}${randomBytes(18).toString('hex')}`;
  await prisma.telegramLinkToken.create({
    data: {
      token,
      userId,
      used: false,
      expiresAt: new Date(Date.now() + LINK_TOKEN_TTL_MS),
    },
  });
  return token;
}

/** username ربات برای deep-link — از env TELEGRAM_BOT_USERNAME */
export function getTelegramBotUsername(): string {
  return process.env.TELEGRAM_BOT_USERNAME?.trim() ?? '';
}

/**
 * getTelegramLinkUrl — لینک اتصال یک‌بارمصرف.
 * اگر username ربات تنظیم نشده باشد → رشته خالی (UI باید error نشان دهد).
 */
export function getTelegramLinkUrl(token: string): string {
  const username = getTelegramBotUsername();
  if (!username) return '';
  return `https://t.me/${username}?start=${token}`;
}

export type ConsumeLinkResult =
  | { ok: true; pendingPhone: string | null; accountName: string | null }
  | { ok: false; reason: 'not-found' | 'used' | 'expired' | 'chat-linked' | 'db-error' };

/**
 * consumeTelegramLinkToken — webhook هنگام `/start link_<token>` صدا می‌زند.
 * توکن را burn می‌کند و telegramChatId + telegramUserId کاربر را ست می‌کند.
 *
 * سرعت: pendingPhone و accountName را همان‌جا برمی‌گرداند تا وبهوک برای ارسال
 * دکمهٔ «ارسال شماره تماس» یک کوئری جداگانه نزند (کمتر round-trip → سریع‌تر).
 *
 * امنیت: telegramUserId (از from.id همان update) ثبت می‌شود تا تأیید شمارهٔ تماس
 * فقط از همان حساب تلگرام پذیرفته شود (مقایسه با contact.user_id در وبهوک).
 */
export async function consumeTelegramLinkToken(
  rawToken: string,
  chatId: string,
  fromId?: string,
): Promise<ConsumeLinkResult> {
  const token = rawToken.trim();
  if (!token.startsWith(LINK_PREFIX)) {
    return { ok: false, reason: 'not-found' };
  }

  try {
    const record = await prisma.telegramLinkToken.findUnique({ where: { token } });
    if (!record) return { ok: false, reason: 'not-found' };
    if (record.used) return { ok: false, reason: 'used' };
    if (record.expiresAt < new Date()) return { ok: false, reason: 'expired' };

    await prisma.$transaction([
      prisma.telegramLinkToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: {
          telegramChatId: chatId,
          ...(fromId ? { telegramUserId: fromId } : {}),
        },
      }),
    ]);

    // شماره و نام حسابِ در انتظار را همان‌جا بخوان — وبهوک کوئری دوم نمی‌زند
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { pendingPhone: true, name: true, email: true },
    });
    const accountName = user?.name?.trim() || user?.email || null;
    return { ok: true, pendingPhone: user?.pendingPhone ?? null, accountName };
  } catch (err) {
    // P2002: chat قبلاً به کاربر دیگری وصل شده — unique(telegramChatId)
    if ((err as { code?: string }).code === 'P2002') {
      return { ok: false, reason: 'chat-linked' };
    }
    return { ok: false, reason: 'db-error' };
  }
}

/**
 * answerTelegramCallback — تأیید فوری لمس دکمهٔ اینلاین (بدون throw).
 * پاسخ سریع به callback_query باعث می‌شود تلگرام اسپینر دکمه را فوراً بردارد.
 */
export async function answerTelegramCallback(
  callbackQueryId: string,
  text?: string,
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { success: false, errorCode: 'NOT_CONFIGURED' };
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        ...(text ? { text, show_alert: false } : {}),
      }),
    });
    if (!res.ok) return { success: false, errorCode: 'TG_ERROR' };
    return { success: true };
  } catch {
    return { success: false, errorCode: 'NETWORK_ERROR' };
  }
}

/**
 * editTelegramMessage — ویرایش پیام موجود (برای منوی دکمه‌ای بدون اسپم پیام).
 * سبک‌تر از send + delete است و تجربهٔ کاربری تمیزتری می‌دهد.
 */
export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { success: false, errorCode: 'NOT_CONFIGURED' };
  try {
    let reply_markup: unknown;
    if (replyMarkup && 'inlineKeyboard' in replyMarkup) {
      reply_markup = { inline_keyboard: replyMarkup.inlineKeyboard };
    }
    const res = await fetch(`${TELEGRAM_API}/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(reply_markup ? { reply_markup } : {}),
      }),
    });
    if (!res.ok) return { success: false, errorCode: 'TG_ERROR' };
    return { success: true };
  } catch {
    return { success: false, errorCode: 'NETWORK_ERROR' };
  }
}

/**
 * isTelegramWebhookSecretValid — fail-closed: بدون TELEGRAM_WEBHOOK_SECRET
 * هیچ update ای پذیرفته نمی‌شود.
 */
export function isTelegramWebhookSecretValid(secret: string | null | undefined): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected || !secret) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  // constant-time compare — prevent timing oracle attacks (same pattern as cron-auth.ts)
  return timingSafeEqual(a, b);
}

export const TELEGRAM_LINK_PREFIX = LINK_PREFIX;
