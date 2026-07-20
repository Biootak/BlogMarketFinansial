/**
 * /api/exchange-quotes/active
 * ----------------------------------------------------------------------------
 * quote های ACTIVE صرافی‌ها برای نمایش عمومی در سایت.
 *
 * Query:
 *   currency  - کد ارز اختیاری (مثلاً USD، EUR) — اگر خالی همه ارزها برمی‌گردد
 *
 * خروجی: { success: true, data: { quotes: QuoteRow[], currencies: string[] } }
 * کش ۳۰ ثانیه‌ای با tags ['exchange-quotes']
 * ----------------------------------------------------------------------------
 */

import { getActiveCurrencies, getActiveQuotes } from '@/actions/exchange-quotes';
import { safeCache } from '@/lib/safe-cache';
import { NextResponse } from 'next/server';

interface BuildArgs {
  currency?: string;
}

async function buildActiveQuotes({ currency }: BuildArgs) {
  const [quotes, currencies] = await Promise.all([
    getActiveQuotes(currency),
    getActiveCurrencies(),
  ]);
  return { quotes, currencies };
}

const getCachedActiveQuotes = safeCache(
  buildActiveQuotes,
  { quotes: [], currencies: [] },
  { key: 'exchange-quotes:active', ttl: 30, tags: ['exchange-quotes', 'exchange-rates'] },
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const currency = url.searchParams.get('currency') ?? undefined;

  try {
    const data = await getCachedActiveQuotes({ currency });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: 'خطا در دریافت قیمت‌ها' } },
      { status: 500 },
    );
  }
}
