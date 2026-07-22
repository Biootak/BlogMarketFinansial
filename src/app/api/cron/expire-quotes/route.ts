/**
 * GET /api/cron/expire-quotes
 * هر ۵ دقیقه: quote های ACTIVE که expiresAt آن‌ها گذشته را به EXPIRED تبدیل می‌کند.
 * Auth: Authorization: Bearer {CRON_SECRET}
 *
 * M2/M3-fix: از verifyCronSecret (constant-time compare) استفاده می‌شود —
 * string comparison مستقیم timing oracle دارد.
 */
import { expireQuotes } from '@/actions/exchange-quotes';
import { verifyCronSecret } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request): Promise<NextResponse> {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const t0 = Date.now();
  const { expired } = await expireQuotes();

  return NextResponse.json({
    success: true,
    expired,
    durationMs: Date.now() - t0,
    ts: new Date().toISOString(),
  });
}
