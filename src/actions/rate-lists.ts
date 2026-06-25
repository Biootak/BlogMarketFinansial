'use server';

import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';
import type { ActionResult, RateItem, RateListData } from '@/types/types';
import { revalidatePath } from 'next/cache';

// 2026-06-14: shared helper to normalize the Json column into a
// typed array. Prisma 6 returns the Json value already parsed, so
// we only do the typeof / array guards — no JSON.parse on the hot
// path.
const normalizeRates = (raw: unknown): RateItem[] => {
  if (Array.isArray(raw)) {
    return raw.map((rate: unknown) => ({
      title: String((rate as { title?: unknown })?.title ?? ''),
      value: String((rate as { value?: unknown })?.value ?? ''),
    }));
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizeRates(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
};

// 2026-06-21: قبلاً unstable_cache بود که در Next.js 16 خطای DB را
// re-throw می‌کرد. حالا safeCache — اگر DB قطع باشد، stale value
// (اگر قبلاً موفق بود) یا آرایه‌ی خالی برمی‌گرداند.
export const getRateLists = safeCache(
  async (): Promise<RateListData[]> => {
    const rateLists = await prisma.rateList.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return rateLists.map((list) => ({
      ...list,
      rates: normalizeRates(list.rates),
    }));
  },
  [],
  {
    key: 'rate-lists',
    ttl: 300,
    tags: ['rate-lists', 'ticker', 'exchange-rates'],
  },
);

/* ============================================================================
   Crypto symbol → فارسی  — همان نگاشت موجود در marketTickerActions
   ============================================================================ */
const _CRYPTO_NAMES: Record<string, string> = {
  BTC: 'بیت‌کوین',
  ETH: 'اتریوم',
  USDT: 'تتر',
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
};

/**
 * نرمال‌سازی title — برای dedupe (case-insensitive، حذف فاصله و کاراکتر ZWNJ).
 * چند ردیف DB می‌تونه یک عنوان داشته باشه (rateType متفاوت، یا ورود دستی).
 * این نسخه‌ی نرمال شده کلید Map برای حذف تکراری‌هاست.
 */
function normTitleKey(s: string): string {
  return s.replace(/\s+/g, '').replace(/[‌]/g, '').toLowerCase();
}

/**
 * حذف تکراری‌ها از لیست آیتم‌ها بر اساس title.
 * وقتی یک عنوان چند بار تکرار شده، اولین occurrence نگه داشته می‌شه
 * (چون لیست‌ها `createdAt desc` مرتب شدن، یعنی جدیدترین نگه داشته می‌شه).
 * آیتم‌هایی که value شامل "|" نیست هم حذف نمی‌شن — فقط تکراری‌ها حذف می‌شن.
 */
function dedupeByTitle(items: RateItem[]): RateItem[] {
  const seen = new Set<string>();
  const out: RateItem[] = [];
  for (const item of items) {
    const t = (item.title ?? '').trim();
    if (!t) continue;
    const key = normTitleKey(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * ساخت یک RateListData مجازی برای ارزهای دیجیتال.
 * فقط زمانی فراخوانی می‌شه که DB هیچ لیست فعالی نداشته باشه
 * (یعنی admin هنوز لیستی ثبت نکرده) — در این صورت crypto از Exir
 * جایگزین می‌شه تا نوار چرخشی هیچ‌وقت خالی نباشه.
 */
function buildCryptoFallbackList(): RateListData {
  // فچ sync در این context مشکل‌ساز نیست چون cached wrapper داره
  // و در SSR قبل از ارسال به کلاینت resolve می‌شه. اگه فچ شکست
  // بخوره، لیست خالی برمی‌گرده و strip مخفی می‌شه.
  // (sync wrap مجاز نیست — پس این تابع فقط در حالت cached فراخوانی می‌شه)
  return {
    id: '__crypto_fallback__',
    title: 'ارزهای دیجیتال',
    rates: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function loadCryptoRatesAsync(): Promise<RateItem[]> {
  try {
    const result = await fetchCryptoTickerRates();
    if (!result.success || !result.data) return [];
    return result.data.map((r) => ({
      title: r.symbol,
      value: `${toEn(r.usdtPrice)} USDT`,
    }));
  } catch {
    return [];
  }
}

/* اعداد بدون جداکننده و بدون اعشار — برای جایگیری در value */
function toEn(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n < 1) return n.toFixed(4);
  return Math.round(n).toString();
}

/**
 * خروجی اصلی برای PulseBoard / Header.
 *  1) لیست‌های فعال DB را می‌گیره
 *  2) آیتم‌های تکراری (با title یکسان) را حذف می‌کنه
 *  3) اگه هیچ لیست فعالی در DB نبود، **فقط در این حالت** یک لیست مجازی
 *     «ارزهای دیجیتال» از Exir اضافه می‌کنه تا نوار هرگز خالی نباشه.
 *
 * نکته‌ی مهم: وقتی DB لیست فعال داره، لیست کریپتو **اضافه نمی‌شه** چون:
 *  - کریپتو در `MarketTicker` (نوار زیرین PulseBoard) کامل پوشش داده شده.
 *  - `MarketTicker` در هدر سایت هم رندر می‌شه.
 *  - اگه اینجا هم اضافه بشه، کریپتو سه‌بار تکرار می‌شه و کاربر فقط
 *    نوار بالایی و هدر رو می‌بینه که هر دو دارن BTC/ETH/USDT نشون می‌دن.
 *  - نوار RateList باید روی نرخ‌های صرافی‌های داخلی متمرکز باشه
 *    (سارای شاهزاده، نرخ تهران، صرافی ملی) که در هیچ جای دیگری نیست.
 *
 * این تابع **همون کش `rate-lists` رو می‌شکنه** تا هر تغییر ادمین در DB
 * تا ۵ دقیقه‌ی بعد در strip دیده بشه.
 *
 * 2026-06-20: rename از `getRateListsWithCrypto` → `getActiveRateListsOrCryptoFallback`
 * تا رفتار واقعی (DB active اولویت دارد، کریپتو فقط fallback) در نام
 * منعکس شود. قبلاً «WithCrypto» در ۹۰٪ مواقع (وقتی DB لیست فعال دارد)
 * کریپتو اضافه نمی‌کرد و نام دروغ می‌گفت.
 */
// 2026-06-21: قبلاً `unstable_cache` بود که در Next.js 16 خطای DB را
// re-throw می‌کرد. حالا safeCache که اگر DB قطع باشد:
//   1. stale value (اگر قبلاً موفق بود) → برمی‌گرداند
//   2. در غیر این صورت → crypto fallback
export const getActiveRateListsOrCryptoFallback = safeCache(
  async (): Promise<RateListData[]> => {
    const dbLists = await getRateLists();

    const active = (dbLists ?? []).filter((l) => l?.isActive);

    // dedupe داخل هر لیست
    const dedupedActive: RateListData[] = active.map((l) => ({
      ...l,
      rates: dedupeByTitle(l.rates ?? []),
    }));

    // اگه DB لیست فعال نداره (یا اصلاً در دسترس نیست)، فقط لیست crypto
    // رو به‌عنوان fallback برگردون
    if (dedupedActive.length === 0) {
      try {
        const cryptoItems = await loadCryptoRatesAsync();
        if (cryptoItems.length === 0) return [];
        return [
          {
            ...buildCryptoFallbackList(),
            rates: cryptoItems,
          },
        ];
      } catch {
        return [];
      }
    }

    // DB لیست فعال داره → فقط همون‌ها رو برگردون.
    // کریپتو توسط MarketTicker و هدر سایت نشون داده می‌شه و اینجا
    // اضافه کردنش فقط باعث تکرار سه‌گانه می‌شه.
    return dedupedActive;
  },
  [],
  {
    key: 'active-rate-lists-or-crypto-fallback',
    ttl: 300,
    tags: ['rate-lists', 'ticker', 'exchange-rates'],
  },
);

export async function createRateList(
  data: Omit<RateListData, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ActionResult<RateListData>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    // 2026-06-14: Prisma's Json column type serializes for us. The
    // previous `JSON.stringify` was redundant and meant the column
    // stored a string-in-string which broke read paths.
    const rateList = await prisma.rateList.create({
      data: {
        title: data.title,
        rates: data.rates as never,
        isActive: data.isActive,
      },
    });

    revalidatePath('/dashboard/exchange-rates');
    revalidateTag('rate-lists');

    return {
      success: true,
      message: 'Rate list created successfully',
      data: {
        ...rateList,
        rates: Array.isArray(data.rates) ? data.rates : [],
      },
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error creating rate list:', error);
    }
    return {
      success: false,
      message: 'خطا در ایجاد لیست نرخ',
    };
  }
}

export async function updateRateList(
  id: string,
  data: Partial<Omit<RateListData, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ActionResult<RateListData>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    // Same fix as createRateList: don't JSON.stringify the Json
    // column. Let Prisma handle serialization.
    const rateList = await prisma.rateList.update({
      where: { id },
      data: {
        title: data.title,
        rates: (data.rates ?? undefined) as never,
        isActive: data.isActive,
      },
    });

    revalidatePath('/dashboard/exchange-rates');
    revalidateTag('rate-lists');

    return {
      success: true,
      message: 'Rate list updated successfully',
      data: {
        ...rateList,
        rates: normalizeRates(rateList.rates),
      },
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error updating rate list:', error);
    }
    return {
      success: false,
      message: 'خطا در به‌روزرسانی لیست نرخ',
    };
  }
}

export async function deleteRateList(id: string): Promise<ActionResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    await prisma.rateList.delete({ where: { id } });
    revalidatePath('/dashboard/exchange-rates');
    revalidateTag('rate-lists');
    return {
      success: true,
      variant: 'success',
      message: 'لیست نرخ با موفقیت حذف شد',
    };
  } catch (error) {
    console.error('Error deleting rate list:', error);
    return {
      success: false,
      variant: 'destructive',
      message: 'خطا در حذف لیست نرخ',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
