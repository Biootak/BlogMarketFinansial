// src/lib/market-rates/registry.ts

import type { SymbolRegistryEntry } from './types';

/**
 * SYMBOL_REGISTRY — نگاشت صریح symbol های اصلی.
 *
 * هر entry:
 *  - self-describing symbol (مثل IRAN_USD، نه USD)
 *  - نام فارسی برای نمایش
 *  - tgjuKey برای scraping (null = manual)
 *  - گروه برای filter
 *  - واحد نمایش + divisor + decimals
 *  - priority برای ترتیب در نوار (1 = اول)
 *
 * اگر ادمین ارزی خارج از این لیست اضافه کند، در DB ذخیره می‌شود
 * ولی در registry نیست. assembler هر دو را پشتیبانی می‌کند.
 */
export const SYMBOL_REGISTRY: SymbolRegistryEntry[] = [
  // ── Afghan (ویژه افغانستان) ─────────────────────────────────
  {
    symbol: 'AFGHANI_USD',
    displayNameFa: 'دلار هرات',
    group: 'afghan',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 2,
  },
  {
    symbol: 'AFGHANI_AFN',
    displayNameFa: 'افغانی',
    group: 'afghan',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 3,
  },

  // ── Iran Forex (ضروری) ──────────────────────────────────────
  {
    symbol: 'IRAN_USD',
    displayNameFa: 'دلار تهران',
    tgjuKey: 'price_dollar_rl',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 1,
  },
  {
    symbol: 'IRAN_EUR',
    displayNameFa: 'یورو',
    tgjuKey: 'price_eur',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 7,
  },
  {
    symbol: 'IRAN_GBP',
    displayNameFa: 'پوند انگلیس',
    tgjuKey: 'price_gbp',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 9,
  },
  {
    symbol: 'IRAN_AED',
    displayNameFa: 'درهم امارات',
    tgjuKey: 'price_aed',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 8,
  },
  {
    symbol: 'IRAN_TRY',
    displayNameFa: 'لیر ترکیه',
    tgjuKey: 'price_try',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 11,
  },
  {
    symbol: 'IRAN_CHF',
    displayNameFa: 'فرانک سوئیس',
    tgjuKey: 'price_chf',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 17,
  },
  {
    symbol: 'IRAN_CAD',
    displayNameFa: 'دلار کانادا',
    tgjuKey: 'price_cad',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 18,
  },
  {
    symbol: 'IRAN_AUD',
    displayNameFa: 'دلار استرالیا',
    tgjuKey: 'price_aud',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 19,
  },
  {
    symbol: 'IRAN_CNY',
    displayNameFa: 'یوان چین',
    tgjuKey: 'price_cny',
    group: 'iran-forex',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 12,
  },
  {
    symbol: 'IRAN_JPY',
    displayNameFa: 'ین ژاپن',
    tgjuKey: 'price_jpy',
    group: 'minor',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 20,
  },
  {
    symbol: 'IRAN_RUB',
    displayNameFa: 'روبل روسیه',
    tgjuKey: 'price_rub',
    group: 'minor',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 21,
  },
  {
    symbol: 'IRAN_INR',
    displayNameFa: 'روپیه هند',
    tgjuKey: 'price_inr',
    group: 'minor',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 22,
  },

  // ── Iran Coin ───────────────────────────────────────────────
  // 2026-07-04: tgju.org prefix `retail_` را از کلید سکه‌ها حذف کرده.
  // قبلاً `retail_sekee` بود، الان فقط `sekee` در صفحه وجود دارد.
  {
    symbol: 'IRAN_COIN_EMAMI',
    displayNameFa: 'سکه امامی',
    tgjuKey: 'sekee',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 4,
  },
  {
    symbol: 'IRAN_COIN_BAHAR',
    displayNameFa: 'سکه بهار آزادی',
    tgjuKey: 'sekeb',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 10,
  },
  {
    symbol: 'IRAN_COIN_NIM',
    displayNameFa: 'نیم سکه',
    tgjuKey: 'nim',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 13,
  },
  {
    symbol: 'IRAN_COIN_ROB',
    displayNameFa: 'ربع سکه',
    tgjuKey: 'rob',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 14,
  },
  {
    symbol: 'IRAN_COIN_GERAMI',
    displayNameFa: 'سکه گرمی',
    tgjuKey: 'gerami',
    group: 'iran-coin',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 15,
  },

  // ── Iran Gold ───────────────────────────────────────────────
  {
    symbol: 'IRAN_GOLD_18K',
    displayNameFa: 'طلای ۱۸ عیار',
    tgjuKey: 'geram18',
    group: 'iran-gold',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 5,
  },
  {
    symbol: 'IRAN_GOLD_MESGHAL',
    displayNameFa: 'مثقال طلا',
    tgjuKey: 'mesghal',
    group: 'iran-gold',
    unit: 'toman',
    divisor: 10,
    decimals: 0,
    priority: 16,
  },

  // ── Global (دلار جهانی) ────────────────────────────────────
  {
    symbol: 'GLOBAL_OUNCE_GOLD',
    displayNameFa: 'انس طلا',
    tgjuKey: 'ons',
    group: 'global',
    unit: 'usd',
    divisor: 1,
    decimals: 2,
    priority: 6,
  },
];

/** lookup map: symbol → entry */
export const SYMBOL_REGISTRY_MAP: ReadonlyMap<string, SymbolRegistryEntry> = new Map(
  SYMBOL_REGISTRY.map((e) => [e.symbol, e]),
);

/** lookup: TGJU key → symbol */
export const TGJU_KEY_TO_SYMBOL: ReadonlyMap<string, string> = new Map(
  SYMBOL_REGISTRY.filter((e) => e.tgjuKey).map((e) => [e.tgjuKey!, e.symbol]),
);

/** لیست symbol ها برای seed */
export const ALL_SYMBOLS: readonly string[] = SYMBOL_REGISTRY.map((e) => e.symbol);
