/**
 * POST /api/cron/push-rates
 *
 * معماری (2026-08-13): scraping TGJU روی GitHub Actions انجام می‌شه (ماشین
 * رایگان، بیرون از dyno) و نتیجه به اینجا push می‌شه. Web dyno هیچ HTTP
 * خروجی به TGJU نمی‌زنه.
 *
 * 2026-08-14: بدنهٔ اصلی به persistMarketRates منتقل شد (همان منطقی که
 * refresh-market-rates هم استفاده می‌کند) تا دو مسیر تازه‌سازی هماهنگ بمانند.
 *
 * Auth: Bearer CRON_SECRET — فقط از GitHub Actions یا cron-job.org صدا زده می‌شه.
 *
 * Body: { rates: MarketRateItem[] }
 * Web dyno فقط:
 *   1. snapshot JSON می‌نویسه (همون که getMarketRates می‌خونه)
 *   2. DB update می‌کنه
 *   3. cache را bust می‌کنه
 */

import { persistMarketRates } from '@/actions/market-rates';
import { verifyCronSecret } from '@/lib/cron-auth';
import type { MarketRateItem } from '@/lib/market-rates/types';
import { NextResponse } from 'next/server';

// B-06 fix: Zod schema برای validation ورودی rates — جلوگیری از rate manipulation.
// قبلاً body فقط با `as MarketRateItem[]` cast می‌شد بدون هیچ validation.
import { z } from 'zod';

const RateItemSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Z0-9_/]+$/i),
  displayNameFa: z.string().min(1).max(100),
  group: z.enum(['afghan', 'iran-forex', 'iran-coin', 'iran-gold', 'global', 'minor']),
  unit: z.enum(['toman', 'rial', 'usd', 'eur', 'afn', 'pound']),
  divisor: z.number().finite().positive(),
  decimals: z.number().int().min(0).max(8),
  priority: z.number().int().min(0),
  value: z.number().finite().positive(),
  buyValue: z.number().finite().positive().optional(),
  sellValue: z.number().finite().positive().optional(),
  spread: z.number().finite().optional(),
  changePercent: z.number().finite(),
  provider: z.enum(['auto', 'manual']),
  updatedAt: z.coerce.date(),
});

const PushRatesBodySchema = z.object({
  rates: z.array(RateItemSchema).min(1).max(500),
});

export async function POST(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  let items: MarketRateItem[];
  try {
    const body = await req.json();
    const parsed = PushRatesBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'INVALID_BODY',
          detail: parsed.error.errors[0]?.message ?? 'rates array required',
        },
        { status: 400 },
      );
    }
    items = parsed.data.rates;
  } catch {
    return NextResponse.json({ error: 'PARSE_ERROR' }, { status: 400 });
  }

  const { updated, snapshotCount } = await persistMarketRates(items);

  return NextResponse.json({
    success: true,
    data: { received: items.length, updated, snapshotCount },
  });
}
