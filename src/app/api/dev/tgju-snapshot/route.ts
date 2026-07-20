/**
 * GET /api/dev/tgju-snapshot
 * ----------------------------------------------------------------------------
 * Dev-only endpoint: scrape همه‌ی صفحات TGJU و JSON نتیجه را برمی‌گرداند.
 * فقط وقتی `process.env.NODE_ENV !== 'production'` در دسترس است.
 * ----------------------------------------------------------------------------
 */

import { auth } from '@/auth';
import { ALL_TGJU_PAGE_IDS, type TgjuPageId, fetchAllTgjuPages } from '@/lib/market-rates/tgju';
import { Role } from '@prisma/client';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PageSnapshot {
  page: TgjuPageId;
  ok: boolean;
  itemCount?: number;
  error?: string;
  status?: number;
  latencyMs?: number;
  /** همه‌ی کلیدها برای visual report. */
  items: Array<{ key: string; value: number; change: number; displayNameFa?: string }>;
}

const DISPLAY_FA_HINT: Record<string, string> = {
  transfer_usd: 'حواله دلار (شرکتی)',
  transfer_usd2: 'حواله دلار (شخصی)',
  transfer_eur: 'حواله یورو',
  transfer_aed: 'حواله درهم',
  bank_usd: 'دلار (بانکی)',
  bank_eur: 'یورو (بانکی)',
  sana_buy_usd: 'صرافی ملی: خرید دلار',
  sana_sell_usd: 'صرافی ملی: فروش دلار',
  sana_buy_eur: 'صرافی ملی: خرید یورو',
  bubble_emami: 'حباب سکه امامی',
  bubble_bahar: 'حباب سکه بهار',
  bubble_nim: 'حباب نیم سکه',
  bubble_rob: 'حباب ربع سکه',
  bubble_gerami: 'حباب سکه گرمی',
  coin_sekee: 'سکه امامی',
  coin_sekeb: 'سکه بهار آزادی',
  coin_nim: 'نیم سکه',
  coin_rob: 'ربع سکه',
  coin_gerami: 'سکه گرمی',
  global_ons: 'انس طلا (USD/oz)',
  global_silver: 'انس نقره',
  global_platinum: 'انس پلاتین',
  global_palladium: 'انس پالادیوم',
  currency_price_dollar_rl: 'دلار بازار آزاد',
  currency_price_eur: 'یورو بازار آزاد',
  currency_price_afn: 'افغانی',
  currency_price_aed: 'درهم بازار آزاد',
};

export async function GET(_request: NextRequest): Promise<NextResponse> {
  // L1b fix: dev-only endpoint must still require an OWNER session, otherwise
  // (if NODE_ENV is ever flipped to development) it would scrape and return
  // internal market data to anyone without a login.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev-only' }, { status: 404 });
  }
  const session = await auth();
  const role = session?.user?.role as Role | undefined;
  if (role !== Role.OWNER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const t0 = Date.now();
  const pages = await fetchAllTgjuPages();

  const snapshot: Record<string, PageSnapshot> = {};
  let totalItems = 0;
  let okPages = 0;

  for (const pageId of ALL_TGJU_PAGE_IDS) {
    const r = pages[pageId];
    const items = r.data ? Object.entries(r.data) : [];
    const itemsOut = items
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        key,
        value: v.value,
        change: v.change,
        ...(DISPLAY_FA_HINT[key] ? { displayNameFa: DISPLAY_FA_HINT[key] } : {}),
      }));

    snapshot[pageId] = {
      page: pageId,
      ok: r.ok,
      itemCount: r.itemCount,
      error: r.error,
      status: r.status,
      latencyMs: r.latencyMs,
      items: itemsOut,
    };

    if (r.ok && r.itemCount) {
      totalItems += r.itemCount;
      okPages++;
    }
  }

  return NextResponse.json({
    ok: okPages > 0,
    summary: {
      pages: ALL_TGJU_PAGE_IDS.length,
      okPages,
      totalItems,
      durationMs: Date.now() - t0,
    },
    pages: snapshot,
  });
}
