// src/app/api/cron/refresh-market-rates/route.ts
//
// هر ۶۰s فراخوانی می‌شود.
// منطق: از assembleMarketRates() (single source of truth) نرخ می‌گیرد،
// در DB ذخیره می‌کند، snapshot JSON می‌نویسد، و cache را bust می‌کند.
//
// Auth: Bearer CRON_SECRET (constant-time, header only).

import { primeMarketRatesCache } from '@/actions/market-rates';
import { verifyCronSecret } from '@/lib/cron-auth';
import prisma from '@/lib/db';
import { type MarketRateItem, assembleMarketRates } from '@/lib/market-rates';
import { updateChangePercentBatch } from '@/lib/market-rates/change-cache';
import { writeMarketRatesSnapshot } from '@/lib/market-rates/snapshot';
import { revalidateTag } from '@/lib/revalidate';
import { NextResponse } from 'next/server';

const TAGS = {
  ticker: 'market-rates:ticker',
  list: 'market-rates:list',
};

/**
 * POST /api/cron/refresh-market-rates
 * Auth: Bearer CRON_SECRET (constant-time, header only)
 */
export async function POST(req: Request) {
  return handleRefresh(req);
}

// Vercel Cron (and most schedulers) issue GET requests, so we support both
// verbs behind the same CRON_SECRET-protected handler.
export async function GET(req: Request) {
  return handleRefresh(req);
}

async function handleRefresh(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  // assembleMarketRates = single source of truth: TGJU (all pages) → USDT → FX → manual DB.
  // این تنها جایی است که نرخ‌ها باید محاسبه شوند — نه اینکه منطق را تکرار کنیم.
  const items = await assembleMarketRates();

  if (items.length === 0) {
    return NextResponse.json(
      { error: 'ALL_SOURCES_FAILED', detail: 'assembleMarketRates returned empty array' },
      { status: 502 },
    );
  }

  // 2026-08-08-perf: نرخ‌های تازه را مستقیم در safeCache صفحات بریز تا
  // home/money-transfer همیشه از کش تازه بخوانند و هرگز منتظر scrape نمانند.
  await primeMarketRatesCache(items);

  // ذخیره نرخ‌های محاسبه‌شده در DB (فقط آیتم‌هایی که provider='auto')
  // با یک $transaction — قبلاً ۶۰ round-trip پشت‌سرهم بود (هر دقیقه).
  // فقط singleRate و changePercent به‌روز می‌شوند تا override های ادمین حفظ شوند.
  let updated = 0;
  let skipped = 0;
  const errors: { symbol: string; reason: string }[] = [];
  const changeUpdates: { symbol: string; changePercent: number }[] = [];

  const toUpdate: { item: MarketRateItem; rawValue: number }[] = [];
  for (const item of items) {
    if (item.provider !== 'auto') continue;
    // value در MarketRateItem = rawValue / divisor (به‌واحد unit). برای ذخیره ریال خام:
    // singleRate = value * divisor (چون assembler rawValue/divisor = value → rawValue = value*divisor)
    const rawValue = item.value * item.divisor;
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      skipped++;
      continue;
    }
    toUpdate.push({ item, rawValue });
  }

  if (toUpdate.length > 0) {
    const apply = (withChange: boolean) =>
      prisma.$transaction(
        toUpdate.map(({ item, rawValue }) =>
          prisma.exchangeRate.updateMany({
            where: { symbol: item.symbol, provider: 'auto', active: true },
            data: {
              singleRate: rawValue.toString(),
              ...(withChange
                ? { lastChangePercent: item.changePercent, lastChangeAt: new Date() }
                : {}),
            },
          }),
        ),
      );

    let results: Awaited<ReturnType<typeof apply>>;
    try {
      results = await apply(true);
    } catch {
      // ستون‌های change در این محیط migration نشده‌اند → فقط singleRate
      try {
        results = await apply(false);
      } catch (e) {
        const err = e as { message?: string };
        errors.push({ symbol: 'batch', reason: err.message ?? 'db error' });
        results = [];
      }
    }
    results.forEach((r, i) => {
      if (r.count > 0) {
        updated++;
        // جمع change percents برای ذخیره در cache (fallback)
        changeUpdates.push({
          symbol: toUpdate[i].item.symbol,
          changePercent: toUpdate[i].item.changePercent,
        });
      } else {
        skipped++;
      }
    });
  }

  // ذخیره change percents در cache (fallback if DB migration not applied)
  if (changeUpdates.length > 0) {
    updateChangePercentBatch(changeUpdates);
  }

  revalidateTag(TAGS.ticker);
  revalidateTag(TAGS.list);

  // snapshot JSON برای سایت اصلی (best-effort — اگه fail شود cron شکست نمی‌خورد).
  let snapshotCount: number | null = null;
  let snapshotError: string | null = null;
  try {
    // 2026-08-08: items از همین assemble — دیگر scrape دوباره نمی‌زند.
    const snap = await writeMarketRatesSnapshot({ items });
    snapshotCount = snap.count;
  } catch (e) {
    snapshotError = e instanceof Error ? e.message : 'snapshot failed';
  }

  return NextResponse.json({
    success: true,
    data: {
      assembled: items.length,
      updated,
      skipped,
      errors,
      snapshotCount,
      snapshotError,
    },
  });
}
