'use server';

/**
 * getHeaderTickerData — دیتای نوار بالای Header
 *
 * ترکیب:
 * - نرخ ارزهای دیجیتال از Exir API (fallback به mock در صورت خطا)
 * - نرخ طلا/ارز از دیتابیس
 *
 * 2026-06-14: Replaced `react.cache` (per-request only) with
 * `unstable_cache` (Data Cache, 60s TTL, tag-invalidated). Header is
 * rendered on every layout pass, so the per-request memoization was
 * useless across navigations. Tags let admin edits bust the cache
 * immediately.
 *
 * 2026-06-20: rename از `getTickerData` → `getHeaderTickerData` تا
 * جایگاه استفاده (Header) در نام واضح باشد. نوع `TickerItem` از
 * کامپوننت UI به `src/types/types.ts` به‌عنوان `HeaderTickerItem`
 * منتقل شد (domain type نباید در UI باشد).
 */

import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import prisma from '@/lib/db';
import type { HeaderTickerItem } from '@/types/types';
import { unstable_cache } from 'next/cache';

function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Internal fetch function — not cached, called by the wrapper.
async function fetchHeaderTickerData(): Promise<HeaderTickerItem[]> {
  const items: HeaderTickerItem[] = [];

  // 1. Crypto rates
  try {
    const ratesResult = await fetchCryptoTickerRates();
    if (ratesResult.success && ratesResult.data) {
      const topCryptos = ratesResult.data.slice(0, 8);
      for (const rate of topCryptos) {
        items.push({
          id: `crypto-${rate.symbol}`,
          name: rate.symbol,
          symbol: '/USDT',
          value: formatNumber(rate.usdtPrice, rate.usdtPrice < 10 ? 4 : 2),
          change: rate.change,
        });
      }
    }
  } catch {
    // silent — تیکر اختیاریه
  }

  // 2. Exchange rates (طلا، ارز) از دیتابیس
  try {
    const dbRates = await prisma.exchangeRate.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    for (const rate of dbRates) {
      const value = rate.buyRate || rate.singleRate;
      if (value) {
        items.push({
          id: `rate-${rate.id}`,
          name: rate.name,
          symbol: rate.currency,
          value: formatNumber(Number.parseFloat(value), 0),
        });
      }
    }
  } catch {
    // silent
  }

  return items;
}

// 2026-06-14: Data Cache wrapper. Tags: 'ticker' for any admin edit to
// ExchangeRate rows, 'ticker-crypto' if/when we bust the crypto leg
// independently. The crypto leg is already cached inside
// `src/lib/exir-crypto-rates.ts` (fetch with revalidate: 60), so a 60s TTL
// here is fine and acts as the second layer.
const getCachedHeaderTickerData = unstable_cache(
  fetchHeaderTickerData,
  ['header-ticker-data', 'v2-renamed-2026-06-20'],
  {
    revalidate: 60, // 1 minute
    tags: ['market-rates:ticker', 'market-rates:exchange-rates'],
  },
);

export const getHeaderTickerData = async (): Promise<HeaderTickerItem[]> => {
  return getCachedHeaderTickerData();
};
