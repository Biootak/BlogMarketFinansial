/**
 * navasanRates — نرخ‌های خام «بازارها» از Navasan مستقیم
 * ----------------------------------------------------------------------------
 * این ماژول **مستقیماً** به API رسمی Navasan وصل می‌شه و همان مقادیر
 * خام را (بدون هیچ‌گونه تبدیل واحد، محاسبه‌ی نرخ طلایی، یا ادغام با
 * منبع دیگر) به فرانت تحویل می‌ده. دلیل این تصمیم:
 *
 *   ۱) کاربر می‌خواهد «بازارها» یک نمای زنده از قیمت‌های واقعی بازار
 *      ایران باشد، نه برآورد الگوریتمی ما. هرچه لایه‌ی واسط کمتر،
 *      اعتماد بیشتر.
 *
 *   ۲) قبلاً در `freeMarketRates.ts` ضریب طلایی USDT ضرب می‌شد و
 *      `price: usdt * (1 + premium%)` ساخته می‌شد — که در عمل
 *      مقدار «دلار بازار آزاد» را ۰ تا ۲٪ بالاتر از USDT تتر نشون
 *      می‌داد. ولی Navasan خودش قیمت دلار هرات/سلطانی/خرید و فروش
 *      صرافی‌ها را مستقیماً دارد (`harat_naghdi_buy`، `usd_sell` و ...).
 *
 *   ۳) اشتباه قبلی: `parseNavasanItem` مقدار Navasan را ریال فرض
 *      می‌کرد و `/10` می‌زد — که عدد نهایی ۱۰ برابر کمتر از واقع بود.
 *      در این فایل همان مقدار خام به‌عنوان «تومان» در نظر گرفته می‌شه
 *      (طبق مستندات رسمی Navasan و نمونه‌ی واقعی API).
 *
 * کش: `unstable_cache` با ۶۰ ثانیه revalidate — پلن رایگان Navasan
 * هر ۲ ساعت آپدیت می‌شه، ولی کش ۶۰ ثانیه‌ای به ما اجازه می‌ده بین
 * درخواست‌های همزمان (مثلاً چند tab) به API یک‌بار زنگ بزنیم.
 */

import { unstable_cache } from 'next/cache';
import { fetchNavasanLatest, type NavasanResponse } from '@/lib/navasan';

/* ============================================================================
   تایپ‌ها
   ============================================================================ */

export interface NavasanRateItem {
  /** کلید اصلی Navasan (مثلاً `usd_buy`, `sekkeh`, `eur_hav`). */
  key: string;
  /** نماد کوتاه فارسی برای نمایش (مثلاً «دلار خرید»، «سکه طرح جدید»). */
  symbol: string;
  /** نام فارسی بلند برای tooltip / screen reader. */
  name: string;
  /** قیمت به تومان (Navasan خودش به تومان برمی‌گردونه). */
  price: number;
  /** درصد تغییر (از خود Navasan). */
  change: number;
}

/* ============================================================================
   نگاشت کلید → نام نمایشی
   ----------------------------------------------------------------------------
   فقط کلیدهایی که در نوار «بازارها» نشون داده می‌شن اینجا فهرست شدن.
   ترتیب = ترتیب نمایش در نوار.
   ============================================================================ */
const KEY_MAP: Array<{ key: string; symbol: string; name: string }> = [
  { key: 'usd_buy',         symbol: 'دلار خرید',         name: 'دلار صرافی (خرید از صرافی)' },
  { key: 'usd_sell',        symbol: 'دلار فروش',         name: 'دلار صرافی (فروش به صرافی)' },
  { key: 'harat_naghdi_buy',symbol: 'دلار هرات خرید',    name: 'دلار هرات (خرید)' },
  { key: 'harat_naghdi_sell',symbol: 'دلار هرات فروش',   name: 'دلار هرات (فروش)' },
  { key: 'usd_shakhs',      symbol: 'دلار شخصی',         name: 'دلار شخصی' },
  { key: 'usd_sherkat',     symbol: 'دلار شرکتی',        name: 'دلار شرکتی' },
  { key: 'eur_hav',         symbol: 'یورو حواله',        name: 'یورو حواله' },
  { key: 'gbp_hav',         symbol: 'پوند حواله',        name: 'پوند حواله' },
  { key: 'aed_sell',        symbol: 'درهم فروش',         name: 'درهم امارات (فروش)' },
  { key: 'try_hav',         symbol: 'لیر حواله',         name: 'لیر ترکیه (حواله)' },
  { key: 'cny_hav',         symbol: 'یوان حواله',        name: 'یوان چین (حواله)' },
  { key: 'sekkeh',          symbol: 'سکه طرح جدید',      name: 'سکه امامی' },
  { key: 'bahar',           symbol: 'سکه بهار آزادی',    name: 'سکه بهار آزادی' },
  { key: 'nim',             symbol: 'نیم سکه',           name: 'نیم سکه' },
  { key: 'rob',             symbol: 'ربع سکه',           name: 'ربع سکه' },
  { key: 'gerami',          symbol: 'سکه گرمی',          name: 'سکه گرمی' },
  { key: '18ayar',          symbol: 'طلای ۱۸ عیار',      name: 'طلای ۱۸ عیار (گرم)' },
  { key: 'abshodeh',        symbol: 'طلای آبشده',        name: 'مثقال طلای آبشده' },
  { key: 'usd_usdt',        symbol: 'تتر',               name: 'تتر (USDT)' },
];

/* ============================================================================
   تبدیل پاسخ Navasan به آرایه‌ی نوار
   ============================================================================ */
function buildItems(data: NavasanResponse): NavasanRateItem[] {
  const items: NavasanRateItem[] = [];
  for (const { key, symbol, name } of KEY_MAP) {
    const raw = data[key];
    if (!raw) continue;
    const price = Number(raw.value);
    if (!Number.isFinite(price) || price <= 0) continue;
    const change = Number(raw.change ?? raw.percent ?? 0);
    items.push({
      key,
      symbol,
      name,
      price: Math.round(price),
      change: Number.isFinite(change) ? change : 0,
    });
  }
  return items;
}

/* ============================================================================
   Cached loader
   ============================================================================ */
async function load(): Promise<NavasanRateItem[]> {
  const result = await fetchNavasanLatest();
  if (!result.ok || !result.data) return [];
  return buildItems(result.data);
}

/**
 * نرخ‌های خام «بازارها» از Navasan.
 * - فقط از Navasan می‌خونه؛ هیچ ضریب طلایی، FX، یا DB ترکیب نمی‌شه.
 * - مقادیر همان چیزی هستند که Navasan API برمی‌گردونه (تومان).
 * - کش ۶۰ ثانیه‌ای برای جلوگیری از rate-limit پلن رایگان.
 */
export const getNavasanRates = unstable_cache(
  load,
  ['navasan-rates', 'v1-direct-2026-06-17'],
  {
    revalidate: 60,
    tags: ['ticker', 'navasan'],
  },
);
