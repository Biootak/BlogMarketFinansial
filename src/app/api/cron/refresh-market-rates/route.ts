// src/app/api/cron/refresh-market-rates/route.ts
//
// هر ۶۰s فراخوانی می‌شود.
// منطق: از assembleMarketRates() (single source of truth) نرخ می‌گیرد،
// در DB ذخیره می‌کند، snapshot JSON می‌نویسد، و cache را bust می‌کند.
//
// Auth: Bearer CRON_SECRET (constant-time, header only).

import { verifyCronSecret } from '@/lib/cron-auth';
import prisma from '@/lib/db';
import { assembleMarketRates } from '@/lib/market-rates';
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

  // ذخیره نرخ‌های محاسبه‌شده در DB (fqr آیتم‌هایی که provider='auto').
  // فقط singleRate و changePercent را به‌روز می‌کنیم تا override های ادمین حفظ شوند.
  let updated = 0;
  let skipped = 0;
  const errors: { symbol: string; reason: string }[] = [];

  for (const item of items) {
    if (item.provider !== 'auto') continue;
    // value در MarketRateItem = rawValue / divisor (به‌واحد unit). برای ذخیره ریال خام:
    // singleRate = value * divisor (چون assembler rawValue/divisor = value → rawValue = value*divisor)
    const rawValue = item.value * item.divisor;
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      skipped++;
      continue;
    }
    try {
      const affected = await prisma.exchangeRate.updateMany({
        where: { symbol: item.symbol, provider: 'auto', active: true },
        data: { singleRate: rawValue.toString() },
      });
      if (affected.count > 0) {
        updated++;
      } else {
        skipped++;
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      errors.push({ symbol: item.symbol, reason: err.message ?? 'unknown' });
    }
  }

  revalidateTag(TAGS.ticker);
  revalidateTag(TAGS.list);

  // snapshot JSON برای سایت اصلی (best-effort — اگه fail شود cron شکست نمی‌خورد).
  let snapshotCount: number | null = null;
  let snapshotError: string | null = null;
  try {
    const snap = await writeMarketRatesSnapshot();
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
