// src/actions/market-rates.ts
'use server';

import prisma from '@/lib/db';
import { assembleMarketRates } from '@/lib/market-rates';
import type { MarketRateItem } from '@/lib/market-rates';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache, safeRevalidateTag, safeSet } from '@/lib/safe-cache';

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
 * کش برای assemble.
 * 2026-08-01: unstable_cache → safeCache. assembleMarketRates خودش
 * try/catch دارد ولی unstable_cache خطا را از طریق cache boundary
 * re-throw می‌کرد. safeCache fallback به [] می‌دهد.
 * 2026-08-08-perf: اگر همهٔ منابع fail شوند (خروجی خالی)، throw می‌کنیم تا
 * مسیر SWR دادهٔ خوبِ قبلی را حفظ کند — نه اینکه [] جای آن را بگیرد.
 */
export const getMarketRates = safeCache(
  async (): Promise<MarketRateItem[]> => {
    const items = await assembleMarketRates();
    if (items.length === 0) throw new Error('ALL_SOURCES_FAILED');
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
    //  - cron refresh-market-rates با primeMarketRatesCache کش را هم تازه می‌کند.
    ttl: MARKET_RATES_TTL,
    swr: true,
    tags: [TAGS.ticker, TAGS.list],
  },
);

/**
 * 2026-08-08-perf: cron نرخ‌های تازه‌ی assemble را مستقیم در safeCache صفحات
 * می‌ریزد (fullKey = 'market-rates' — چون getMarketRates آرگومان ندارد).
 * قبلاً cron فقط DB را به‌روز می‌کرد و صفحات هنوز منتظر انقضای کش بودند.
 */
export function primeMarketRatesCache(items: MarketRateItem[]): void {
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
