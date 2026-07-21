'use server';

/**
 * getHeaderTickerData — دیتای نوار بالای Header
 *
 * ترکیب:
 * - نرخ ارزهای دیجیتال از Exir API (fallback به mock در صورت خطا)
 * - نرخ طلا/ارز از دیتابیس
 *
 * 2026-06-14: Replaced `react.cache` (per-request only) with
 * `unstable_cache` (Data Cache, 60s TTL, tag-invalidated).
 *
 * 2026-06-20: rename از `getTickerData` → `getHeaderTickerData`.
 *
 * 2026-08-01: migrated from unstable_cache → safeCache for DB-resilience.
 * unstable_cache re-throws DB errors through the cache boundary, crashing
 * the layout. safeCache returns [] on failure so the header ticker degrades
 * gracefully instead of taking down the whole page.
 */

import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import type { HeaderTickerItem } from '@/types/types';

function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Internal fetch function — not cached, called by the safeCache wrapper.
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

// safeCache wrapper: 60s TTL, tags for invalidation.
// Fallback: [] — header ticker disappears gracefully on DB failure.
const getCachedHeaderTickerData = safeCache(fetchHeaderTickerData, [], {
  key: 'header-ticker-data',
  ttl: 60,
  tags: ['market-rates:ticker', 'market-rates:exchange-rates'],
});

export const getHeaderTickerData = async (): Promise<HeaderTickerItem[]> => {
  return getCachedHeaderTickerData();
};
