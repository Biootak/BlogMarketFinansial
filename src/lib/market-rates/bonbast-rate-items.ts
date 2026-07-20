// src/lib/market-rates/bonbast-rate-items.ts
//
// تبدیل داده‌های bonbast buy/sell به آرایه‌ی RateItem
// که توسط RateListsTicker روی صفحه‌ی اصلی خوانده می‌شود.
//
// این فایل single source of truth برای:
//  - نگاشت کد ISO → نام فارسی
//  - ترتیب نمایش ارزها
//  - فرمت "خرید: X | فروش: Y"
//
// مصرف‌کنندگان:
//  - src/actions/rate-lists.ts  (fallback وقتی DB خالی است)
//  - src/app/api/cron/sync-rate-lists/route.ts  (cron که DB را می‌نویسد)

import type { RateItem } from '@/types/types';
import type { BonbastBuySellRates } from './bonbast';

/** نگاشت کد ISO → نام فارسی برای نمایش در اسلایدر */
export const BONBAST_FA_NAMES: Record<string, string> = {
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  GBP: 'پوند انگلیس',
  AED: 'درهم امارات',
  TRY: 'لیر ترکیه',
  CHF: 'فرانک سوئیس',
  CAD: 'دلار کانادا',
  AUD: 'دلار استرالیا',
  JPY: 'ین ژاپن',
  CNY: 'یوان چین',
  SAR: 'ریال عربستان',
  KWD: 'دینار کویت',
  IQD: 'دینار عراق',
  AFN: 'افغانی',
  RUB: 'روبل روسیه',
  SEK: 'کرون سوئد',
  NOK: 'کرون نروژ',
  DKK: 'کرون دانمارک',
  INR: 'روپیه هند',
  SGD: 'دلار سنگاپور',
  HKD: 'دلار هنگ‌کنگ',
  MYR: 'رینگیت مالزی',
  THB: 'بات تایلند',
  AZN: 'منات آذربایجان',
  AMD: 'درام ارمنستان',
  BHD: 'دینار بحرین',
  OMR: 'ریال عمان',
  QAR: 'ریال قطر',
};

/**
 * ترتیب اولویت نمایش — ارزهای پرکاربردتر اول.
 * ارزهایی که در این لیست نیستند، به‌ترتیب الفبا بعد از اینها می‌آیند.
 */
export const BONBAST_DISPLAY_ORDER: string[] = [
  'USD',
  'EUR',
  'AED',
  'GBP',
  'AFN',
  'TRY',
  'CHF',
  'CAD',
  'AUD',
  'JPY',
  'CNY',
  'SAR',
  'KWD',
  'IQD',
];

/**
 * تبدیل BonbastBuySellRates به آرایه‌ی RateItem مرتب‌شده.
 *
 * فرمت value: "خرید: 75,000 | فروش: 75,500"
 * parseRateItem این فرمت را می‌شناسد و isPair=true برمی‌گرداند.
 * RatePill هر دو pill خرید/فروش را نمایش می‌دهد.
 *
 * مثال خروجی:
 *   { title: 'دلار آمریکا', value: 'خرید: 75,000 | فروش: 75,500' }
 */
export function bonbastToRateItems(bs: BonbastBuySellRates): RateItem[] {
  const ordered = [
    ...BONBAST_DISPLAY_ORDER.filter((c) => c in bs.rates),
    ...Object.keys(bs.rates)
      .filter((c) => !BONBAST_DISPLAY_ORDER.includes(c))
      .sort(),
  ];

  return ordered.map((code) => {
    const rate = bs.rates[code];
    const title = BONBAST_FA_NAMES[code] ?? code;
    // جداکننده هزار انگلیسی — parseRateItem فقط ارقام انگلیسی را پارس می‌کند
    const buy = Math.round(rate.buy).toLocaleString('en-US');
    const sell = Math.round(rate.sell).toLocaleString('en-US');
    return { title, value: `خرید: ${buy} | فروش: ${sell}` };
  });
}
