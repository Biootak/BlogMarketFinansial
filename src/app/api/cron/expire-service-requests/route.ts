/**
 * GET /api/cron/expire-service-requests
 * هر ۵ دقیقه:
 *   ۱) سفارش‌های PENDING که قفل نرخشان + فرصت ۳۰ دقیقه گذشته → EXPIRED + ایمیل مشتری
 *   ۲) سفارش‌های PENDING که ضرب‌الاجل SLA آن‌ها گذشته → هشدار تلگرام ادمین (یک‌بار)
 * Auth: Authorization: Bearer {CRON_SECRET}
 */
import { expireStaleServiceRequests } from '@/actions/serviceRequestActions';
import { verifyCronSecret } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request): Promise<NextResponse> {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const t0 = Date.now();
  const { expired, escalated } = await expireStaleServiceRequests();

  return NextResponse.json({
    success: true,
    expired,
    escalated,
    durationMs: Date.now() - t0,
    ranAt: new Date().toISOString(),
  });
}
