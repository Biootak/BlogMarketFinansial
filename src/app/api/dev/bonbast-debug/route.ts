/**
 * GET /api/dev/bonbast-debug
 * Dev-only: نمایش خروجی واقعی fetchBonbastBuySell() برای بررسی parse.
 */
import { fetchBonbastBuySell } from '@/lib/market-rates/bonbast';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'dev-only' }, { status: 404 });
  }

  const result = await fetchBonbastBuySell();

  if (!result) {
    return NextResponse.json({
      ok: false,
      error: 'fetchBonbastBuySell returned null — param expired or site unreachable',
    });
  }

  const codes = Object.keys(result.rates);

  return NextResponse.json({
    ok: true,
    fetchedAt: result.fetchedAt,
    totalCodes: codes.length,
    allCodes: codes,
    USD: result.rates['USD'] ?? null,
    EUR: result.rates['EUR'] ?? null,
    AED: result.rates['AED'] ?? null,
    AFN: result.rates['AFN'] ?? null,
    allRates: result.rates,
  });
}
