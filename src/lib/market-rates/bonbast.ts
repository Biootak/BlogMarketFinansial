// src/lib/market-rates/bonbast.ts
//
// Scraper for bonbast.com — reliable Iranian FX rate aggregator.
//
// Two endpoints:
//
//  1. POST https://bonbast.com/converter
//     Returns cross-rates relative to EUR (e.g. USD=1.14, AFN=75.5) as JSON.
//     Used for mid-rate derivation via:
//       toman_per_unit = (1 / cross_rate) * irr_per_eur / 10
//     Stable since 2019; no authentication required.
//
//  2. GET https://bonbast.com/
//     Main HTML page containing a table with separate buy/sell columns per
//     currency (تومان). Parsed with lightweight regex (no DOM library needed).
//     Table structure (verified 2026-07):
//       <tr id="USD"> ... <td class="buy2">61,000</td> <td class="sell2">61,200</td>
//     The class names `buy2` / `sell2` are the Toman columns (not Rial).
//
// Rate-limit: one request per source per cache window (60 s default) is safe.

const BONBAST_CONVERTER_URL = 'https://bonbast.com/converter';
const BONBAST_MAIN_URL = 'https://bonbast.com/';
const REQUEST_TIMEOUT_MS = 12_000;
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
 * Buy/sell pair for a single currency from bonbast.com main page.
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

/** Strip Persian/Arabic digits and thousands separators → parseFloat. */
function parsePrice(raw: string): number {
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let s = raw.trim();
  for (let i = 0; i < 10; i++) {
    s = s.split(fa[i]).join(i.toString()).split(ar[i]).join(i.toString());
  }
  s = s.replace(/,/g, '').replace(/\s/g, '');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : Number.NaN;
}

/**
 * Fetch all exchange rates from bonbast.com/converter (mid-rate JSON endpoint).
 * Returns null on any failure (network, parse, disabled).
 */
export async function fetchBonbastRates(): Promise<BonbastRates | null> {
  if (!isBonbastEnabled()) return null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(BONBAST_CONVERTER_URL, {
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

/**
 * Fetch buy/sell rates from bonbast.com main HTML page.
 *
 * Parses the main currency table which shows separate Toman buy/sell columns.
 * HTML structure (verified 2026-07):
 *   <tr id="USD">
 *     ...
 *     <td class="buy2">61,000</td>   ← Toman buy (صرافی از مردم می‌خرد)
 *     <td class="sell2">61,200</td>  ← Toman sell (صرافی به مردم می‌فروشد)
 *   </tr>
 *
 * Returns null on network failure or when disabled.
 * Returns an empty rates map (not null) when the page loads but no rows match
 * — so callers can distinguish "unreachable" from "no data".
 */
export async function fetchBonbastBuySell(): Promise<BonbastBuySellRates | null> {
  if (!isBonbastEnabled()) return null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(BONBAST_MAIN_URL, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
        Referer: 'https://bonbast.com/',
      },
      signal: controller.signal,
      // No Next.js caching here — assembler controls the cache window.
      cache: 'no-store',
    });
    clearTimeout(t);

    if (!res.ok) return null;

    const html = await res.text();
    const rates: Record<string, BonbastBuySellRate> = {};
    const fetchedAt = new Date();

    // Match every <tr id="CODE"> block that contains buy2 and sell2 cells.
    // The regex is non-greedy and matches the minimal <tr>…</tr> span.
    const rowRe = /<tr\s+id="([A-Z]{2,6})"[\s\S]*?<\/tr>/gi;
    const buy2Re = /class="buy2"[^>]*>([^<]+)</;
    const sell2Re = /class="sell2"[^>]*>([^<]+)</;

    let m = rowRe.exec(html);
    while (m !== null) {
      const code = m[1].toUpperCase();
      const rowHtml = m[0];

      const buyMatch = buy2Re.exec(rowHtml);
      const sellMatch = sell2Re.exec(rowHtml);

      if (buyMatch && sellMatch) {
        const buy = parsePrice(buyMatch[1]);
        const sell = parsePrice(sellMatch[1]);
        if (Number.isFinite(buy) && Number.isFinite(sell) && buy > 0 && sell > 0) {
          rates[code] = { code, buy, sell };
        }
      }

      m = rowRe.exec(html);
    }

    return { rates, fetchedAt };
  } catch {
    clearTimeout(t);
    return null;
  }
}
