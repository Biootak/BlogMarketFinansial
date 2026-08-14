// src/actions/market-rates.ts
'use server';

import prisma from '@/lib/db';
import type { MarketRateItem } from '@/lib/market-rates';
import { type SnapshotItem, readMarketRatesSnapshot } from '@/lib/market-rates/snapshot-reader';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache, safeRevalidateTag, safeSet } from '@/lib/safe-cache';
import { serverLog } from '@/lib/server-logger';

const TAGS = {
  ticker: 'market-rates:ticker',
  list: 'market-rates:list',
  exchangeRates: 'market-rates:exchange-rates',
};

/**
 * TTL مشترک برای کش نرخ‌ها — هم getMarketRates و هم primeMarketRatesCache
 * (cron) از همین مقدار استفاده می‌کنند تا از هم فاصله نگیرند.
 */
const MARKET_RATES_TTL = 180;

/**
 * سن مجاز snapshot برای مسیر request — اگر cron از کار افتاده باشد و
 * snapshot کهنه‌تر از این باشد، به‌جای سرو دادهٔ قدیمی، assemble واقعی
 * تلاش می‌شود.
 */
const SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000; // ۱۰ دقیقه

function snapToItem(s: SnapshotItem): MarketRateItem {
  return {
    symbol: s.symbol,
    displayNameFa: s.displayNameFa,
    // snapshot آن‌ها را string ذخیره می‌کند؛ به نوع اتحادی‌ای برمی‌گردانیم
    group: s.group as MarketRateItem['group'],
    unit: s.unit as MarketRateItem['unit'],
    divisor: s.divisor,
    decimals: s.decimals,
    priority: s.priority,
    value: s.value,
    buyValue: s.buyValue,
    sellValue: s.sellValue,
    spread: s.buyValue != null && s.sellValue != null ? s.sellValue - s.buyValue : undefined,
    changePercent: s.changePercent,
    provider: s.provider,
    updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
  };
}

/**
 * کش برای نرخ‌ها — مسیر request هرگز scrape نمی‌کند.
 *
 * 2026-08-01: unstable_cache → safeCache. assembleMarketRates خودش
 * try/catch دارد ولی unstable_cache خطا را از طریق cache boundary
 * re-throw می‌کرد. safeCache fallback به [] می‌دهد.
 * 2026-08-08-perf: اگر همهٔ منابع fail شوند (خروجی خالی)، throw می‌کنیم تا
 * مسیر SWR دادهٔ خوبِ قبلی را حفظ کند — نه اینکه [] جای آن را بگیرد.
 * 2026-08-08-perf²: snapshot-first — مسیر request هرگز scrape نمی‌کند:
 * cron هر دقیقه snapshot می‌نویسد؛ اگر تازه باشد همان خوانده می‌شود (فایل IO ~ms).
 * 2026-08-14 mem-fix: fallback scrape حذف شد. قبلاً وقتی snapshot کهنه بود،
 * dyno خودش `assembleMarketRates()` اجرا می‌کرد (scrape کامل TGJU/bonbast/
 * sarafi — هر کدام تا ۵MB HTML) → V8 heap ratchet + R14 مداوم روی 512MB.
 * حالا به‌جای scrape، «last-known-good» سرو می‌شود: snapshot با هر سنی
 * (برچسب freshness در UI دیده می‌شود) و اگر snapshot نبود → مقادیر
 * ذخیره‌شدهٔ push قبلی از DB (یک query ارزان). تازه‌سازی فقط از طریق
 * GitHub Actions → push-rates انجام می‌شود.
 */

// آخرین زمان هشدار snapshot کهنه — هشدار حداکثر یک‌بار در ساعت (serverLog با
// SYSTEM_LOG_PERSIST در DB ذخیره می‌شود؛ اسپم نکنیم).
let lastStaleWarnAt = 0;
const STALE_WARN_INTERVAL_MS = 60 * 60 * 1000;

export const getMarketRates = safeCache(
  async (): Promise<MarketRateItem[]> => {
    // 1) snapshot-first (بدون scrape) — هر سنی قابل قبول است (last-known-good)
    const snap = await readMarketRatesSnapshot();
    if (snap && snap.items.length > 0) {
      const ageMs = snap.generatedAt
        ? Date.now() - snap.generatedAt.getTime()
        : Number.POSITIVE_INFINITY;
      if (ageMs > SNAPSHOT_MAX_AGE_MS) {
        const now = Date.now();
        if (now - lastStaleWarnAt > STALE_WARN_INTERVAL_MS) {
          lastStaleWarnAt = now;
          serverLog.warn(
            'market-rates',
            `snapshot stale (${Math.round(ageMs / 60000)}m) — serving last-known-good; push-rates باید هر ۵ دقیقه snapshot را تازه کند`,
          );
        }
      }
      return snap.items.map(snapToItem);
    }
    // 2) fallback: DB last-known-good (مقادیر push قبلی) — بدون scrape
    const rows = await prisma.exchangeRate.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' },
      select: {
        symbol: true,
        currency: true,
        name: true,
        displayNameFa: true,
        group: true,
        unit: true,
        divisor: true,
        decimals: true,
        priority: true,
        provider: true,
        singleRate: true,
        lastChangePercent: true,
        lastChangeAt: true,
        updatedAt: true,
      },
    });
    const items = rows.map(rowToItem).filter((item): item is MarketRateItem => item !== null);
    if (items.length === 0) throw new Error('ALL_SOURCES_FAILED');
    const now = Date.now();
    if (now - lastStaleWarnAt > STALE_WARN_INTERVAL_MS) {
      lastStaleWarnAt = now;
      serverLog.warn(
        'market-rates',
        `snapshot missing → DB last-known-good (${items.length} items)`,
      );
    }
    return items;
  },
  [] as MarketRateItem[],
  {
    key: 'market-rates',
    // 2026-08-08-perf: ttl 60 → 180 + swr.
    //  - ttl 180: هر ۶۰ ثانیه کش خالی می‌شد و hero منتظر re-assemble می‌ماند
    //    (با timeout های قدیمی تا ۱۵ ثانیه). حالا فقط هر ۳ دقیقه.
    //  - swr: بعد از انقضا، hero مقدار قبلی را فوراً می‌گیرد و refresh در
    //    پس‌زمینه اجرا می‌شود — request دیگر هیچ‌وقت روی scrape بلاک نمی‌شود.
    //  - push-rates با primeMarketRatesCache کش را هم تازه می‌کند.
    //  - refresh پس‌زمینه هم بدون scrape است (snapshot/DB read — ارزان).
    ttl: MARKET_RATES_TTL,
    swr: true,
    tags: [TAGS.ticker, TAGS.list],
  },
);

/** تبدیل ردیف DB (مقادیر push قبلی) به MarketRateItem — بدون هیچ scrape. */
function rowToItem(row: {
  symbol: string | null;
  currency: string;
  name: string | null;
  displayNameFa: string | null;
  group: string | null;
  unit: string | null;
  divisor: number | null;
  decimals: number | null;
  priority: number | null;
  provider: string | null;
  singleRate: string | null;
  lastChangePercent: number | null;
  lastChangeAt: Date | null;
  updatedAt: Date;
}): MarketRateItem | null {
  const symbol = row.symbol ?? row.currency;
  const raw = row.singleRate ? Number.parseFloat(row.singleRate) : Number.NaN;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const divisor = row.divisor && row.divisor > 0 ? row.divisor : 1;
  const provider = row.provider === 'manual' ? ('manual' as const) : ('auto' as const);
  return {
    symbol,
    displayNameFa: row.displayNameFa ?? row.name ?? symbol,
    group: (row.group ?? 'iran-forex') as MarketRateItem['group'],
    unit: (row.unit ?? 'toman') as MarketRateItem['unit'],
    divisor,
    decimals: row.decimals ?? 0,
    priority: row.priority ?? 50,
    value: raw / divisor,
    changePercent: row.lastChangePercent ?? 0,
    provider,
    updatedAt: row.lastChangeAt ?? row.updatedAt,
  };
}

/**
 * 2026-08-08-perf: cron نرخ‌های تازه‌ی assemble را مستقیم در safeCache صفحات
 * می‌ریزد (fullKey = 'market-rates' — چون getMarketRates آرگومان ندارد).
 * قبلاً cron فقط DB را به‌روز می‌کرد و صفحات هنوز منتظر انقضای کش بودند.
 */
export async function primeMarketRatesCache(items: MarketRateItem[]): Promise<void> {
  // ⚠️ این فایل 'use server' است — همهٔ export ها باید async باشند
  // (Turbopack: "Server Actions must be async functions").
  safeSet('market-rates', items, MARKET_RATES_TTL);
}

/**
 * لیست همه‌ی ExchangeRate برای داشبورد.
 * 2026-08-01: unstable_cache → safeCache.
 */
export const getExchangeRateList = safeCache(
  async () => {
    return prisma.exchangeRate.findMany({
      orderBy: { priority: 'asc' },
    });
  },
  [],
  {
    key: 'market-rates:list',
    ttl: 60,
    tags: [TAGS.list],
  },
);

type CreateInput = {
  symbol: string;
  displayNameFa: string;
  group: string;
  unit: string;
  divisor: number;
  decimals: number;
  priority: number;
  provider: 'auto' | 'manual';
  tgjuKey?: string;
  singleRate?: string;
  active?: boolean;
};

/** ادمین: اضافه کردن نرخ جدید. */
export async function createMarketRate(
  input: CreateInput,
): Promise<
  { success: true; id: string } | { success: false; error: { code: string; message: string } }
> {
  const authCheck = await requireAdmin();
  if (!authCheck.success) {
    return { success: false, error: { code: authCheck.code, message: authCheck.message } };
  }

  if (!input.symbol || !input.displayNameFa) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'symbol و displayNameFa الزامی هستند' },
    };
  }

  if (
    input.provider === 'manual' &&
    (!input.singleRate || Number.parseFloat(input.singleRate) <= 0)
  ) {
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'برای حالت دستی، singleRate الزامی است' },
    };
  }

  try {
    const created = await prisma.exchangeRate.create({
      data: {
        symbol: input.symbol,
        name: input.displayNameFa,
        currency: input.symbol,
        displayNameFa: input.displayNameFa,
        group: input.group,
        unit: input.unit,
        divisor: input.divisor,
        decimals: input.decimals,
        priority: input.priority,
        provider: input.provider,
        tgjuKey: input.tgjuKey || null,
        singleRate: input.singleRate || null,
        active: input.active ?? true,
        rateType: 'BUY_SELL',
      },
    });
    revalidateTag(TAGS.list);
    revalidateTag(TAGS.ticker);
    revalidateTag(TAGS.exchangeRates);
    safeRevalidateTag('exchange-rates');
    return { success: true, id: created.id };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'P2002') {
      return { success: false, error: { code: 'DUPLICATE', message: 'این symbol قبلاً ثبت شده' } };
    }
    return { success: false, error: { code: 'DB_ERROR', message: err.message ?? 'خطای دیتابیس' } };
  }
}

type UpdateInput = Partial<{
  displayNameFa: string;
  group: string;
  unit: string;
  divisor: number;
  decimals: number;
  priority: number;
  provider: 'auto' | 'manual';
  tgjuKey: string | null;
  singleRate: string | null;
  active: boolean;
}>;

/** ادمین: به‌روزرسانی. */
export async function updateMarketRate(
  id: string,
  input: UpdateInput,
): Promise<{ success: true } | { success: false; error: { code: string; message: string } }> {
  const authCheck = await requireAdmin();
  if (!authCheck.success) {
    return { success: false, error: { code: authCheck.code, message: authCheck.message } };
  }

  try {
    await prisma.exchangeRate.update({
      where: { id },
      data: input,
    });
    revalidateTag(TAGS.list);
    revalidateTag(TAGS.ticker);
    revalidateTag(TAGS.exchangeRates);
    safeRevalidateTag('exchange-rates');
    return { success: true };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { success: false, error: { code: 'DB_ERROR', message: err.message ?? 'خطای دیتابیس' } };
  }
}

/** ادمین: حذف. */
export async function deleteMarketRate(
  id: string,
): Promise<{ success: true } | { success: false; error: { code: string; message: string } }> {
  const authCheck = await requireAdmin();
  if (!authCheck.success) {
    return { success: false, error: { code: authCheck.code, message: authCheck.message } };
  }

  try {
    await prisma.exchangeRate.delete({ where: { id } });
    revalidateTag(TAGS.list);
    revalidateTag(TAGS.ticker);
    revalidateTag(TAGS.exchangeRates);
    safeRevalidateTag('exchange-rates');
    return { success: true };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { success: false, error: { code: 'DB_ERROR', message: err.message ?? 'خطای دیتابیس' } };
  }
}
