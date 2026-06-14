/**
 * getMarketTickerRates — نرخ‌های بازار آزاد برای تیکر پایین اسلایدر
 *
 * منبع داده: src/lib/freeMarketRates.ts
 *   1. USD/Toman از قیمت تتر (Exir — رایگان، بدون کلید)
 *   2. EUR/GBP/AED/CHF/... از FX جهانی × USD (exchangerate-api.com — رایگان)
 *   3. طلا/سکه/نفت از جدول ExchangeRate (ادمین در داشبورد ثبت می‌کنه)
 *
 * هیچ‌کدوم از این منابع نیاز به ثبت‌نام یا API key ندارن. کش ۶۰ ثانیه‌ای
 * فشار روی منابع رایگان را کنترل می‌کنه.
 */

import { unstable_cache } from 'next/cache';
import { assembleFreeMarketRates, type FreeMarketItem, type MarketSource } from '@/lib/freeMarketRates';

export type { FreeMarketItem, MarketSource };

export interface MarketRateItem {
  symbol: string;
  name: string;
  price: number;       // تومان
  change: number;      // درصد
  source: MarketSource; // برای دیباگ
}

async function load(): Promise<MarketRateItem[]> {
  try {
    const result = await assembleFreeMarketRates();
    return result.items.map((it) => ({
      symbol: it.symbol,
      name: it.name,
      price: it.priceToman,
      change: it.change,
      source: it.source,
    }));
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[marketTickerRates] assemble failed:', err);
    }
    return [];
  }
}

export const getMarketTickerRates = unstable_cache(
  load,
  ['market-ticker-rates', 'v3-freemarket-2026-06-14'],
  {
    revalidate: 60,
    tags: ['ticker', 'exchange-rates'],
  },
);
