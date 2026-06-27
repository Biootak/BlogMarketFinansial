'use server';

import type { CryptoTickerResult } from '@/types/types';
import { safeCache } from '@/lib/safe-cache';
import { getExirCryptoRates } from '../lib/exir-crypto-rates';

/* 2026-06-20: این اکشن قبلاً `fetchExchangeRates` نام داشت که با مدل
 * Prisma `ExchangeRate` (نرخ‌های صرافی ادمین) و تایپ `ExchangeRateData`
 * (که از DB می‌آید) گیج‌کننده بود. حالا فقط و فقط داده‌های کریپتو از
 * Exir را برمی‌گرداند؛ نام جدید این واقعیت را منعکس می‌کند.
 *
 * قبلاً این تابع از `getExchangeRates` (در `lib/exchange-rates.ts`)
 * که فقط با `react.cache` (per-request dedupe) wrap شده بود صدا
 * می‌زد. wrap کردن با `unstable_cache` (60s, tag `exchange-rates`)
 * نتیجه‌ی کاملاً پردازش‌شده را بین رندرها share می‌کنه؛
 * `getExirCryptoRates` داخلی همچنان `next: {revalidate:60}` دارد پس
 * در cache miss از Exir HTTP-cached می‌گیره.
 */
// 2026-06-21: قبلاً unstable_cache بود. حالا safeCache.
// Fallback اگر Exir fail شود.
const FALLBACK_CRYPTO: CryptoTickerResult = {
  success: false,
  message: 'crypto fallback (DB/API fail)',
  data: [],
};

const getCachedCryptoTickerRates = safeCache(
  async (): Promise<CryptoTickerResult> => getExirCryptoRates(),
  FALLBACK_CRYPTO,
  {
    key: 'crypto-ticker-rates',
    ttl: 60,
    tags: ['exchange-rates'],
  },
);

export async function fetchCryptoTickerRates(): Promise<CryptoTickerResult> {
  return getCachedCryptoTickerRates();
}
