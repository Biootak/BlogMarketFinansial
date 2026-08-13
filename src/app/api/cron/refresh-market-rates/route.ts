// src/app/api/cron/refresh-market-rates/route.ts
//
// 2026-08-13: این endpoint حالا فقط برای backward-compatibility نگه داشته شده.
// معماری جدید: scraping روی GitHub Actions انجام می‌شه و نتیجه به
// /api/cron/push-rates push می‌شه. این endpoint دیگر assembleMarketRates
// صدا نمی‌زنه — فقط آخرین snapshot را برمی‌گردونه.
//
// Auth: Bearer CRON_SECRET

import { verifyCronSecret } from '@/lib/cron-auth';
import { readMarketRatesSnapshot } from '@/lib/market-rates/snapshot-reader';
import { NextResponse } from 'next/server';

export async function POST(req: Request) { return handleRefresh(req); }
export async function GET(req: Request) { return handleRefresh(req); }

async function handleRefresh(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  // فقط وضعیت snapshot را برمی‌گردونه — بدون scraping
  const snap = await readMarketRatesSnapshot();
  return NextResponse.json({
    success: true,
    data: {
      note: 'Scraping moved to GitHub Actions. Use /api/cron/push-rates to update rates.',
      snapshotItems: snap?.items.length ?? 0,
      snapshotAge: snap?.generatedAt
        ? Math.round((Date.now() - snap.generatedAt.getTime()) / 1000) + 's'
        : 'unknown',
    },
  });
}
