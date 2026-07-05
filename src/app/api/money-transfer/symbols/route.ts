/**
 * /api/money-transfer/symbols
 * ----------------------------------------------------------------------------
 * لیست ارزهای قابل تبدیل به همراه نرخ بازار و تغییر روزانه.
 * برای Currency Selector dropdown استفاده می‌شود.
 * ----------------------------------------------------------------------------
 */

import { assembleFreeMarketRates } from '@/lib/freeMarketRates';
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

async function buildSymbols(): Promise<{ items: SymbolItem[]; updatedAt: string }> {
  const market = await assembleFreeMarketRates();
  const items = market.items
    .filter((i) => i.symbol !== 'OUNCE_GOLD' && i.symbol !== 'ABSHODEH' && i.symbol !== 'GOLD18')
    .map((i) => ({
      symbol: i.symbol,
      displayNameFa: i.name,
      marketRateToman: i.priceToman,
      changePercent: i.change,
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
