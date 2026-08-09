/**
 * GET /api/cron/telegram-notifications
 * هر دقیقه یک‌بار: صف اعلان تلگرام را خالی می‌کند.
 *
 * چرا: enqueue خودش processTelegramQueue را best-effort اجرا می‌کند، اما
 * پیام‌های retry (با backoff) و مواردی که در لحظهٔ enqueue پردازش نشدند،
 * باید توسط کرون برداشته شوند تا در نوسان شبکه از دست نروند.
 *
 * Auth: Authorization: Bearer {CRON_SECRET}
 */

import { verifyCronSecret } from '@/lib/cron-auth';
import { processTelegramQueue } from '@/lib/notifications/queue';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const t0 = Date.now();
  const { processed, failed } = await processTelegramQueue();

  return NextResponse.json({
    ok: true,
    processed,
    failed,
    durationMs: Date.now() - t0,
  });
}
