/**
 * tgju — scraper client for tgju.org
 * ----------------------------------------------------------------------------
 * بدون کلید API، بدون ثبت‌نام. صفحه‌ی اصلی tgju.org رو با یک
 * `User-Agent` مرورگر واقعی fetch می‌کنه و جدول `<tr data-market-nameslug=...>`
 * رو با regex پارس می‌کنه.
 *
 * هشدار: این یک scraper است، نه API رسمی. اگه tgju ساختار HTML رو
 * عوض کنه، باید selector ها رو به‌روز کنیم. TGJU توسط ArvanCloud پشتیبانی
 * می‌شه (نه Cloudflare)، پس فعلاً rate-limit شدید نداره ولی:
 *   - اگه زیاد request بزنیم، IP ممکنه بلاک بشه.
 *   - صفحه ممکنه تغییر کنه.
 *   - این ماژول فقط در `getCachedTickerData` (cron handler) فراخوانی می‌شه.
 *
 * پلن جایگزین: اگه TGJU scraper دیگه کار نکرد، فقط ENV متغیر
 * `TGJU_SCRAPER_ENABLED=false` بذارید تا fallback به USDT/Exir فعال بشه.
 *
 * خروجی: `TgjuResponse = Record<key, { value: number; change: number }>`
 *   - `value` به تومان (TGJU خودش به تومان برمی‌گردونه، نه ریال)
 *   - `change` درصد تغییر روزانه
 *
 * نمونه‌ی key ها: `price_dollar_rl`, `retail_sekee`, `geram18`, `mesghal`
 * لیست کامل در `MAP` در `freeMarketRates.ts`.
 * ----------------------------------------------------------------------------
 */

const TGJU_URL = 'https://www.tgju.org/';
const REQUEST_TIMEOUT_MS = 12_000;

export interface TgjuItem {
  /** مقدار به تومان */
  value: number;
  /** درصد تغییر (مثبت = سبز، منفی = قرمز) */
  change: number;
}

/**
 * TgjuResponse — نگاشت کلید به آیتم.
 * کلید canonical tgju.org مثل `price_dollar_rl`, `retail_sekee`.
 */
export type TgjuResponse = Record<string, TgjuItem>;

export interface FetchTgjuResult {
  ok: boolean;
  data?: TgjuResponse;
  error?: 'http-error' | 'parse-error' | 'timeout' | 'network-error' | 'disabled';
  status?: number;
  latencyMs?: number;
  /** تعداد آیتم‌های پارس‌شده — برای health check */
  itemCount?: number;
}

/**
 * آیا scraper فعال است؟ با env variable قابل غیرفعال‌سازی.
 * پیش‌فرض: `true`.
 */
function isScraperEnabled(): boolean {
  const v = (process.env.TGJU_SCRAPER_ENABLED ?? 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

/**
 * پارس کردن یک ردیف `<tr data-market-nameslug="KEY">...</tr>`.
 * خروجی: `{ key, value, change }` یا `null` اگه قابل پارس نبود.
 *
 * ساختار HTML واقعی (verified 2026-06-20):
 *   <tr data-market-nameslug="price_dollar_rl" ...>
 *     <th>دلار</th>
 *     <td class="nf">1,625,200</td>          ← قیمت اصلی
 *     <td class="nf"><span class="high">(+3.85%) ...</span></td>
 *     ...
 *   </tr>
 *
 * نکته: اعداد با کامای انگلیسی فرمت شدن (`1,625,200`). کاما رو حذف می‌کنیم.
 */
function parseRow(rowHtml: string, key: string): { value: number; change: number } | null {
  // نام فارسی (اختیاری، برای لاگ)
  // const nameMatch = rowHtml.match(/<th[^>]*>([^<]+)<\/th>/);
  // const name = nameMatch ? nameMatch[1].trim() : key;

  // قیمت اصلی — اولین <td class="nf">
  const priceMatch = rowHtml.match(/<td class="nf"[^>]*>([^<]+)<\/td>/);
  if (!priceMatch) return null;
  const priceStr = priceMatch[1].trim().replace(/,/g, '');
  const value = Number.parseFloat(priceStr);
  if (!Number.isFinite(value) || value <= 0) return null;

  // درصد تغییر — الگوی `(3.85%)` یا `(-1.2%)`
  const changeMatch = rowHtml.match(/\(([+-]?[\d.]+)%\)/);
  const change = changeMatch ? Number.parseFloat(changeMatch[1]) : 0;

  return { value, change };
}

/**
 * پارس کل صفحه — همه‌ی ردیف‌های `<tr data-market-nameslug="...">`.
 */
function parseTgjuHtml(html: string): TgjuResponse {
  const out: TgjuResponse = {};
  // الگو: <tr ... data-market-nameslug="KEY" ...> ... </tr>
  const rowRe = /<tr\b[^>]*data-market-nameslug="([^"]+)"[\s\S]*?<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const key = m[1];
    if (out[key]) continue; // اولین occurrence (برخی کلیدها تکرار شدن)
    const parsed = parseRow(m[0], key);
    if (parsed) out[key] = parsed;
  }
  return out;
}

/**
 * Scraping اصلی — با timeout، realistic UA، و graceful error handling.
 */
export async function fetchTgjuLatest(): Promise<FetchTgjuResult> {
  if (!isScraperEnabled()) {
    return { ok: false, error: 'disabled' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const t0 = Date.now();

  try {
    const response = await fetch(TGJU_URL, {
      method: 'GET',
      headers: {
        // User-Agent واقعی مرورگر تا request های scraper طبیعی به نظر برسن.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      next: { revalidate: 300 }, // 5 دقیقه CDN cache
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - t0;

    if (!response.ok) {
      return { ok: false, error: 'http-error', status: response.status, latencyMs };
    }

    const html = await response.text();
    const data = parseTgjuHtml(html);
    const itemCount = Object.keys(data).length;

    if (itemCount === 0) {
      return { ok: false, error: 'parse-error', status: response.status, latencyMs };
    }

    return { ok: true, data, itemCount, latencyMs, status: response.status };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      error: isAbort ? 'timeout' : 'network-error',
      latencyMs: Date.now() - t0,
    };
  }
}
