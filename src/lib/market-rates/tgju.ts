/**
 * tgju — scraper multi-page برای tgju.org
 * ----------------------------------------------------------------------------
 * بدون کلید API، بدون ثبت‌نام. صفحات tgju.org رو با یک `User-Agent` مرورگر
 * واقعی fetch می‌کنه و table `<tr data-market-nameslug="...">` رو پارس می‌کنه.
 *
 * صفحات پشتیبانی‌شده (2026-07-05):
 *   - homepage         `/`                 prefix `''` (homepage keys)
 *   - transfer         `/transfer`         prefix `transfer_`
 *   - currency         `/currency`         prefix `currency_`
 *   - currency-minor   `/currency-minor`   prefix `minor_`
 *   - bank             `/bank`             prefix `bank_`
 *   - coin             `/coin`             prefix `coin_` (سکه) + `bubble_` (حباب)
 *   - sana             `/sana`             prefix `sana_` (صرافی ملی — خرید/فروش)
 *   - gold-global      `/gold-global`      prefix `global_` (طلا/نقره/پلاتین جهانی)
 *   - local-markets    `/local-markets`    prefix `local_` (بازار داخلی)
 *
 * ساختار HTML همه‌ی صفحات یکسان است (verified 2026-07-05):
 *   <tr data-market-nameslug="KEY" data-price="1,234,567">
 *     <th>نام فارسی</th>
 *     <td class="nf">1,234,567</td>
 *     <td class="nf"><span class="high">(0.69%) 12,250,000</span></td>
 *     <td>low</td>
 *     <td>high</td>
 *     <td>time</td>
 *   </tr>
 *
 * صفحات coin: کلیدهای `*_blubber` (حباب سکه) → prefix `bubble_` می‌گیرن.
 * صفحات sana: کلیدها به شکل `sana_buy_*` و `sana_sell_*` (جفت صرافی ملی).
 *
 * هشدار: scraper است نه API رسمی. اگه tgju ساختار HTML رو عوض کنه، باید
 * selector ها رو به‌روز کنیم. TGJU توسط ArvanCloud پشتیبانی می‌شه، پس فعلاً
 * rate-limit شدید نداره ولی:
 *   - اگه زیاد request بزنیم، IP ممکنه بلاک بشه.
 *   - صفحه ممکنه تغییر کنه.
 *   - ENV: `TGJU_SCRAPER_ENABLED=false` → کل scraper غیرفعال می‌شه
 *     (fallback به USDT/Exir در assembler فعال می‌شه).
 *
 * خروجی هر صفحه: `TgjuResponse = Record<key, { value, change }>`
 *   - `value` همیشه ریال خام (÷10 = تومان) — مگر طلای جهانی (دلار/اونس)
 *   - `change` درصد روزانه
 *
 * نمونه‌ی key ها:
 *   homepage: `price_dollar_rl`, `sekee`, `geram18`, `ons`
 *   transfer: `transfer_transfer_usd`, `transfer_transfer_usd2` (دلار شرکتی/شخصی)
 *   coin:     `coin_sekee`, `bubble_sekee`
 *   sana:     `sana_sana_buy_usd`, `sana_sana_sell_usd`
 * ----------------------------------------------------------------------------
 */

const TGJU_URL = 'https://www.tgju.org/';
const REQUEST_TIMEOUT_MS = 15_000;

export interface TgjuItem {
  /** مقدار — ریال خام (÷10 = تومان). مگر طلای جهانی که USD/oz است. */
  value: number;
  /** درصد تغییر (مثبت = سبز، منفی = قرمز). */
  change: number;
}

export type TgjuResponse = Record<string, TgjuItem>;

export type TgjuPageId =
  | 'homepage'
  | 'transfer'
  | 'currency'
  | 'currency-minor'
  | 'bank'
  | 'coin'
  | 'sana'
  | 'gold-global'
  | 'local-markets';

export interface FetchTgjuResult {
  ok: boolean;
  data?: TgjuResponse;
  error?: 'http-error' | 'parse-error' | 'timeout' | 'network-error' | 'disabled';
  status?: number;
  latencyMs?: number;
  /** تعداد آیتم‌های پارس‌شده — برای health check. */
  itemCount?: number;
  /** key source — کدام پارسر این خروجی رو ساخته. */
  page?: TgjuPageId;
}

/* --------------------------------------------------------------------------
 *  Per-page spec
 *
 *  برای هر صفحه:
 *   - url پیش‌فرض (با ENV قابل override)
 *   - keyPrefix: پیشوند اضافه‌شده به tgjuKey خام
 *   - keyRewrite: Map از rawKey → prefix متفاوت (مثلاً blubber → bubble_)
 *   - keyFilter: RegExp — فقط کلیدهایی که match کنن (مثلاً sana فقط sana_*)
 *   - isUsd: آیا مقادیر به ریال است؟ (طلای جهانی USD/oz است — جدا نگه داشته می‌شه
 *     در unit handling، ولی parser مقدار را بدون تبدیل برمی‌گردونه)
 * ------------------------------------------------------------------------*/

export interface TgjuPageSpec {
  url: string;
  /** پیشوند پیش‌فرض برای همه‌ی کلیدها (مثلاً 'transfer_' یا ''). */
  keyPrefix: string;
  /** Map از rawKey → prefix متفاوت. */
  keyRewrite?: ReadonlyMap<string, string>;
  /** RegExp — اگه تعریف بشه فقط کلیدهای match شده پذیرفته می‌شن. */
  keyFilter?: RegExp;
}

const PAGE_SPECS: Readonly<Record<TgjuPageId, TgjuPageSpec>> = {
  homepage: {
    url: TGJU_URL,
    keyPrefix: '',
  },
  transfer: {
    url: 'https://www.tgju.org/transfer',
    keyPrefix: 'transfer_',
  },
  currency: {
    url: 'https://www.tgju.org/currency',
    keyPrefix: 'currency_',
  },
  'currency-minor': {
    url: 'https://www.tgju.org/currency-minor',
    keyPrefix: 'minor_',
  },
  bank: {
    url: 'https://www.tgju.org/bank',
    keyPrefix: 'bank_',
  },
  coin: {
    url: 'https://www.tgju.org/coin',
    keyPrefix: 'coin_',
    // حباب سکه → prefix متفاوت.
    // نکته: `coin_blubber` در TGJU همان حباب سکه امامی است (نه عمومی).
    keyRewrite: new Map([
      ['coin_blubber', 'bubble_emami'],
      ['sekeb_blubber', 'bubble_bahar'],
      ['nim_blubber', 'bubble_nim'],
      ['rob_blubber', 'bubble_rob'],
      ['gerami_blubber', 'bubble_gerami'],
    ]),
  },
  sana: {
    url: 'https://www.tgju.org/sana',
    keyPrefix: 'sana_',
  },
  'gold-global': {
    url: 'https://www.tgju.org/gold-global',
    keyPrefix: 'global_',
  },
  'local-markets': {
    url: 'https://www.tgju.org/local-markets',
    keyPrefix: 'local_',
  },
};

/* --------------------------------------------------------------------------
 *  ENV gating
 * ------------------------------------------------------------------------*/

/** آیا scraper اصلی فعال است؟ */
function isScraperEnabled(): boolean {
  const v = (process.env.TGJU_SCRAPER_ENABLED ?? 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

/**
 * آیا scraper یک صفحه‌ی خاص فعال است؟
 * ENV pattern: `TGJU_PAGE_<UPPER_WITH_DASH_AS_UNDERSCORE>_ENABLED`.
 * پیش‌فرض همه: true (اگه homepage فعال باشه).
 */
function isPageEnabled(page: TgjuPageId): boolean {
  if (!isScraperEnabled()) return false;
  const envName = `TGJU_PAGE_${page.toUpperCase().replace(/-/g, '_')}_ENABLED`;
  const v = (process.env[envName] ?? 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

/** URL یک صفحه — با ENV override. */
function getPageUrl(page: TgjuPageId): string {
  const envName = `TGJU_PAGE_${page.toUpperCase().replace(/-/g, '_')}_URL`;
  const envUrl = process.env[envName]?.trim();
  if (envUrl) return envUrl;
  return PAGE_SPECS[page].url;
}

/* --------------------------------------------------------------------------
 *  Shared helpers
 * ------------------------------------------------------------------------*/

/** پاکسازی عدد (انگلیسی/فارسی/عربی) → parseFloat. */
export function parseLocalizedNumber(raw: string): number {
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let s = raw.trim();
  for (let i = 0; i < 10; i++) {
    s = s.split(fa[i]).join(i.toString()).split(ar[i]).join(i.toString());
  }
  // حذف جداکننده‌ی هزارگان (کاما یا نقطه)
  s = s.replace(/,/g, '');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * پارس یک ردیف `<tr data-market-nameslug="KEY" data-price="...">...</tr>`.
 *
 * ساختار HTML واقعی (verified 2026-07-05) — همه‌ی صفحات:
 *   <tr data-market-nameslug="KEY" data-price="1,234,567">
 *     <th>نام فارسی</th>
 *     <td class="nf">1,234,567</td>
 *     <td class="nf"><span class="high">(0.69%) 12,250,000</span></td>
 *     ...
 *   </tr>
 *
 * استراتژی:
 *   1. value: اولویت با `data-price="..."`، fallback به اولین `<td class="nf">`
 *   2. change: اولویت با `(0.69%)` در data-title، fallback به `<td class="nf">`
 *      بعدی
 */
function parseRow(rowHtml: string): { value: number; change: number } | null {
  // value: data-price اول (تمیزتر و reliable تر)
  let value: number | null = null;
  const dp = rowHtml.match(/data-price="([^"]+)"/);
  if (dp) {
    value = parseLocalizedNumber(dp[1]);
    if (!Number.isFinite(value) || value <= 0) value = null;
  }
  // fallback: اولین <td class="nf">
  if (value === null) {
    const nf = rowHtml.match(/<td class="nf"[^>]*>([^<]+)<\/td>/);
    if (nf) {
      const v = parseLocalizedNumber(nf[1]);
      if (Number.isFinite(v) && v > 0) value = v;
    }
  }
  if (value === null) return null;

  // change: درصد — اول از data-title (تمیزتر)، بعد از td.nf دوم
  let change = 0;
  const titleMatch = rowHtml.match(/data-title="([^"]+)"/);
  if (titleMatch) {
    const cm = titleMatch[1].match(/\(([+-]?[\d.]+)%\)/);
    if (cm) {
      const c = Number.parseFloat(cm[1]);
      if (Number.isFinite(c)) change = c;
    }
  }
  // fallback: اولین <td class="nf"> بعد از قیمت
  if (change === 0) {
    const allNf = rowHtml.match(/<td class="nf"[^>]*>([\s\S]*?)<\/td>/g) ?? [];
    for (const cell of allNf) {
      const cm = cell.match(/\(([+-]?[\d.]+)%\)/);
      if (cm) {
        const c = Number.parseFloat(cm[1]);
        if (Number.isFinite(c)) {
          change = c;
          break;
        }
      }
    }
  }

  return { value, change };
}

/**
 * تبدیل raw tgjuKey → canonical key بر اساس page spec.
 *
 * مثال:
 *   page='coin', raw='sekee'           → 'coin_sekee'
 *   page='coin', raw='sekee_blubber'   → 'bubble_emami' (override)
 *   page='coin', raw='coin_blubber'    → 'bubble_general' (override)
 *   page='transfer', raw='transfer_usd' → 'transfer_transfer_usd'
 *
 * (نکته: در صفحات transfer/currency/bank/coin، کلیدهای خام خودشون
 *  prefix دارن — مثل `transfer_usd`. وقتی `keyPrefix='transfer_'`
 *  اضافه می‌شه، نتیجه `transfer_transfer_usd` می‌شه. این برای تشخیص
 *  origin در Map مفیده ولی در tgjuKeys.ts ما rawKey رو با prefix ذخیره
 *  می‌کنیم نه با double prefix. اینجا یک‌لایه prefix اضافه می‌کنیم
 *  که در tgjuKeys.ts با آن سازگار است.)
 */
function canonicalizeKey(page: TgjuPageId, rawKey: string): string {
  const spec = PAGE_SPECS[page];
  // 1. keyRewrite اولویت دارد (مثلاً blubber → bubble_)
  const override = spec.keyRewrite?.get(rawKey);
  if (override) return override;

  const pagePrefix = spec.keyPrefix;

  // 2. اگه rawKey خودش با prefix صفحه شروع می‌شه → خود rawKey (مثل
  //    'transfer_usd' در صفحه transfer که key canonical است)
  if (pagePrefix && rawKey.startsWith(pagePrefix)) {
    return rawKey;
  }

  // 3. اگه rawKey با prefix یک صفحه‌ی دیگه شروع می‌شه → strip و prefix فعلی بزن
  //    (مثل 'price_usd' در صفحه currency → 'currency_price_usd')
  if (pagePrefix) {
    for (const otherPage of Object.keys(PAGE_SPECS) as TgjuPageId[]) {
      if (otherPage === page) continue;
      const otherPrefix = PAGE_SPECS[otherPage].keyPrefix;
      if (otherPrefix && rawKey.startsWith(otherPrefix)) {
        return `${pagePrefix}${rawKey.slice(otherPrefix.length)}`;
      }
    }
  }

  // 4. هیچ‌کدوم → prefix فعلی بزن
  return pagePrefix ? `${pagePrefix}${rawKey}` : rawKey;
}

/**
 * پارس تمام ردیف‌های `<tr data-market-nameslug="...">` در یک HTML.
 * فقط row هایی که value قابل پارس داشته باشن نگه داشته می‌شن.
 */
function parseTableRows(page: TgjuPageId, html: string): TgjuResponse {
  const out: TgjuResponse = {};
  const rowRe = /<tr\b[^>]*data-market-nameslug="([^"]+)"[\s\S]*?<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const rawKey = m[1];
    const finalKey = canonicalizeKey(page, rawKey);
    if (out[finalKey]) continue; // اولین occurrence (برخی کلیدها تکرار شدن)
    const parsed = parseRow(m[0]);
    if (parsed) out[finalKey] = parsed;
  }
  return out;
}

/* --------------------------------------------------------------------------
 *  Generic page fetcher
 * ------------------------------------------------------------------------*/

/**
 * HTML خام رو در dev روی دیسک ذخیره می‌کنه برای دیباگ ساختار.
 * فقط وقتی `TGJU_DEBUG_DUMP=1` — در production false.
 */
const DEBUG_DUMP = (process.env.TGJU_DEBUG_DUMP ?? 'false').trim() === '1';

async function debugDump(page: TgjuPageId, html: string): Promise<void> {
  if (!DEBUG_DUMP) return;
  try {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const path = await import('node:path');
    const dir = path.join(process.cwd(), '.tgju-debug');
    await mkdir(dir, { recursive: true });
    const safeId = page.replace(/[^a-z0-9_-]/gi, '_');
    const file = path.join(dir, `tgju-${safeId}-${Date.now()}.html`);
    await writeFile(file, html, 'utf8');
    // eslint-disable-next-line no-console
    console.info(`[tgju] debug dump saved: ${file}`);
  } catch {
    // ignore — debug never breaks the request
  }
}

/**
 * Scraping یک صفحه — با timeout، realistic UA، graceful error handling.
 */
export async function fetchTgjuPage(page: TgjuPageId): Promise<FetchTgjuResult> {
  if (!isPageEnabled(page)) {
    return { ok: false, error: 'disabled', page };
  }

  const url = getPageUrl(page);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const t0 = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      next: { revalidate: 300 },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - t0;

    if (!response.ok) {
      return { ok: false, error: 'http-error', status: response.status, latencyMs, page };
    }

    const html = await response.text();
    if (DEBUG_DUMP) await debugDump(page, html);
    const data = parseTableRows(page, html);
    const itemCount = Object.keys(data).length;

    if (itemCount === 0) {
      return { ok: false, error: 'parse-error', status: response.status, latencyMs, page };
    }

    return { ok: true, data, itemCount, latencyMs, status: response.status, page };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      error: isAbort ? 'timeout' : 'network-error',
      latencyMs: Date.now() - t0,
      page,
    };
  }
}

/* --------------------------------------------------------------------------
 *  Convenience wrappers
 * ------------------------------------------------------------------------*/

/** کد قدیمی که `fetchTgjuLatest()` صدا می‌زد همچنان کار کنه. */
export async function fetchTgjuLatest(): Promise<FetchTgjuResult> {
  return fetchTgjuPage('homepage');
}

/** همه‌ی صفحات فعال را به‌صورت موازی scrape کن. خروجی per-page نگه داشته می‌شه. */
export async function fetchAllTgjuPages(): Promise<Record<TgjuPageId, FetchTgjuResult>> {
  const allIds: TgjuPageId[] = [
    'homepage',
    'transfer',
    'currency',
    'currency-minor',
    'bank',
    'coin',
    'sana',
    'gold-global',
    'local-markets',
  ];
  // فقط صفحات فعال (perf optimization)
  const ids = allIds.filter((id) => isPageEnabled(id));
  const settled = await Promise.allSettled(ids.map((id) => fetchTgjuPage(id)));

  // out را با default disabled پر کن برای صفحات غیرفعال
  const out = {} as Record<TgjuPageId, FetchTgjuResult>;
  for (const id of allIds) {
    if (!isPageEnabled(id)) {
      out[id] = { ok: false, error: 'disabled', page: id };
    }
  }
  ids.forEach((id, i) => {
    const s = settled[i];
    if (s.status === 'fulfilled') {
      out[id] = s.value;
    } else {
      out[id] = {
        ok: false,
        error: 'network-error',
        page: id,
      };
    }
  });
  return out;
}

/** لیست همه‌ی page IDs (برای admin/UI نمایش). */
export const ALL_TGJU_PAGE_IDS: readonly TgjuPageId[] = [
  'homepage',
  'transfer',
  'currency',
  'currency-minor',
  'bank',
  'coin',
  'sana',
  'gold-global',
  'local-markets',
];