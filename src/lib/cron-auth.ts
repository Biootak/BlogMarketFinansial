import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

/**
 * Centralized CRON auth.
 *
 * M2/M3 fixes:
 *  - Compare secrets with a constant-time `timingSafeEqual` to remove the
 *    byte-by-byte timing oracle against CRON_SECRET.
 *  - Only accept the `Authorization: Bearer <CRON_SECRET>` header. Query
 *    string (`?secret=`) and `x-cron-secret` variants are rejected because
 *    secrets in URLs land in proxy/load-balancer logs, browser history and
 *    Referer headers.
 *  - Fail closed (503) when CRON_SECRET is unset.
 *
 * Returns a 401/503 response on failure, or `null` when authorized.
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!provided) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Pad to equal length so timingSafeEqual never throws on a length mismatch.
  const len = Math.max(a.length, b.length);
  const pa = Buffer.alloc(len, 0).fill(a);
  const pb = Buffer.alloc(len, 0).fill(b);

  let equal = false;
  try {
    equal = timingSafeEqual(pa, pb);
  } catch {
    equal = false;
  }

  if (!equal) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  return null;
}
