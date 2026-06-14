'use server';

/**
 * Ticker data loader — دیتای نوار بالای Header
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
 */

import { unstable_cache } from 'next/cache';
import { fetchExchangeRates } from '@/actions/fetchExchangeRates';
import prisma from '@/lib/db';
import type { TickerItem } from '@/components/Header/TickerBar';

function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Internal fetch function — not cached, called by the wrapper.
async function fetchTickerData(): Promise<TickerItem[]> {
  const items: TickerItem[] = [];

  // 1. Crypto rates
  try {
    const ratesResult = await fetchExchangeRates();
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
          value: formatNumber(parseFloat(value), 0),
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
// `src/lib/exchange-rates.ts` (fetch with revalidate: 60), so a 60s TTL
// here is fine and acts as the second layer.
const getCachedTickerData = unstable_cache(
  fetchTickerData,
  ['ticker-data', 'v1-2026-06-14'],
  {
    revalidate: 60, // 1 minute
    tags: ['ticker', 'exchange-rates'],
  },
);

export const getTickerData = async (): Promise<TickerItem[]> => {
  return getCachedTickerData();
};
