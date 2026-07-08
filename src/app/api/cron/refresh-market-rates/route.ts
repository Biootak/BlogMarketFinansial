// src/app/api/cron/refresh-market-rates/route.ts
import { NextResponse } from 'next/server';
import { revalidateTag } from '@/lib/revalidate';
import prisma from '@/lib/db';
import { verifyCronSecret } from '@/lib/cron-auth';
import { fetchTgjuLatest } from '@/lib/market-rates/tgju';
import { getUsdtRate } from '@/lib/market-rates/usdt';
import { getGlobalFxRates } from '@/lib/market-rates/fx';
import { writeMarketRatesSnapshot } from '@/lib/market-rates/snapshot';

const TAGS = {
  ticker: 'market-rates:ticker',
  list: 'market-rates:list',
};

function getUsdtPremiumPercent(): number {
  const raw = process.env.USDT_PREMIUM_PERCENT;
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 50) return 0;
  return n;
}

/**
 * POST /api/cron/refresh-market-rates
 * Auth: Bearer CRON_SECRET (constant-time, header only)
 * هر ۶۰s فراخوانی می‌شود.
 */
export async function POST(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const [tgjuResult, usdt, fx, autoRows] = await Promise.all([
    fetchTgjuLatest(),
    getUsdtRate(),
    getGlobalFxRates(),
    prisma.exchangeRate.findMany({
      where: { active: true, provider: 'auto' },
    }),
  ]);

  if (!tgjuResult.ok && !usdt && !fx) {
    return NextResponse.json(
      { error: 'ALL_SOURCES_FAILED', detail: 'TGJU + USDT + FX failed; DB unchanged' },
      { status: 502 },
    );
  }

  const tgjuMap = tgjuResult.ok && tgjuResult.data
    ? new Map(Object.entries(tgjuResult.data).map(([k, v]) => [k, { value: v.value, change: v.change }]))
    : new Map();

  let updated = 0, skipped = 0;
  const errors: { symbol: string; reason: string }[] = [];

  for (const row of autoRows) {
    let rawValue: number | null = null;
    let changePercent = 0;

    if (row.tgjuKey && tgjuMap.has(row.tgjuKey)) {
      const t = tgjuMap.get(row.tgjuKey)!;
      rawValue = t.value;
      changePercent = t.change;
    } else if (row.symbol === 'IRAN_USD' && usdt) {
      const premium = getUsdtPremiumPercent();
      rawValue = usdt.toman * (1 + premium / 100) * 10;
      changePercent = usdt.change;
    } else if (usdt && fx && row.symbol?.startsWith('IRAN_')) {
      const fxCode = row.symbol.replace('IRAN_', '').slice(0, 3);
      const perUsd = fx[fxCode];
      if (perUsd && perUsd > 0) {
        rawValue = (usdt.toman / perUsd) * 10;
      }
    }

    if (rawValue === null || !Number.isFinite(rawValue) || rawValue <= 0) {
      skipped++;
      errors.push({ symbol: row.symbol ?? row.currency, reason: 'no data from any source' });
      continue;
    }

    try {
      await prisma.exchangeRate.update({
        where: { id: row.id },
        data: { singleRate: rawValue.toString() },
      });
      updated++;
    } catch (e: unknown) {
      const err = e as { message?: string };
      errors.push({ symbol: row.symbol ?? row.currency, reason: err.message ?? 'unknown' });
    }
  }

  revalidateTag(TAGS.ticker);
  revalidateTag(TAGS.list);

  // snapshot JSON برای سایت اصلی (best-effort — اگه fail شود cron شکست نمی‌خورد).
  let snapshot: { count: number; path: string } | null = null;
  let snapshotError: string | null = null;
  try {
    const snap = await writeMarketRatesSnapshot();
    snapshot = { count: snap.count, path: snap.path };
  } catch (e) {
    snapshotError = e instanceof Error ? e.message : 'snapshot failed';
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[cron/refresh-market-rates] snapshot failed:', snapshotError);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      updated,
      skipped,
      errors,
      total: autoRows.length,
      tgjuOk: tgjuResult.ok,
      usdtOk: !!usdt,
      fxOk: !!fx,
      snapshot,
      snapshotError,
    },
  });
}

export async function GET() {
  return NextResponse.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
