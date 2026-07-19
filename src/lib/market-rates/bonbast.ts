// src/lib/market-rates/bonbast.ts
//
// Scraper for bonbast.com — reliable Iranian FX rate aggregator.
//
// Source: POST https://bonbast.com/converter
//   Returns cross-rates relative to EUR (e.g. USD=1.14, AFN=75.5).
//   We also fetch the IRR value (ریال به ازای ۱ یورو) from the same endpoint,
//   then derive each currency's Toman price:
//     toman_per_unit = (1 / cross_rate) * irr_per_eur / 10
//
// For AFN specifically, bonbast shows it in their main table which means
// it is a real market rate (free market Herat/Tehran).
//
// Limitations:
//   - No separate buy/sell — only mid rate is available without Firebase JS
//   - The /converter endpoint is used by their own converter widget; it is
//     not a documented API but has been stable since 2019.
//   - Rate-limit: one request per cache window (60 s default) is safe.

const BONBAST_URL = 'https://bonbast.com/converter';
const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface BonbastRates {
  /** Raw cross-rates from bonbast — keyed by ISO currency code, value = units per 1 EUR. */
  crossRates: Record<string, number>;
  /** IRR per 1 EUR (from the same response). Used to derive Toman prices. */
  irrPerEur: number;
  /** USD per 1 EUR (derived). */
  usdPerEur: number;
  /** Fetch timestamp. */
  fetchedAt: Date;
}

export interface BonbastTomanRate {
  /** ISO currency code (e.g. 'AFN', 'USD'). */
  code: string;
  /** Mid-rate in Toman per 1 unit of currency. */
  toman: number;
  /** Raw cross-rate (units per 1 EUR). */
  crossRate: number;
}

function isBonbastEnabled(): boolean {
  const v = (process.env.BONBAST_SCRAPER_ENABLED ?? 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

/**
 * Fetch all exchange rates from bonbast.com/converter.
 * Returns null on any failure (network, parse, disabled).
 */
export async function fetchBonbastRates(): Promise<BonbastRates | null> {
  if (!isBonbastEnabled()) return null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(BONBAST_URL, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://bonbast.com/',
        Origin: 'https://bonbast.com',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: '',
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(t);

    if (!res.ok) return null;

    const json = (await res.json()) as Record<string, unknown>;
    const crossRates: Record<string, number> = {};

    for (const [k, v] of Object.entries(json)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        crossRates[k.toUpperCase()] = v;
      }
    }

    const irrPerEur = crossRates.IRR ?? 0;
    const usdPerEur = crossRates.USD ?? 1;

    if (irrPerEur <= 0) return null;

    return { crossRates, irrPerEur, usdPerEur, fetchedAt: new Date() };
  } catch {
    clearTimeout(t);
    return null;
  }
}

/**
 * Convert a bonbast cross-rate to Toman per 1 unit of currency.
 *
 * Formula: toman = (1 / crossRate) * irrPerEur / 10
 *   where crossRate = units of currency per 1 EUR.
 *
 * Example: AFN = 75.5 → 1 EUR = 75.5 AFN
 *   → 1 AFN = (1/75.5) EUR = (1/75.5) * irrPerEur / 10 Toman
 */
export function crossRateToToman(crossRate: number, irrPerEur: number): number {
  if (crossRate <= 0 || irrPerEur <= 0) return 0;
  return ((1 / crossRate) * irrPerEur) / 10;
}

/**
 * Get Toman rates for a specific set of currency codes.
 * Returns null if bonbast is unreachable.
 */
export async function getBonbastTomanRates(codes: string[]): Promise<BonbastTomanRate[] | null> {
  const data = await fetchBonbastRates();
  if (!data) return null;

  const result: BonbastTomanRate[] = [];
  for (const code of codes) {
    const crossRate = data.crossRates[code.toUpperCase()];
    if (!crossRate || crossRate <= 0) continue;
    const toman = crossRateToToman(crossRate, data.irrPerEur);
    if (toman > 0) result.push({ code, toman, crossRate });
  }
  return result;
}
