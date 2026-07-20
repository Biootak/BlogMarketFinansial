/**
 * GET /api/dev/rate-list-seed
 * Dev-only: نرخ‌های bonbast را در DB ذخیره می‌کند.
 *
 * در محیط development نیاز به auth ندارد — همان منطق sync-rate-lists
 * را مستقیم اجرا می‌کند تا DB را seed کند.
 *
 * استفاده: http://localhost:3000/api/dev/rate-list-seed
 */
import prisma from '@/lib/db';
import { fetchBonbastBuySell } from '@/lib/market-rates/bonbast';
import { bonbastToRateItems } from '@/lib/market-rates/bonbast-rate-items';
import { revalidateTag } from '@/lib/revalidate';
import { safeRevalidateTag } from '@/lib/safe-cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const LIST_TITLE = 'نرخ بازار آزاد تهران';

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev-only' }, { status: 404 });
  }

  const t0 = Date.now();

  // ── 1. Fetch bonbast buy/sell ─────────────────────────────────────────
  const bs = await fetchBonbastBuySell();

  if (!bs || Object.keys(bs.rates).length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'BONBAST_UNAVAILABLE',
        detail: 'fetchBonbastBuySell returned null or empty — bonbast.com ممکن است در دسترس نباشد',
        hint: 'برای تشخیص بیشتر: http://localhost:3000/api/dev/bonbast-debug را باز کنید',
        durationMs: Date.now() - t0,
      },
      { status: 502 },
    );
  }

  // ── 2. تبدیل به RateItem ────────────────────────────────────────────
  const rateItems = bonbastToRateItems(bs);

  // ── 3. Upsert در DB ─────────────────────────────────────────────────
  const existing = await prisma.rateList.findFirst({
    where: { title: LIST_TITLE },
    select: { id: true },
  });

  if (existing) {
    await prisma.rateList.update({
      where: { id: existing.id },
      data: { rates: rateItems as never, isActive: true },
    });
  } else {
    await prisma.rateList.create({
      data: { title: LIST_TITLE, rates: rateItems as never, isActive: true },
    });
  }

  // ── 4. Bust caches ───────────────────────────────────────────────────
  revalidateTag('rate-lists');
  revalidateTag('ticker');
  safeRevalidateTag('rate-lists');
  safeRevalidateTag('ticker');

  return NextResponse.json({
    success: true,
    data: {
      source: 'bonbast.com',
      fetchedAt: bs.fetchedAt,
      rateCount: rateItems.length,
      listTitle: LIST_TITLE,
      action: existing ? 'updated' : 'created',
      durationMs: Date.now() - t0,
      sampleRates: rateItems.slice(0, 5),
    },
  });
}
