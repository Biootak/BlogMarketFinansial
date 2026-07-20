/**
 * GET /api/dev/rate-list-debug
 * Dev-only: تست کامل pipeline نرخ‌ها برای اسلایدر صفحه اصلی.
 * نشان می‌دهد در هر مرحله چه اتفاقی می‌افتد.
 *
 * برای استفاده در مرورگر: http://localhost:3000/api/dev/rate-list-debug
 */
import { getActiveRateListsOrCryptoFallback } from '@/actions/rate-lists';
import { fetchBonbastBuySell } from '@/lib/market-rates/bonbast';
import { bonbastToRateItems } from '@/lib/market-rates/bonbast-rate-items';
import { parseRateItem } from '@/lib/rateItem';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev-only' }, { status: 404 });
  }

  const steps: Record<string, unknown> = {};

  // ── Step 1: fetchBonbastBuySell ────────────────────────────────────────
  let bs: Awaited<ReturnType<typeof fetchBonbastBuySell>> = null;
  try {
    bs = await fetchBonbastBuySell();
    steps.bonbast = bs
      ? {
          ok: true,
          codesCount: Object.keys(bs.rates).length,
          codes: Object.keys(bs.rates),
          USD: bs.rates.USD ?? null,
          EUR: bs.rates.EUR ?? null,
          AFN: bs.rates.AFN ?? null,
          AED: bs.rates.AED ?? null,
          fetchedAt: bs.fetchedAt,
        }
      : { ok: false, error: 'returned null — param expired or bonbast unreachable' };
  } catch (e) {
    steps.bonbast = { ok: false, error: String(e) };
  }

  // ── Step 2: bonbastToRateItems ─────────────────────────────────────────
  if (bs) {
    try {
      const items = bonbastToRateItems(bs);
      steps.rateItems = {
        ok: true,
        count: items.length,
        sample: items.slice(0, 5),
      };

      // ── Step 3: parseRateItem روی اولین آیتم ──────────────────────────
      if (items.length > 0) {
        const firstItem = items[0];
        if (firstItem) {
          const parsed = parseRateItem(firstItem);
          steps.parseCheck = {
            raw: firstItem,
            parsed,
            isPair: parsed.isPair,
            buyNum: parsed.buyNum,
            sellNum: parsed.sellNum,
          };
        }
      }
    } catch (e) {
      steps.rateItems = { ok: false, error: String(e) };
    }
  }

  // ── Step 4: DB RateList ────────────────────────────────────────────────
  try {
    const { default: prisma } = await import('@/lib/db');
    const lists = await prisma.rateList.findMany({
      where: { isActive: true },
      select: { id: true, title: true, isActive: true, updatedAt: true },
      take: 10,
    });
    steps.dbRateLists = {
      ok: true,
      count: lists.length,
      lists,
    };
  } catch (e) {
    steps.dbRateLists = { ok: false, error: String(e) };
  }

  // ── Step 5: getActiveRateListsOrCryptoFallback (همان چیزی که PulseSection می‌خواند)
  try {
    const result = await getActiveRateListsOrCryptoFallback();
    steps.finalRateLists = {
      ok: true,
      count: result.length,
      lists: result.map((l) => ({
        id: l.id,
        title: l.title,
        isActive: l.isActive,
        rateCount: l.rates.length,
        sampleRates: l.rates.slice(0, 3),
      })),
    };
  } catch (e) {
    steps.finalRateLists = { ok: false, error: String(e) };
  }

  const allOk = bs !== null && (steps.rateItems as { ok?: boolean })?.ok === true;

  return NextResponse.json({
    summary: allOk
      ? '✅ pipeline سالم است — bonbast در دسترس است'
      : '❌ مشکل در pipeline — جزئیات را ببینید',
    steps,
  });
}
