/**
 * GET /api/cron/expire-quotes
 * هر ۵ دقیقه: quote های ACTIVE که expiresAt آن‌ها گذشته را به EXPIRED تبدیل می‌کند.
 * Auth: Authorization: Bearer {CRON_SECRET}
 */
import { expireQuotes } from '@/actions/exchange-quotes';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request): Promise<NextResponse> {
  // auth check — همان الگوی سایر cron های پروژه
  const authHeader = req.headers.get('Authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  const { expired } = await expireQuotes();

  return NextResponse.json({
    success: true,
    expired,
    durationMs: Date.now() - t0,
    ts: new Date().toISOString(),
  });
}
