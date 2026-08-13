/**
 * POST /api/cron/push-rates
 *
 * معماری جدید (2026-08-13):
 * scraping TGJU روی GitHub Actions انجام می‌شه (ماشین رایگان، بیرون از dyno)
 * و نتیجه به اینجا push می‌شه. Web dyno هیچ HTTP خروجی به TGJU نمی‌زنه.
 *
 * Auth: همان CRON_SECRET — فقط از GitHub Actions صدا زده می‌شه.
 *
 * Body: { rates: MarketRateItem[] }
 * Web dyno فقط:
 *   1. snapshot JSON می‌نویسه (همون که getMarketRates می‌خونه)
 *   2. DB update می‌کنه
 *   3. cache را bust می‌کنه
 */

import { primeMarketRatesCache } from '@/actions/market-rates';
import { verifyCronSecret } from '@/lib/cron-auth';
import prisma from '@/lib/db';
import type { MarketRateItem } from '@/lib/market-rates/types';
import { updateChangePercentBatch } from '@/lib/market-rates/change-cache';
import { writeMarketRatesSnapshot } from '@/lib/market-rates/snapshot';
import { revalidateTag } from '@/lib/revalidate';
import { NextResponse } from 'next/server';

const TAGS = { ticker: 'market-rates:ticker', list: 'market-rates:list' };

export async function POST(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  let items: MarketRateItem[];
  try {
    const body = await req.json();
    if (!Array.isArray(body?.rates) || body.rates.length === 0) {
      return NextResponse.json({ error: 'INVALID_BODY', detail: 'rates array required' }, { status: 400 });
    }
    items = body.rates as MarketRateItem[];
  } catch {
    return NextResponse.json({ error: 'PARSE_ERROR' }, { status: 400 });
  }

  // 1. cache صفحات را تازه کن (بدون scraping)
  await primeMarketRatesCache(items);

  // 2. snapshot برای getMarketRates (file read — بدون DB)
  let snapshotCount: number | null = null;
  try {
    const snap = await writeMarketRatesSnapshot({ items });
    snapshotCount = snap.count;
  } catch { /* best-effort */ }

  // 3. DB update (فقط provider='auto')
  let updated = 0;
  const changeUpdates: { symbol: string; changePercent: number }[] = [];
  const toUpdate = items.filter(i => i.provider === 'auto').map(item => ({
    item,
    rawValue: item.value * item.divisor,
  })).filter(({ rawValue }) => Number.isFinite(rawValue) && rawValue > 0);

  if (toUpdate.length > 0) {
    try {
      const results = await prisma.$transaction(
        toUpdate.map(({ item, rawValue }) =>
          prisma.exchangeRate.updateMany({
            where: { symbol: item.symbol, provider: 'auto', active: true },
            data: { singleRate: rawValue.toString(), lastChangePercent: item.changePercent, lastChangeAt: new Date() },
          }),
        ),
      );
      results.forEach((r, i) => {
        if (r.count > 0) {
          updated++;
          changeUpdates.push({ symbol: toUpdate[i].item.symbol, changePercent: toUpdate[i].item.changePercent });
        }
      });
    } catch { /* ignore — snapshot already written */ }
  }

  if (changeUpdates.length > 0) updateChangePercentBatch(changeUpdates);

  revalidateTag(TAGS.ticker);
  revalidateTag(TAGS.list);

  return NextResponse.json({ success: true, data: { received: items.length, updated, snapshotCount } });
}
