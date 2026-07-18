/**
 * /api/money-transfer/symbols
 * ----------------------------------------------------------------------------
 * لیست ارزهای قابل تبدیل به همراه نرخ بازار و تغییر روزانه.
 * برای Currency Selector dropdown استفاده می‌شود.
 * ----------------------------------------------------------------------------
 */

import { assembleMarketRates } from '@/lib/market-rates';
import { safeCache } from '@/lib/safe-cache';
import { NextResponse } from 'next/server';

interface SymbolItem {
  symbol: string;
  displayNameFa: string;
  marketRateToman: number;
  changePercent: number;
}

const FALLBACK: { items: SymbolItem[]; updatedAt: string } = {
  items: [],
  updatedAt: new Date(0).toISOString(),
};

// گروه‌هایی که نباید در انتخاب ارز مبدأ حواله نمایش داده شوند
const EXCLUDED_GROUPS = new Set(['global']);

async function buildSymbols(): Promise<{ items: SymbolItem[]; updatedAt: string }> {
  const rates = await assembleMarketRates();
  const items: SymbolItem[] = rates
    .filter((r) => !EXCLUDED_GROUPS.has(r.group) && r.unit === 'toman')
    .map((r) => ({
      symbol: r.symbol,
      displayNameFa: r.displayNameFa,
      marketRateToman: r.value,
      changePercent: r.changePercent,
    }));
  return { items, updatedAt: new Date().toISOString() };
}

const getCachedSymbols = safeCache(buildSymbols, FALLBACK, {
  key: 'money-transfer:symbols',
  ttl: 60,
  tags: ['exchange-rates', 'money-transfer'],
});

export async function GET() {
  try {
    const data = await getCachedSymbols();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطای نامشخص';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL', message },
      },
      { status: 500 },
    );
  }
}
