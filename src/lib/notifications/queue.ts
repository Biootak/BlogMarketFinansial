/**
 * notifications/queue.ts — صف اعلان تلگرام (retry + dedupe)
 * ----------------------------------------------------------------------------
 * چرا: فایر‌اند‌فورگت قبلی در نوسان شبکه، پیام را از دست می‌داد. این صف پیام را
 * در DB نگه می‌دارد، با backoff تلاش دوباره می‌کند و موارد تکراری (in-flight)
 * را با dedupeKey یکتا حذف می‌کند.
 *
 * جریان:
 *   ۱. enqueueTelegramNotification → رکورد pending در TelegramNotification
 *   ۲. processTelegramQueue → claim اتمیک (FOR UPDATE SKIP LOCKED) + ارسال
 *   ۳. خطا → status=retry با nextAttemptAt = backoff نمایی (۳۰s, ۱m, ۲m, ۴m, ۸m)
 *   ۴. بعد از maxAttempts یا خطای دائمی (بدون توکن / بلاک) → status=dead
 *   ۵. cron هر دقیقه + اجرای best-effort بعد از enqueue، موارد معلق را برمی‌دارد
 *
 * dedupe:
 *   - dedupeKey یکتاست تا وقتی رکورد terminal شود (pending/retry/processing)
 *   - بعد از sent/dead/failed، dedupeKey پاک می‌شود تا رویداد جدید همان‌کِی
 *     دوباره قابل enqueue باشد (dedupe فقط برای تکراری‌های در حال ارسال است)
 *
 * امنیت/همزمانی:
 *   - claim با FOR UPDATE SKIP LOCKED → چند اینستنس هم‌زمان یک پیام را
 *     دوبار نمی‌فرستند
 *   - claimهای قدیمی‌تر از ۲ دقیقه (کرش کارگر وسط ارسال) دوباره pending می‌شوند
 *   - هیچ‌کدام از توابع throw نمی‌کنند — صف نباید عملیات اصلی را مختل کند
 */

import prisma from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import type { TelegramReplyMarkup } from '@/lib/telegram';
import { Prisma } from '@prisma/client';

export type TelegramNotificationStatus =
  | 'pending'
  | 'processing'
  | 'retry'
  | 'sent'
  | 'failed'
  | 'dead';

export type TelegramSendErrorCode =
  | 'NOT_CONFIGURED'
  | 'NETWORK_ERROR'
  | 'TG_ERROR'
  | 'USER_BLOCKED'
  | undefined;

const DEFAULT_MAX_ATTEMPTS = 5;
/** backoff پایه: ۳۰ ثانیه → تلاش‌ها ۳۰s, ۱m, ۲m, ۴m, ۸m (مجموع ~۱۵ دقیقه) */
const BASE_RETRY_MS = 30_000;
/** حداکثر پیام در هر اجرای کارگر */
const CLAIM_BATCH = 20;
/** claimی که بیشتر از این مدت در processing مانده (کرش کارگر) → آزاد می‌شود */
const CLAIM_TIMEOUT_MS = 2 * 60_000;

export interface EnqueueTelegramInput {
  chatId: string;
  text: string;
  replyMarkup?: TelegramReplyMarkup;
  /**
   * dedupeKey — اگر رویدادی با همین کلید در حال ارسال/انتظار باشد، enqueue
   * نادیده گرفته می‌شود (deduped=true). کلیدهای طبیعی: «eventType:id».
   */
  dedupeKey?: string;
  maxAttempts?: number;
}

export interface EnqueueTelegramResult {
  success: boolean;
  /** آیا به‌خاطر وجود نمونهٔ مشابه در صف نادیده گرفته شد؟ */
  deduped?: boolean;
  id?: string;
}

/**
 * enqueueTelegramNotification — ثبت پیام در صف (سریع؛ بدون ارسال هم‌زمان).
 * بعد از ثبت، processTelegramQueue به‌صورت best-effort و غیرهم‌زمان اجرا می‌شود.
 */
export async function enqueueTelegramNotification(
  input: EnqueueTelegramInput,
): Promise<EnqueueTelegramResult> {
  try {
    const created = await prisma.telegramNotification.create({
      data: {
        chatId: input.chatId,
        text: input.text,
        replyMarkup: (input.replyMarkup ?? undefined) as Prisma.InputJsonValue | undefined,
        dedupeKey: input.dedupeKey ?? null,
        maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      },
      select: { id: true },
    });

    // اجرای فوری best-effort — claim اتمیک است، چند اینستنس امن می‌ماند
    void processTelegramQueue();
    return { success: true, id: created.id };
  } catch (err) {
    // P2002: dedupeKey تکراری — همان رویداد هنوز در صف است → نادیده بگیر
    if ((err as { code?: string }).code === 'P2002') {
      return { success: false, deduped: true };
    }
    return { success: false };
  }
}

/**
 * processTelegramQueue — یک batch از پیام‌های موعدرسیده را برمی‌دارد و می‌فرستد.
 * امن برای چند اینستنس هم‌زمان (claim اتمیک). هرگز throw نمی‌کند.
 */
export async function processTelegramQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  const result = { processed: 0, failed: 0 };
  try {
    // ۱) آزادسازی claimهای گیر کرده (کارگر وسط ارسال کرش کرده)
    await prisma.telegramNotification.updateMany({
      where: {
        status: 'processing',
        updatedAt: { lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) },
      },
      data: { status: 'pending' },
    });

    // ۲) claim اتمیک یک batch — FOR UPDATE SKIP LOCKED جلوی ارسال دوباره را می‌گیرد
    const claimedIds = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM "TelegramNotification"
          WHERE status = 'pending' AND "nextAttemptAt" <= now()
          ORDER BY "createdAt" ASC
          LIMIT ${CLAIM_BATCH}
          FOR UPDATE SKIP LOCKED`,
      );
      if (rows.length === 0) return [] as string[];
      await tx.telegramNotification.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { status: 'processing' },
      });
      return rows.map((r) => r.id);
    });

    if (claimedIds.length === 0) return result;

    const items = await prisma.telegramNotification.findMany({
      where: { id: { in: claimedIds } },
      select: {
        id: true,
        chatId: true,
        text: true,
        replyMarkup: true,
        attempts: true,
        maxAttempts: true,
      },
    });

    for (const item of items) {
      const sendResult = await sendTelegramMessage(
        item.chatId,
        item.text,
        item.replyMarkup as TelegramReplyMarkup | undefined,
      );

      if (sendResult.success) {
        result.processed += 1;
        await prisma.telegramNotification.update({
          where: { id: item.id },
          data: { status: 'sent', sentAt: new Date(), lastError: null, dedupeKey: null },
        });
        continue;
      }

      result.failed += 1;
      const attempts = item.attempts + 1;
      const permanent =
        sendResult.errorCode === 'NOT_CONFIGURED' || sendResult.errorCode === 'USER_BLOCKED';
      const exhausted = attempts >= item.maxAttempts;

      if (permanent || exhausted) {
        await prisma.telegramNotification.update({
          where: { id: item.id },
          data: { status: 'dead', lastError: sendResult.errorCode ?? 'UNKNOWN', dedupeKey: null },
        });
      } else {
        const delayMs = BASE_RETRY_MS * 2 ** (attempts - 1);
        await prisma.telegramNotification.update({
          where: { id: item.id },
          data: {
            status: 'retry',
            attempts,
            nextAttemptAt: new Date(Date.now() + delayMs),
            lastError: sendResult.errorCode ?? 'UNKNOWN',
          },
        });
      }
    }
  } catch {
    // best-effort — خطای صف هرگز نباید بیرون برود
  }
  return result;
}
