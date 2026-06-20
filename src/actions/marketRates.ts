/**
 * freeMarketRates — نرخ‌های بازار آزاد (بدون وابستگی به رندر تیکر)
 *
 * منبع داده: src/lib/freeMarketRates.ts
 *   1. USD/Toman از قیمت تتر (Exir — رایگان، بدون کلید)
 *   2. EUR/GBP/AED/CHF/... از FX جهانی × USD (exchangerate-api.com — رایگان)
 *   3. طلا/سکه/نفت از جدول ExchangeRate (ادمین در داشبورد ثبت می‌کنه)
 *
 * هیچ‌کدوم از این منابع نیاز به ثبت‌نام یا API key ندارن. کش ۶۰ ثانیه‌ای
 * فشار روی منابع رایگان را کنترل می‌کنه.
 *
 * 2026-06-20: rename از `getMarketRates` → `getFreeMarketRates` تا منبع
 * (freeMarketRates.ts) در نام واضح باشد. کلید کش جدید تا کش قبلی
 * invalidated شود (تگ‌ها یکسان می‌ماند).
 */

import {
  type FreeMarketItem,
  type MarketSource,
  assembleFreeMarketRates,
} from '@/lib/freeMarketRates';
import { unstable_cache } from 'next/cache';

export type { FreeMarketItem, MarketSource };

export interface MarketRateItem {
  symbol: string;
  name: string;
  price: number; // تومان
  change: number; // درصد
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
      console.warn('[freeMarketRates] assemble failed:', err);
    }
    return [];
  }
}

export const getFreeMarketRates = unstable_cache(
  load,
  ['free-market-rates', 'v4-renamed-2026-06-20'],
  {
    revalidate: 60,
    tags: ['ticker', 'exchange-rates'],
  },
);
