// src/app/api/cron/sync-rate-lists/route.ts
//
// نرخ‌های خرید/فروش bonbast.com را در جدول RateList در DB ذخیره می‌کند.
// cron-job.org (ر.ک deploy/HEROKU.md مرحله ۵) این endpoint را هر ۵ دقیقه
// با هدر Authorization صدا می‌زند.
//
// جریان:
//   1. fetchBonbastBuySell() → نرخ‌های live خرید/فروش
//   2. bonbastToRateItems()  → تبدیل به فرمت RateItem (shared lib)
//   3. upsert RateList "نرخ بازار آزاد تهران" در DB
//   4. revalidateTag('rate-lists') → cache bust برای اسلایدر صفحه اصلی
//
// Auth: Bearer CRON_SECRET (constant-time, header only)

import { verifyCronSecret } from '@/lib/cron-auth';
import prisma from '@/lib/db';
import { fetchBonbastBuySell } from '@/lib/market-rates/bonbast';
import { bonbastToRateItems } from '@/lib/market-rates/bonbast-rate-items';
import { revalidateTag } from '@/lib/revalidate';
import { safeRevalidateTag } from '@/lib/safe-cache';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

const LIST_TITLE = 'نرخ بازار آزاد تهران';

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}

async function handleSync(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const t0 = Date.now();

  // ── 1. Fetch bonbast buy/sell ──────────────────────────────────────────
  const bs = await fetchBonbastBuySell();

  if (!bs || Object.keys(bs.rates).length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'BONBAST_UNAVAILABLE',
        detail: 'fetchBonbastBuySell returned null or empty — site may be unreachable',
        durationMs: Date.now() - t0,
      },
      { status: 502 },
    );
  }

  // ── 2. تبدیل به RateItem ─────────────────────────────────────────────
  const rateItems = bonbastToRateItems(bs);

  if (rateItems.length === 0) {
    return NextResponse.json(
      { success: false, error: 'NO_RATES_PARSED', durationMs: Date.now() - t0 },
      { status: 502 },
    );
  }

  // ── 3. Upsert در DB ──────────────────────────────────────────────────
  const existing = await prisma.rateList.findFirst({
    where: { title: LIST_TITLE },
    select: { id: true },
  });

  if (existing) {
    await prisma.rateList.update({
      where: { id: existing.id },
      data: {
        rates: rateItems as unknown as import('@prisma/client').Prisma.InputJsonValue,
        isActive: true,
      },
    });
  } else {
    await prisma.rateList.create({
      data: {
        title: LIST_TITLE,
        rates: rateItems as unknown as import('@prisma/client').Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }

  // ── 4. Bust caches ────────────────────────────────────────────────────
  // Next.js Data Cache (unstable_cache)
  revalidateTag('rate-lists');
  revalidateTag('ticker');
  revalidateTag('exchange-rates');
  // safeCache in-memory store — باید جداگانه bust شود وگرنه
  // getRateLists (ttl=300s) و getActiveRateListsOrCryptoFallback (ttl=60s)
  // تا TTL خود stale می‌مانند و نرخ جدید در اسلایدر نمایش داده نمی‌شود.
  safeRevalidateTag('rate-lists');
  safeRevalidateTag('ticker');
  safeRevalidateTag('exchange-rates');

  return NextResponse.json({
    success: true,
    data: {
      source: 'bonbast.com',
      fetchedAt: bs.fetchedAt,
      rateCount: rateItems.length,
      listTitle: LIST_TITLE,
      action: existing ? 'updated' : 'created',
      durationMs: Date.now() - t0,
    },
  });
}
