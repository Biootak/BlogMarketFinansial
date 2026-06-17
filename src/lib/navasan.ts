/**
 * Navasan API client
 * ----------------------------------------------------------------------------
 * نرخ‌های بازار ایران از سرویس Navasan (https://navasan.tech).
 *
 *   • Free plan: 120 req/mo, 3-month validity, updates every 2h
 *   • Standard: real-time, 30k req/mo
 *
 * Auth: `api_key` ارسال می‌شه به‌عنوان query param.
 *   - متغیر محیطی: NAVASAN_API_KEY
 *   - اختیاریه؛ اگه نباشه یا نامعتبر باشه، فراخوانی ناکام می‌مونه و
 *     فراخواننده به سراغ fallback (DB / auto-derive) می‌ره.
 *
 * Endpoint صحیح (طبق مستندات رسمی):
 *   GET https://api.navasan.tech/latest/?api_key=...
 *   (نه /v1/latest/ — این 200 برمی‌گردونه ولی body خالیه)
 *
 * پاسخ نمونه:
 *   {
 *     "usd":    { "value": "127800", "change": 1500, ... },
 *     "sekkeh": { "value": "452000000", "change": 3500000, ... },
 *     "usd_buy":{ "value": "153100", "change": -2000, ... },
 *     ...
 *   }
 *
 *   مقدار `value` به **تومان** برگردونده می‌شه (نه ریال). قبلاً در
 *   این کلاینت اشتباهی `/10` می‌زدیم و فرض می‌کردیم ریال است — که
 *   عدد نمایشی را ۱۰ برابر کمتر از واقع نشون می‌داد. حالا **بدون
 *   تبدیل** همان مقدار خام Navasan استفاده می‌شه؛ هر consumer که به
 *   واحد دیگری نیاز داشت، خودش تبدیل می‌کنه.
 * ----------------------------------------------------------------------------
 */

const DEFAULT_BASE = 'https://api.navasan.tech/latest/';
const REQUEST_TIMEOUT_MS = 8_000;

export interface NavasanItem {
  value: string;
  change?: string;
  percent?: string;
  date?: string;
  time?: string;
}

export type NavasanResponse = Record<string, NavasanItem>;

export interface FetchNavasanResult {
  ok: boolean;
  data?: NavasanResponse;
  error?: 'no-key' | 'http-error' | 'parse-error' | 'timeout' | 'network-error';
  status?: number;
  baseUrl?: string;
  latencyMs?: number;
}

function getConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = (process.env.NAVASAN_API_KEY || '').trim();
  const baseUrl = (process.env.NAVASAN_BASE_URL || DEFAULT_BASE).trim();
  return { apiKey, baseUrl };
}

function unwrap(raw: unknown): NavasanResponse | null {
  if (!raw || typeof raw !== 'object') return null;

  // shape 1: flat
  if (Object.values(raw as Record<string, unknown>).every(
    (v) => v && typeof v === 'object' && 'value' in (v as Record<string, unknown>),
  )) {
    return raw as NavasanResponse;
  }

  // shape 2: wrapped
  const r = raw as Record<string, unknown>;
  const data = r.data as Record<string, unknown> | undefined;
  const latest = data?.latest as Record<string, unknown> | undefined;
  if (latest && Object.values(latest).every(
    (v) => v && typeof v === 'object' && 'value' in (v as Record<string, unknown>),
  )) {
    return latest as NavasanResponse;
  }

  return null;
}

export async function fetchNavasanLatest(): Promise<FetchNavasanResult> {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey) return { ok: false, error: 'no-key', baseUrl };

  const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const t0 = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'Biotak/1.0 (+navasan-client)' },
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    const latencyMs = Date.now() - t0;
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, error: 'http-error', status: response.status, baseUrl, latencyMs };
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      return { ok: false, error: 'parse-error', baseUrl, latencyMs, status: response.status };
    }

    const data = unwrap(raw);
    if (!data || Object.keys(data).length === 0) {
      return { ok: false, error: 'parse-error', baseUrl, latencyMs, status: response.status };
    }

    return { ok: true, data, baseUrl, latencyMs, status: response.status };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      error: isAbort ? 'timeout' : 'network-error',
      baseUrl,
      latencyMs: Date.now() - t0,
    };
  }
}
