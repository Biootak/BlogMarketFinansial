import { getTrustedClientIp } from '@/lib/client-ip';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import type { NextRequest } from 'next/server';

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 min — cron fires every 10 min.

// M1 fix: use the spoof-resistant client IP resolver.
function getClientIp(request: NextRequest): string {
  return getTrustedClientIp(request);
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
        process.env.HEROKU_SLUG_COMMIT ??
        process.env.SOURCE_VERSION ??
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
