/**
 * rateItem — single source of truth for parsing RateList rows.
 *
 * RateList rows store a free-form `value` string in the `RateList.rates`
 * JSON column. Three shapes are supported:
 *
 *   "1234"               → single rate (no buy/sell split)
 *   "1234|5678"          → buy | sell, both numbers
 *   "خرید: 1234 | فروش: 5678"  → Persian-prefixed buy/sell
 *
 * Consumers across the app used to inline `split('|')` + `.replace('خرید:', '')`
 * which led to drift. This helper is the only one that knows the format.
 *
 * Replaces:
 *   - src/app/(site)/money-transfer/RateListGrid.tsx (lines 178-184)
 *   - src/app/(site)/(home)/designs/CompactRateBridge.tsx (parseRateValue, extractNumeric)
 */

import type { RateItem } from '@/types/types';

export interface ParsedRateItem {
  /** Original title (unchanged). */
  title: string;
  /** Buy value as a string, or null if not present. */
  buy: string | null;
  /** Sell value as a string, or null if not present. */
  sell: string | null;
  /** Suffix after the buy number, e.g. "افغانی" / "تومان" (best-effort). */
  buySuffix: string;
  /** Suffix after the sell number, e.g. "افغانی" / "تومان" (best-effort). */
  sellSuffix: string;
  /** Extracted numeric portion of buy. 0 if not parseable. */
  buyNum: number;
  /** Extracted numeric portion of sell. 0 if not parseable. */
  sellNum: number;
  /** True when the value contains "|" and represents a buy/sell pair. */
  isPair: boolean;
}

const BUY_PREFIX = /^خرید\s*[:：]?\s*/i;
const SELL_PREFIX = /^فروش\s*[:：]?\s*/i;

const NUM_RE = /[\d,٬\.]+/;
const STRIP_NUM_RE = /[\d,٬\.\-+]+/g;

/**
 * Parse a RateItem into a structured shape. Safe to call with empty/missing
 * values; in that case buy and sell will be null and num values will be 0.
 */
export function parseRateItem(item: RateItem): ParsedRateItem {
  const raw = String(item.value ?? '').trim();
  const title = item.title ?? '';

  if (!raw) {
    return {
      title,
      buy: null,
      sell: null,
      buySuffix: '',
      sellSuffix: '',
      buyNum: 0,
      sellNum: 0,
      isPair: false,
    };
  }

  if (raw.includes('|')) {
    const parts = raw.split('|').map((p) => p.trim());
    const buyRaw = (parts[0] ?? '').replace(BUY_PREFIX, '').trim();
    const sellRaw = (parts[1] ?? '').replace(SELL_PREFIX, '').trim();
    return {
      title,
      buy: buyRaw || null,
      sell: sellRaw || null,
      buySuffix: extractSuffix(buyRaw),
      sellSuffix: extractSuffix(sellRaw),
      buyNum: extractNumeric(buyRaw),
      sellNum: extractNumeric(sellRaw),
      isPair: true,
    };
  }

  // single value
  return {
    title,
    buy: raw,
    sell: null,
    buySuffix: extractSuffix(raw),
    sellSuffix: '',
    buyNum: extractNumeric(raw),
    sellNum: 0,
    isPair: false,
  };
}

/**
 * Best-effort suffix extraction. The "1234 افغانی" form has the suffix
 * as the non-numeric trailing characters.
 */
function extractSuffix(s: string): string {
  if (!s) return '';
  return s.replace(STRIP_NUM_RE, '').trim();
}

/**
 * Extract the first number from a string like "1234 افغانی" or "1,234 تومان".
 * Returns 0 if nothing parseable.
 */
function extractNumeric(s: string | null | undefined): number {
  if (!s) return 0;
  const match = s.match(NUM_RE);
  if (!match) return 0;
  return parseFloat(match[0].replace(/[٬,]/g, '')) || 0;
}

/**
 * Group parsed items by their parent rate-list source. Helpful when the
 * caller needs to render a 3-column grid (forex / gold / crypto) or to
 * detect a "Sara-ye Shahzadeh" buy/sell bridge pattern.
 */
export interface GroupedRateItems {
  /** All parsed items flattened, in the order they were given. */
  flat: Array<ParsedRateItem & { sourceListId: string; sourceListTitle: string }>;
  /** Grouped by source list id, preserving order. */
  byList: Array<{
    id: string;
    title: string;
    items: ParsedRateItem[];
  }>;
}

export function groupRateItems(
  lists: Array<{ id: string; title: string; rates: RateItem[] }>,
): GroupedRateItems {
  const flat: GroupedRateItems['flat'] = [];
  const byList: GroupedRateItems['byList'] = [];

  for (const list of lists) {
    if (!list.rates || list.rates.length === 0) continue;
    const parsed = list.rates.map(parseRateItem);
    byList.push({ id: list.id, title: list.title, items: parsed });
    for (const item of parsed) {
      flat.push({ ...item, sourceListId: list.id, sourceListTitle: list.title });
    }
  }

  return { flat, byList };
}
