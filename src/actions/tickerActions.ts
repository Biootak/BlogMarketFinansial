'use server';

/**
 * Ticker data loader — دیتای نوار بالای Header
 *
 * ترکیب:
 * - نرخ ارزهای دیجیتال از Exir API (fallback به mock در صورت خطا)
 * - نرخ طلا/ارز از دیتابیس
 * - هر ۶۰ ثانیه کش می‌شه
 */

import { cache } from 'react';
import { fetchExchangeRates } from '@/actions/fetchExchangeRates';
import prisma from '@/lib/db';
import type { TickerItem } from '@/components/Header/TickerBar';

function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export const getTickerData = cache(async (): Promise<TickerItem[]> => {
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
});
