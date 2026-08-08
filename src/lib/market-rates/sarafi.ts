// src/lib/market-rates/sarafi.ts
//
// Fetcher for sarafi.af/api/rates — Sarai Shahzada (Kabul) exchange rates.
//
// Source: GET https://sarafi.af/api/rates
//   Returns 20 currencies with buy_rate / sell_rate in AFN per 1 unit.
//   No authentication required; JSON response.
//
// Fields: { id, buy_rate, sell_rate, currency, base_currency:"AFN",
//           decimal_count, created_at, updated_at }
//
// Usage in assembler: SARA_<CURRENCY> → buyValue = buy_rate (AFN), sellValue = sell_rate (AFN)

const SARAFI_URL = 'https://sarafi.af/api/rates';
// 2026-08-08-perf: 12s → 4s — کران سخت برای مسیر رندر (نگاه کنید tgju.ts)
const REQUEST_TIMEOUT_MS = 4_000;

export interface SarafiRateEntry {
  currency: string;
  /** Buy rate in AFN per 1 unit of currency (صرافی از مردم می‌خرد). */
  buyRate: number;
  /** Sell rate in AFN per 1 unit of currency (صرافی به مردم می‌فروشد). */
  sellRate: number;
  decimals: number;
  updatedAt: Date;
}

export interface SarafiRates {
  /** Keyed by ISO currency code (e.g. 'USD', 'EUR'). */
  rates: Record<string, SarafiRateEntry>;
  fetchedAt: Date;
}

interface SarafiApiRow {
  id: number;
  buy_rate: string;
  sell_rate: string;
  currency: string;
  base_currency: string;
  decimal_count: number;
  updated_at: string;
}

function isSarafiEnabled(): boolean {
  const v = (process.env.SARAFI_SCRAPER_ENABLED ?? 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

/**
 * Fetch live buy/sell rates from sarafi.af (Sarai Shahzada).
 * Returns null on failure (network, parse, disabled).
 */
export async function fetchSarafiRates(): Promise<SarafiRates | null> {
  if (!isSarafiEnabled()) return null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(SARAFI_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Referer: 'https://sarafi.af/',
      },
      signal: controller.signal,
      next: { revalidate: 120 },
    });
    clearTimeout(t);

    if (!res.ok) return null;

    const json = (await res.json()) as SarafiApiRow[];
    if (!Array.isArray(json) || json.length === 0) return null;

    const rates: Record<string, SarafiRateEntry> = {};
    const fetchedAt = new Date();

    for (const row of json) {
      const buy = Number.parseFloat(row.buy_rate);
      const sell = Number.parseFloat(row.sell_rate);
      if (!Number.isFinite(buy) || !Number.isFinite(sell)) continue;
      if (buy <= 0 || sell <= 0) continue;
      const code = row.currency.toUpperCase();
      rates[code] = {
        currency: code,
        buyRate: buy,
        sellRate: sell,
        decimals: row.decimal_count ?? 2,
        updatedAt: row.updated_at ? new Date(row.updated_at) : fetchedAt,
      };
    }

    if (Object.keys(rates).length === 0) return null;
    return { rates, fetchedAt };
  } catch {
    clearTimeout(t);
    return null;
  }
}
