// src/actions/marketRates.ts
// 2026-06-20: DEPRECATED — استفاده از src/actions/market-rates.ts (getMarketRates).
// فقط re-export برای backward compat با مصرف‌کننده‌های قدیمی.
export { getMarketRates as getFreeMarketRates } from './market-rates';
export type { MarketRateItem } from '@/lib/market-rates';
