// src/lib/market-rates/bonbast.ts
import { rialToToman, tomanToRial } from '@/lib/market-rates/units';
//
// Scraper for bonbast.com — reliable Iranian FX rate aggregator.
//
// How it works (verified 2026-07):
//
//  1. GET https://www.bonbast.com/
//     HTML page embeds a one-time `param` token inside the JS snippet:
//       $.post('/json', {param: "HASH,SALT,TIMESTAMP"}, function(json) { ... })
//     This param is a CSRF-like token tied to the current session cookie
//     and expires in ~5 minutes.
//
//  2. POST https://www.bonbast.com/json  (with param from step 1)
//     Returns JSON with all currency rates:
//       { usd1: "61000", usd2: "60800", eur1: "...", eur2: "...", afn1: "...", ... }
//     Key convention:
//       CODE1 = Sell (صرافی به مردم می‌فروشد — Toman)
//       CODE2 = Buy  (صرافی از مردم می‌خرد — Toman)
//     Also includes date fields: year, month, day, hour, minute, second, weekday
//     and gold/coin fields: emami1, azadi1, gol18, ounce, etc.
//
//  Rate-limit: one full cycle (GET + POST) per cache window (60 s default) is safe.
//  Old approach used GET / for HTML parsing with class="buy2"/"sell2" selectors —
//  those are now dynamically injected by JS from the /json endpoint, not in static HTML.

const BONBAST_URL = 'https://www.bonbast.com/';
const BONBAST_JSON_URL = 'https://www.bonbast.com/json';
// 2026-08-08-perf: 12s → 4s — کران سخت برای مسیر رندر (نگاه کنید tgju.ts)
const REQUEST_TIMEOUT_MS = 4_000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

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

/**
 * Buy/sell pair for a single currency from bonbast.com.
 * Both values are in Toman.
 */
export interface BonbastBuySellRate {
  /** ISO currency code (e.g. 'USD', 'EUR'). */
  code: string;
  /** صرافی از مردم می‌خرد — Toman per 1 unit. */
  buy: number;
  /** صرافی به مردم می‌فروشد — Toman per 1 unit. */
  sell: number;
}

export interface BonbastBuySellRates {
  /** Keyed by uppercase ISO code. */
  rates: Record<string, BonbastBuySellRate>;
  fetchedAt: Date;
}

function isBonbastEnabled(): boolean {
  const v = (process.env.BONBAST_SCRAPER_ENABLED ?? 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

/** Strip thousands separators and parse to float. */
function parsePrice(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null) return Number.NaN;
  const s = String(raw).replace(/,/g, '').trim();
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : Number.NaN;
}

/**
 * Extract the one-time `param` token from the bonbast.com HTML.
 *
 * The token is embedded as:
 *   $.post('/json', {param: "HASH,SALT,YYYY-MM-DD-HH-MM-SS"}, function(json) { ... })
 *
 * Returns null if not found.
 */
function extractParam(html: string): string | null {
  // Primary pattern: param: "TOKEN"
  const m = html.match(/param:\s*["']([a-f0-9]{32},[A-Za-z0-9]+,[0-9-]+)["']/);
  if (m) return m[1];
  // Fallback: {param: "TOKEN"} (single quotes)
  const m2 = html.match(/\{param:\s*["']([^"']+)["']/);
  if (m2) return m2[1];
  return null;
}

/**
 * Fetch buy/sell rates from bonbast.com.
 *
 * Two-step process:
 *   1. GET / to extract the one-time param token + session cookie.
 *   2. POST /json with param to get live rates JSON.
 *
 * JSON response keys (verified 2026-07):
 *   usd1 = sell (Toman), usd2 = buy (Toman)
 *   eur1 = sell, eur2 = buy
 *   aed1/aed2, afn1/afn2, gbp1/gbp2, try1/try2, etc.
 *
 * Returns null on any failure.
 * Returns empty rates map (not null) when reachable but no data parsed.
 */
export async function fetchBonbastBuySell(): Promise<BonbastBuySellRates | null> {
  if (!isBonbastEnabled()) return null;

  // ── Step 1: fetch HTML to get param + cookies ──────────────────────────
  const ctrl1 = new AbortController();
  const t1 = setTimeout(() => ctrl1.abort(), REQUEST_TIMEOUT_MS);

  let html: string;
  let setCookieHeader: string | null = null;

  try {
    const res1 = await fetch(BONBAST_URL, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: ctrl1.signal,
      // IMPORTANT: not `cache:'no-store'`. These scrapes run inside
      // `getMarketRates` (safeCache / unstable_cache, ttl 60s), which is the
      // single cache boundary. A `no-store` fetch here tells Next.js this
      // route is dynamic at request time — the home page (static/ISR) would
      // flip to dynamic on every request and throw "Page changed from static
      // to dynamic at runtime". The outer cache already prevents re-fetching
      // more than once per 60s window, so forcing the data cache here only
      // duplicates work the outer layer does.
      cache: 'force-cache',
    });
    clearTimeout(t1);
    if (!res1.ok) return null;
    html = await res1.text();
    // capture session cookie if present
    setCookieHeader = res1.headers.get('set-cookie');
  } catch {
    clearTimeout(t1);
    return null;
  }

  const param = extractParam(html);
  if (!param) return null;

  // ── Step 2: POST /json with param ─────────────────────────────────────
  const ctrl2 = new AbortController();
  const t2 = setTimeout(() => ctrl2.abort(), REQUEST_TIMEOUT_MS);

  try {
    const reqHeaders: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Referer: BONBAST_URL,
      Accept: 'application/json, text/javascript, */*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    };
    // forward session cookie so server recognises the param
    if (setCookieHeader) {
      // extract cookie name=value pairs from set-cookie header
      const cookieVal = setCookieHeader
        .split(',')
        .map((c) => c.split(';')[0].trim())
        .join('; ');
      if (cookieVal) reqHeaders.Cookie = cookieVal;
    }

    const res2 = await fetch(BONBAST_JSON_URL, {
      method: 'POST',
      headers: reqHeaders,
      body: `param=${encodeURIComponent(param)}`,
      signal: ctrl2.signal,
      cache: 'force-cache',
    });
    clearTimeout(t2);
    if (!res2.ok) return null;

    const json = (await res2.json()) as Record<string, unknown>;

    // {"rest":"1"} means param expired — return null so assembler falls back
    if ('rest' in json) return null;

    const rates: Record<string, BonbastBuySellRate> = {};
    const fetchedAt = new Date();

    // Iterate over all keys of form CODE1 (sell) + CODE2 (buy)
    // Known codes from bonbast: USD EUR GBP CHF CAD AUD SEK NOK DKK AED JPY TRY CNY SAR INR MYR RUB THB SGD HKD AZN AMD AFN KWD IQD BHD OMR QAR
    const seen = new Set<string>();
    for (const key of Object.keys(json)) {
      // key pattern: e.g. "usd1", "usd2", "eur1", "eur2"
      const m = key.match(/^([a-z]{2,4})(1|2)$/);
      if (!m) continue;
      const code = m[1].toUpperCase();
      seen.add(code);
    }

    for (const code of seen) {
      const sell = parsePrice(json[`${code.toLowerCase()}1`] as string | number | null | undefined);
      const buy = parsePrice(json[`${code.toLowerCase()}2`] as string | number | null | undefined);
      if (Number.isFinite(sell) && Number.isFinite(buy) && sell > 0 && buy > 0) {
        rates[code] = { code, buy, sell };
      }
    }

    return { rates, fetchedAt };
  } catch {
    clearTimeout(t2);
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
  // (1 / crossRate) * irrPerEur = نرخ به «ریال» → تومان
  return rialToToman((1 / crossRate) * irrPerEur);
}

/**
 * Derive mid-rates from buy/sell pairs for use as BonbastRates fallback.
 *
 * Used by assembler when TGJU is unavailable for cross-rate derivation.
 * irrPerEur is derived from eur mid-rate × 10.
 */
export function fetchBonbastRatesFromBuySell(bs: BonbastBuySellRates): BonbastRates {
  const crossRates: Record<string, number> = {};

  // Mid-rates in Toman per unit
  const midRates: Record<string, number> = {};
  for (const [code, rate] of Object.entries(bs.rates)) {
    midRates[code] = (rate.buy + rate.sell) / 2;
  }

  // irrPerEur = EUR mid (Toman) → Rial
  const eurMid = midRates.EUR ?? 0;
  const irrPerEur = tomanToRial(eurMid);

  if (irrPerEur > 0) {
    // Build cross-rates (units per 1 EUR) from Toman mid-rates
    // crossRate[CODE] = eurMid / midRate[CODE]  (units of CODE per 1 EUR)
    for (const [code, mid] of Object.entries(midRates)) {
      if (mid > 0) crossRates[code] = eurMid / mid;
    }
    // IRR itself
    crossRates.IRR = irrPerEur;
    crossRates.EUR = 1;
  }

  const usdPerEur = crossRates.USD ?? 1;

  return { crossRates, irrPerEur, usdPerEur, fetchedAt: bs.fetchedAt };
}

/**
 * Fetch all exchange rates from bonbast.com (mid-rate, for assembler fallback).
 *
 * Previously used POST /converter; now derives mid-rates from buy/sell JSON.
 * Returns null on any failure.
 */
export async function fetchBonbastRates(): Promise<BonbastRates | null> {
  const bs = await fetchBonbastBuySell();
  if (!bs) return null;
  return fetchBonbastRatesFromBuySell(bs);
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
