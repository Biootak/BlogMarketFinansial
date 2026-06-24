import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';

/**
 * Public health probe used by the dashboard's SystemHealth rail.
 *
 * No auth required — the dashboard layout already gates the page, so an
 * anonymous probe from the browser is safe. The route is rate-limited via
 * the `api` bucket (100/min) so a tight loop can't hammer the DB.
 *
 * Response shape:
 *   {
 *     ok: boolean,
 *     db: 'ok' | 'fail',
 *     dbLatencyMs: number,
 *     bazaar: 'ok' | 'stale' | 'unknown' | 'fail',
 *     bazaarAt: string | null,        // ISO of last ExchangeRate update
 *     bazaarAgeMs: number | null,
 *     build: { env, sha, version },
 *     serverTime: string              // ISO
 *   }
 */


const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 min — cron fires every 10 min.

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`health-dashboard:${ip}`, 'api');
  if (!rl.success) {
    return Response.json(
      { ok: false, error: 'rate_limited' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))),
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  }

  const result = {
    ok: true,
    db: 'ok' as 'ok' | 'fail',
    dbLatencyMs: 0,
    bazaar: 'unknown' as 'ok' | 'stale' | 'unknown' | 'fail',
    bazaarAt: null as string | null,
    bazaarAgeMs: null as number | null,
    build: {
      env: process.env.NODE_ENV ?? 'development',
      sha:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.GIT_COMMIT ??
        process.env.NEXT_PUBLIC_GIT_SHA ??
        null,
      version: process.env.npm_package_version ?? '0.0.0',
    },
    serverTime: new Date().toISOString(),
  };

  // ---- DB probe ----
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.dbLatencyMs = Date.now() - t0;
  } catch {
    result.ok = false;
    result.db = 'fail';
  }

  // ---- Bazaar last-sync probe ----
  // Most recently updated ExchangeRate row = the last successful cron sync.
  // Failures here do not mark the whole system down (dashboard still reads
  // fine), they only downgrade the bazaar signal.
  if (result.ok) {
    try {
      const latest = await prisma.exchangeRate.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });
      if (latest?.updatedAt) {
        result.bazaarAt = latest.updatedAt.toISOString();
        const age = Date.now() - latest.updatedAt.getTime();
        result.bazaarAgeMs = age;
        result.bazaar = age <= STALE_THRESHOLD_MS ? 'ok' : 'stale';
      } else {
        result.bazaar = 'unknown';
      }
    } catch {
      result.bazaar = 'fail';
    }
  }

  return Response.json(result, {
    status: result.ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Health-Source': 'dashboard',
    },
  });
}