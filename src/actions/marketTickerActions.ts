'use server';

/**
 * getCryptoTickerData — دیتای نوار قیمت «آخرین مقالات»
 *
 * فقط نرخ ارزهای دیجیتال از Exir API را برمی‌گرداند.
 *
 * تغییرات:
 *  - 2026-06-20: قبلاً این تابع `getMarketTickerData` نام داشت و کل
 *    pool (crypto + forex + gold + commodity + index) را برمی‌گردوند.
 *    PulseSection بعد در سمت سرور فیلتر می‌کرد:
 *      `tickerData.filter((item) => item.category === 'crypto')`
 *    یعنی ۹۰٪ دیتا دور ریخته می‌شد. حالا این تابع فقط crypto را
 *    برمی‌گرداند (dedup داخلی بر اساس symbol).
 *  - کش: unstable_cache با 60s TTL و تگ 'crypto-ticker' که مستقل از
 *    سایر تگ‌های ticker قابل invalidate است.
 *
 * خروجی: آرایه‌ای از MarketTickerItem که مستقیماً در <MarketTicker/>
 * استفاده می‌شود (در PulseBoard و Magazine).
 */

import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import { safeCache } from '@/lib/safe-cache';

export interface MarketTickerItem {
  /** کلید یکتا (symbol) */
  symbol: string;
  /** نام فارسی */
  name: string;
  /** قیمت (به صورت عدد، نه رشته — فرانت خودش format می‌کنه) */
  price: number;
  /** درصد تغییر (مثبت = سبز، منفی = قرمز) */
  change: number;
  /** نوع دسته‌بندی — این تابع همیشه 'crypto' برمی‌گرداند. فیلد
   *  برای سازگاری با MarketTicker client component حفظ شده. */
  category: 'crypto';
  /** واحد (این تابع همیشه 'usd' برمی‌گرداند) */
  unit: 'usd';
}

/* -------------------------------------------------------------------------- */
/*  نگاشت نام ارزها به فارسی                                                 */
/* -------------------------------------------------------------------------- */

const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'بیت‌کوین',
  ETH: 'اتریوم',
  USDT: 'تتر',
  XMR: 'مونرو',
  ZEC: 'زدکش',
  DASH: 'دش',
  ETC: 'اتریوم کلاسیک',
  XEM: 'نم',
  VET: 'وی‌چین',
  FIL: 'فایل‌کوین',
  THETA: 'تتا',
  XTZ: 'تزوس',
  KSM: 'کوزاما',
  ICP: 'اینترنت کامپیوتر',
  ALGO: 'آلگوراند',
  EGLD: 'الروند',
  NEAR: 'نیر پروتکل',
  GRT: 'د گرافی',
  COMP: 'کامپوند',
  MKR: 'میکر',
  SNX: 'سینتتیکس',
  CRV: 'کرو دائو',
  XRP: 'ریپل',
  LTC: 'لایت‌کوین',
  BCH: 'بیت‌کوین کش',
  SOL: 'سولانا',
  ADA: 'کاردانو',
  DOGE: 'دوج‌کوین',
  AVAX: 'آوالانچ',
  TRX: 'ترون',
  DOT: 'پولکادات',
  LINK: 'چین‌لینک',
  MATIC: 'پالیگان',
  UNI: 'یونی‌سواپ',
  SHIB: 'شیبا اینو',
  XLM: 'استلار',
  EOS: 'ایاس',
  AAVE: 'آوه',
  FTM: 'فانتوم',
  SAND: 'سندباکس',
  MANA: 'دسنترالند',
  AXS: 'اکسی اینفینیتی',
  ATOM: 'کاسموس',
};

/* -------------------------------------------------------------------------- */
/*  Cached loader — 60 ثانیه                                                  */
/* -------------------------------------------------------------------------- */

async function loadCryptoTickerData(): Promise<MarketTickerItem[]> {
  const items: MarketTickerItem[] = [];

  try {
    const ratesResult = await fetchCryptoTickerRates();
    if (!ratesResult.success || !ratesResult.data) return [];

    for (const rate of ratesResult.data) {
      items.push({
        symbol: rate.symbol,
        name: CRYPTO_NAMES[rate.symbol] ?? rate.symbol,
        price: rate.usdtPrice,
        change: rate.change,
        category: 'crypto',
        unit: 'usd',
      });
    }
  } catch {
    // silent — نوار قیمت اختیاری است
  }

  /* ---------- Dedupe by symbol ----------
   * اگر Exir برای یک symbol چند ردیف برگرداند (معمولاً نمی‌شود ولی
   * ایمن باشیم)، اولین occurrence نگه داشته می‌شود.
   */
  const seen = new Set<string>();
  const unique: MarketTickerItem[] = [];
  for (const item of items) {
    if (seen.has(item.symbol)) continue;
    seen.add(item.symbol);
    unique.push(item);
  }

  return unique;
}

/**
 * safeCache wrapper با 60s TTL.
 * - ttl: 60s — بعد ۶۰ ثانیه دوباره fetch می‌کنه
 * - tag: 'crypto-ticker' — با safeRevalidateTag('crypto-ticker') invalidate می‌شود
 * - fallback: [] — نوار قیمت gracefully غیب می‌شه، کل صفحه کرش نمی‌کنه
 *
 * 2026-08-01: migrated from unstable_cache → safeCache for DB-resilience.
 */
export const getCryptoTickerData = safeCache(loadCryptoTickerData, [], {
  key: 'crypto-ticker-data',
  ttl: 60,
  tags: ['crypto-ticker'],
});
