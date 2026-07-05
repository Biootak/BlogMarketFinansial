/**
 * /api/money-transfer/rates
 * ----------------------------------------------------------------------------
 * نرخ لحظه‌ای تبدیل ارز + مقایسه‌ی quote بین provider های مختلف.
 *
 * Query:
 *   symbol  - کد ارز (پیش‌فرض: USD)
 *   amount  - مبلغ ارز مبدأ (پیش‌فرض: 100)
 *
 * خروجی: TransferApiResponse (در `lib/money-transfer/types.ts`)
 *
 * منطق:
 *   1) `assembleFreeMarketRates` نرخ بازار را می‌گیرد (TGJU → USDT → FX).
 *   2) روی آن، quote هر provider از `TRANSFER_PROVIDERS` محاسبه می‌شود.
 *   3) کش ۶۰ ثانیه‌ای با `safeCache` + tag 'exchange-rates'.
 * ----------------------------------------------------------------------------
 */

import { assembleFreeMarketRates } from '@/lib/freeMarketRates';
import { convertSourceToToman } from '@/lib/money-transfer/calculator';
import { TRANSFER_PROVIDERS, type TransferProvider } from '@/lib/money-transfer/providers';
import type { ProviderQuote, TransferApiResponse } from '@/lib/money-transfer/types';
import { safeCache } from '@/lib/safe-cache';
import { NextResponse } from 'next/server';

interface BuildArgs {
  symbol: string;
  amount: number;
}

const DEFAULT_SYMBOL = 'USD';
const MIN_AMOUNT = 0.0001;
const MAX_AMOUNT = 1_000_000_000;

function toFiniteAmount(raw: string | null): number {
  if (!raw) return 100;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 100;
  if (n < MIN_AMOUNT) return MIN_AMOUNT;
  if (n > MAX_AMOUNT) return MAX_AMOUNT;
  return n;
}

function toSymbol(raw: string | null): string {
  if (!raw) return DEFAULT_SYMBOL;
  return raw.trim().toUpperCase().slice(0, 8);
}

async function buildQuotes({ symbol, amount }: BuildArgs): Promise<TransferApiResponse> {
  const market = await assembleFreeMarketRates();
  const item = market.items.find((i) => i.symbol === symbol);

  if (!item) {
    throw new Error(`نرخ برای ${symbol} یافت نشد`);
  }

  const baseRate = item.priceToman;
  const providers: ProviderQuote[] = TRANSFER_PROVIDERS.filter((p) => p.active).map(
    (p: TransferProvider) => {
      const conv = convertSourceToToman({
        sourceAmount: amount,
        rateSourceToToman: baseRate,
        provider: p,
      });
      return {
        providerId: p.id,
        providerName: p.name,
        providerKind: p.kind,
        spreadPercent: p.spreadPercent,
        flatFeeToman: p.flatFeeToman,
        speedMinutes: p.speedMinutes,
        features: p.features,
        marketToman: Math.round(conv.marketToman),
        spreadToman: Math.round(conv.spreadToman),
        flatFeeTomanApplied: Math.round(conv.flatFeeToman),
        finalToman: Math.round(conv.finalToman),
        markupPercent: Number(conv.markupPercent.toFixed(2)),
      };
    },
  );

  return {
    baseTomanRate: baseRate,
    baseSymbol: item.symbol,
    baseDisplayName: item.name,
    baseChangePercent: item.change,
    sourceAmount: amount,
    updatedAt: new Date().toISOString(),
    providers,
  };
}

const FALLBACK_RESPONSE: TransferApiResponse = {
  baseTomanRate: 0,
  baseSymbol: DEFAULT_SYMBOL,
  baseDisplayName: '—',
  baseChangePercent: 0,
  sourceAmount: 100,
  updatedAt: new Date(0).toISOString(),
  providers: [],
};

const getCachedQuotes = safeCache(buildQuotes, FALLBACK_RESPONSE, {
  key: 'money-transfer:quotes',
  ttl: 60,
  tags: ['exchange-rates', 'money-transfer'],
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = toSymbol(url.searchParams.get('symbol'));
  const amount = toFiniteAmount(url.searchParams.get('amount'));

  try {
    const data = await getCachedQuotes({ symbol, amount });
    if (data.baseTomanRate === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'RATE_UNAVAILABLE', message: 'نرخ لحظه‌ای در دسترس نیست' },
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطای نامشخص';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL', message },
      },
      { status: 500 },
    );
  }
}
