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

import { randomBytes } from 'node:crypto';
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
 * sendTelegramMessage — ارسال پیام به یک chat (بدون throw)
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return { success: false, errorCode: 'NOT_CONFIGURED' };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
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
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'used' | 'expired' | 'chat-linked' | 'db-error' };

/**
 * consumeTelegramLinkToken — webhook هنگام `/start link_<token>` صدا می‌زند.
 * توکن را burn می‌کند و telegramChatId کاربر را ست می‌کند.
 */
export async function consumeTelegramLinkToken(
  rawToken: string,
  chatId: string,
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
        data: { telegramChatId: chatId },
      }),
    ]);
    return { ok: true };
  } catch (err) {
    // P2002: chat قبلاً به کاربر دیگری وصل شده — unique(telegramChatId)
    if ((err as { code?: string }).code === 'P2002') {
      return { ok: false, reason: 'chat-linked' };
    }
    return { ok: false, reason: 'db-error' };
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
  return a.length === b.length && a.equals(b);
}

export const TELEGRAM_LINK_PREFIX = LINK_PREFIX;
