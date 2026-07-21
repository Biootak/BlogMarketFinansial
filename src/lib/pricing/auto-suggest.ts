/**
 * pricing/auto-suggest.ts — Auto price suggestion for exchange rate quotes
 *
 * Reads current market rates and applies a configurable spread to suggest
 * buy/sell rates for exchange operators.
 *
 * Uses public/data/market-rates.json (snapshot written by refresh-market-rates cron)
 * so it's fast and doesn't add extra DB/network load.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type SuggestedRate = {
  currencyCode: string;
  currencyPair: string;
  marketBuyRate: number;
  marketSellRate: number;
  suggestedBuyRate: number;
  suggestedSellRate: number;
  spreadPercent: number;
  unit: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
};

type MarketRateSnapshot = {
  updatedAt?: string;
  rates?: Array<{
    symbol: string;
    displayNameFa?: string;
    buyValue?: number | null;
    sellValue?: number | null;
    value?: number | null;
    unit?: string;
    provider?: string;
    fetchedAt?: string;
  }>;
};

const CURRENCY_TO_SYMBOL: Record<string, string[]> = {
  USD: ['IRAN_USD', 'AFGHANI_USD', 'BONBAST_USD'],
  EUR: ['IRAN_EUR', 'AFGHANI_EUR', 'BONBAST_EUR'],
  AED: ['IRAN_AED', 'AFGHANI_AED'],
  GBP: ['IRAN_GBP', 'AFGHANI_GBP'],
  AFN: ['AFGHANI_AFN', 'SARA_AFN'],
  TRY: ['IRAN_TRY'],
  SAR: ['IRAN_SAR'],
};

const UNIT_FOR_CURRENCY: Record<string, string> = {
  USD: 'toman',
  EUR: 'toman',
  AED: 'toman',
  GBP: 'toman',
  AFN: 'afn',
  TRY: 'toman',
  SAR: 'toman',
};

async function readMarketSnapshot(): Promise<MarketRateSnapshot | null> {
  try {
    const snapshotPath = join(process.cwd(), 'public', 'data', 'market-rates.json');
    const raw = await readFile(snapshotPath, 'utf-8');
    return JSON.parse(raw) as MarketRateSnapshot;
  } catch {
    return null;
  }
}

function getConfidence(fetchedAt: string | undefined): 'high' | 'medium' | 'low' {
  if (!fetchedAt) return 'low';
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  if (ageMs < 5 * 60 * 1000) return 'high';
  if (ageMs < 30 * 60 * 1000) return 'medium';
  return 'low';
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

export async function getSuggestedRates(params: {
  currencyCode: string;
  spreadPercent?: number;
  unit?: 'toman' | 'afn';
}): Promise<SuggestedRate | null> {
  const { currencyCode, spreadPercent = 1.5 } = params;
  const unit = params.unit ?? UNIT_FOR_CURRENCY[currencyCode] ?? 'toman';

  const snapshot = await readMarketSnapshot();
  if (!snapshot?.rates) return null;

  const candidates = CURRENCY_TO_SYMBOL[currencyCode] ?? [`IRAN_${currencyCode}`];
  let matchedRate: (typeof snapshot.rates)[number] | undefined;

  for (const sym of candidates) {
    const found = snapshot.rates.find((r) => r.symbol === sym);
    if (found && (found.buyValue ?? found.value)) {
      matchedRate = found;
      break;
    }
  }

  if (!matchedRate) return null;

  const buyValue = matchedRate.buyValue ?? matchedRate.value;
  const sellValue = matchedRate.sellValue ?? matchedRate.value;

  if (!buyValue || !sellValue) return null;

  const marketBuyRate = Number(buyValue);
  const marketSellRate = Number(sellValue);

  // For large numbers (toman rates), round to nearest 100
  const roundingBase = marketBuyRate > 1000 ? 100 : 1;

  const suggestedBuyRate = roundToNearest(
    marketBuyRate * (1 - spreadPercent / 100),
    roundingBase,
  );
  const suggestedSellRate = roundToNearest(
    marketSellRate * (1 + spreadPercent / 100),
    roundingBase,
  );

  return {
    currencyCode,
    currencyPair: `${currencyCode}/${unit === 'afn' ? 'AFN' : 'IRR'}`,
    marketBuyRate,
    marketSellRate,
    suggestedBuyRate,
    suggestedSellRate,
    spreadPercent,
    unit,
    source: matchedRate.provider ?? matchedRate.symbol,
    confidence: getConfidence(matchedRate.fetchedAt),
  };
}

const MAJOR_CURRENCIES = ['USD', 'EUR', 'AED', 'GBP'] as const;

export async function getMultiCurrencySuggestions(
  spreadPercent = 1.5,
): Promise<SuggestedRate[]> {
  const results = await Promise.allSettled(
    MAJOR_CURRENCIES.map((code) => getSuggestedRates({ currencyCode: code, spreadPercent })),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<SuggestedRate> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map((r) => r.value);
}
