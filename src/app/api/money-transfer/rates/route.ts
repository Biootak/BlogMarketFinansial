import { assembleMarketRates } from '@/lib/market-rates';
import { convertSourceToToman } from '@/lib/money-transfer/calculator';
import { type TransferProvider, loadActiveTransferProviders } from '@/lib/money-transfer/providers';
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
  // Validate input is a numeric string
  if (raw !== null && raw !== '' && !/^-?\d*\.?\d+$/.test(raw.trim())) {
    return 100; // Return default if invalid format
  }
  const n = raw ? Number.parseFloat(raw) : 100;
  return Number.isFinite(n) ? Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, n)) : 100;
}
function toSymbol(raw: string | null): string {
  const symbol = (raw?.trim().toUpperCase() || DEFAULT_SYMBOL).slice(0, 8);
  // Validate symbol format (e.g., USD, EUR, etc.)
  if (!/^[A-Z]{3,8}$/.test(symbol)) {
    return DEFAULT_SYMBOL;
  }
  return symbol;
}
async function buildQuotes({ symbol, amount }: BuildArgs): Promise<TransferApiResponse> {
  const rates = await assembleMarketRates();
  const item =
    rates.find((r) => r.symbol === symbol) ??
    rates.find((r) => r.symbol === `IRAN_${symbol}`) ??
    rates.find((r) => r.symbol.endsWith(`_${symbol}`));
  if (!item) throw new Error('rate-not-found');
  const providers = await loadActiveTransferProviders();
  const quotes: ProviderQuote[] = providers.map((p: TransferProvider) => {
    const conv = convertSourceToToman({
      sourceAmount: amount,
      rateSourceToToman: item.value,
      provider: p,
    });
    return {
      providerId: p.id,
      providerName: p.name,
      providerKind: p.kindLabel,
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
  });
  return {
    baseTomanRate: item.value,
    baseSymbol: item.symbol,
    baseDisplayName: item.displayNameFa,
    baseChangePercent: item.changePercent,
    sourceAmount: amount,
    updatedAt: new Date().toISOString(),
    providers: quotes,
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
    if (data.baseTomanRate === 0)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'RATE_UNAVAILABLE', message: 'نرخ لحظه‌ای در دسترس نیست' },
        },
        { status: 503 },
      );
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'RATES_UNAVAILABLE', message: 'نرخ تبدیل موقتاً در دسترس نیست' },
      },
      { status: 503 },
    );
  }
}
