'use server';

/**
 * getMarketTickerData — دیتای نوار قیمت «آخرین مقالات»
 *
 * ترکیب:
 *  1. نرخ ارزهای دیجیتال از Exir API (با mock fallback)
 *  2. نرخ طلا/ارز/سکه از دیتابیس (ExchangeRate)
 *  3. شاخص‌های منتخب (اگه در DB باشن)
 *
 * کش: unstable_cache با 60s TTL (نه خیلی کوتاه که API رو بزنه، نه بلند که آپدیت نشه)
 *
 * خروجی: آرایه‌ای از MarketTickerItem که مستقیماً در <MarketTicker/> استفاده می‌شه.
 */

import { unstable_cache } from 'next/cache';
import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import prisma from '@/lib/db';

export interface MarketTickerItem {
  /** کلید یکتا (symbol) */
  symbol: string;
  /** نام فارسی */
  name: string;
  /** قیمت (به صورت عدد، نه رشته — فرانت خودش format می‌کنه) */
  price: number;
  /** درصد تغییر (مثبت = سبز، منفی = قرمز) */
  change: number;
  /** نوع دسته‌بندی */
  category: 'crypto' | 'forex' | 'gold' | 'commodity' | 'index';
  /** واحد (تومان، دلار، درصد و...) */
  unit?: 'toman' | 'usd' | 'percent';
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
};

const FOREX_NAMES: Record<string, string> = {
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  GBP: 'پوند',
  AED: 'درهم امارات',
  TRY: 'لیر ترکیه',
  CHF: 'فرانک سوئیس',
  CAD: 'دلار کانادا',
  AUD: 'دلار استرالیا',
};

const GOLD_NAMES: Record<string, string> = {
  GOLD: 'طلا (گرم)',
  COIN: 'سکه طرح جدید',
  COIN_OLD: 'سکه طرح قدیم',
  HALF_COIN: 'نیم سکه',
  QUARTER_COIN: 'ربع سکه',
  OUNCE: 'انس طلا (جهانی)',
};

const COMMODITY_NAMES: Record<string, string> = {
  OIL: 'نفت برنت',
  OIL_WTI: 'نفت WTI',
  GAS: 'گاز طبیعی',
  SILVER: 'نقره (گرم)',
};

/* -------------------------------------------------------------------------- */
/*  Cached loader — 60 ثانیه                                                  */
/* -------------------------------------------------------------------------- */

async function loadMarketTickerData(): Promise<MarketTickerItem[]> {
  const items: MarketTickerItem[] = [];

  /* ---------- 1) Crypto (Exir) ---------- */
  try {
    const ratesResult = await fetchCryptoTickerRates();
    if (ratesResult.success && ratesResult.data) {
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
    }
  } catch {
    // silent
  }

  /* ---------- 2) DB rates (forex, gold, commodity) ---------- */
  try {
    const dbRates = await prisma.exchangeRate.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
    });

    for (const rate of dbRates) {
      const value = rate.buyRate || rate.singleRate;
      if (!value) continue;
      const price = parseFloat(value);
      if (Number.isNaN(price) || price <= 0) continue;

      // تخمین درصد تغییر (اگه فیلد change در DB نیست، از buy/sell تخمین بزن)
      let change = 0;
      if (rate.buyRate && rate.sellRate) {
        const buy = parseFloat(rate.buyRate);
        const sell = parseFloat(rate.sellRate);
        if (buy > 0) {
          change = Number((((sell - buy) / buy) * 100).toFixed(2));
        }
      }

      // تشخیص category از currency
      const currency = rate.currency.toUpperCase();
      let category: MarketTickerItem['category'] = 'forex';
      let unit: MarketTickerItem['unit'] = 'toman';

      if (currency.includes('GOLD') || currency.includes('COIN') || currency === 'XAU' || currency === 'XAG') {
        category = 'gold';
      } else if (currency.includes('OIL') || currency.includes('GAS')) {
        category = 'commodity';
        unit = 'usd';
      } else if (FOREX_NAMES[currency]) {
        category = 'forex';
      } else if (GOLD_NAMES[currency]) {
        category = 'gold';
      }

      const name =
        rate.name ||
        GOLD_NAMES[currency] ||
        FOREX_NAMES[currency] ||
        COMMODITY_NAMES[currency] ||
        currency;

      items.push({
        symbol: currency,
        name,
        price,
        change,
        category,
        unit,
      });
    }
  } catch {
    // silent
  }

  /* ---------- Dedupe by symbol ----------
   * چند ردیف DB می‌تونه یک currency داشته باشه (rateType های متفاوت، یا
   * تکرار دستی). اگه symbol تکراری توی آرایه بمونه، React در <Marquee/>
   * که children رو ۳ بار تکرار می‌کنه با warning «duplicate key» می‌ترکه.
   * اولین occurrence (که جدیدترین هست چون orderBy createdAt desc) نگه داشته می‌شه.
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
 * Cached wrapper با 60s TTL.
 * - revalidate: 60s — بعد ۶۰ ثانیه دوباره fetch می‌کنه
 * - tag: 'market-ticker' — می‌تونیم با revalidateTag('market-ticker') invalidate کنیم
 */
export const getMarketTickerData = unstable_cache(
  loadMarketTickerData,
  ['market-ticker-data'],
  {
    revalidate: 60,
    tags: ['market-ticker'],
  },
);
