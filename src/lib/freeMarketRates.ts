/**
 * freeMarketRates — layered free-market data source
 * ----------------------------------------------------------------------------
 * منبع داده‌ی تیکر بازار آزاد (دلار، یورو، طلا، سکه).
 *
 * اولویت برای هر ارز (manual یعنی DB = آخرین چاره):
 *   1) Navasan API    (اگه NAVASAN_API_KEY تنظیم شده و فراخوانی موفق باشه)
 *   2) Auto-derive    (رایگان، همیشه در دسترس):
 *                        - USD از قیمت تتر (Exir) × ضریب طلایی
 *                        - سایر ارزها از FX جهانی × USD
 *   3) ExchangeRate DB  (فقط وقتی ۱ و ۲ هیچ‌کدوم در دسترس نباشن)
 *
 * هیچ‌وقت دو نرخ متفاوت برای یک ارز نمایش داده نمی‌شه.
 * ----------------------------------------------------------------------------
 */

import { fetchExchangeRates } from '@/actions/fetchExchangeRates';
import prisma from '@/lib/db';
import { fetchNavasanLatest, type NavasanResponse } from '@/lib/navasan';

const EXR_BASE = 'https://api.exchangerate-api.com/v4/latest/USD';
const REQUEST_TIMEOUT_MS = 8_000;

/* -------------------------------------------------------------------------- */
/*  ضریب طلایی تتر — فاصله‌ی تتر با دلار بازار آزاد                             */
/* -------------------------------------------------------------------------- */
function getUsdtPremiumPercent(): number {
  const raw = process.env.USDT_PREMIUM_PERCENT;
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 50) return 0;
  return n;
}

/* -------------------------------------------------------------------------- */
/*  Symbol mapping (canonical ↔ Navasan key ↔ FX key)                          */
/* -------------------------------------------------------------------------- */
/*                                                                             */
/*  نگاشت از نام استاندارد ارز (USD, EUR, SEKKEH, ...) به کلید واقعی          */
/*  Navasan در پاسخ API. مثلاً Navasan کلید "try" داره نه "try_".              */
/*                                                                             */

const NAVASAN_KEY: Record<string, string> = {
  USD: 'usd',
  EUR: 'eur',
  GBP: 'gbp',
  AED: 'aed',
  CHF: 'chf',
  CAD: 'cad',
  AUD: 'aud',
  CNY: 'cny',
  JPY: 'jpy',
  RUB: 'rub',
  INR: 'inr',
  TRY: 'try', // ⚠️ Navasan returns "try" — not "try_"
  SEKKEH: 'sekkeh',
  BAHAR: 'bahar',
  NIM: 'nim',
  ROB: 'rob',
  GERAMI: 'gerami',
  GOLD18: '18ayar',
  ABSHODEH: 'abshodeh',
  OUNCE_GOLD: 'xau',
};

const DISPLAY_NAMES: Record<string, string> = {
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  GBP: 'پوند انگلیس',
  AED: 'درهم امارات',
  CHF: 'فرانک سوئیس',
  CAD: 'دلار کانادا',
  AUD: 'دلار استرالیا',
  CNY: 'یوان چین',
  JPY: 'ین ژاپن',
  RUB: 'روبل روسیه',
  INR: 'روپیه هند',
  TRY: 'لیر ترکیه',
  SEKKEH: 'سکه امامی',
  BAHAR: 'سکه بهار آزادی',
  NIM: 'نیم سکه',
  ROB: 'ربع سکه',
  GERAMI: 'سکه گرمی',
  GOLD18: 'طلای ۱۸ عیار (گرم)',
  ABSHODEH: 'مثقال طلای آبشده',
  OUNCE_GOLD: 'انس طلا (جهانی)',
};

const WANTED_CANONICAL: readonly string[] = [
  // Forex
  'USD', 'EUR', 'GBP', 'AED', 'CHF', 'CAD', 'AUD', 'CNY', 'JPY', 'RUB', 'INR', 'TRY',
  // Coins & gold
  'SEKKEH', 'NIM', 'ROB', 'GERAMI', 'GOLD18', 'OUNCE_GOLD',
];

const CRYPTO_LIKE = new Set([
  'BTC', 'ETH', 'USDT', 'XRP', 'LTC', 'BCH', 'EOS',
  'XLM', 'TRX', 'LINK', 'UNI', 'AAVE', 'DOT', 'ADA',
  'DOGE', 'SHIB', 'MATIC', 'SOL', 'AVAX', 'ATOM', 'FTM',
  'SAND', 'MANA', 'AXS', 'BNB', 'DASH',
]);

/* -------------------------------------------------------------------------- */
/*  منبع داده برای هر آیتم                                                    */
/* -------------------------------------------------------------------------- */

export type MarketSource = 'navasan' | 'usdt' | 'fx-derived' | 'db';

export interface FreeMarketItem {
  symbol: string;       // canonical uppercase: 'USD', 'EUR', 'SEKKEH', ...
  name: string;         // نام فارسی
  priceToman: number;   // قیمت به تومان
  change: number;       // درصد تغییر (0 اگه موجود نباشه)
  source: MarketSource;
  /** کلید اصلی در منبع — برای دیباگ. */
  rawKey?: string;
}

/* -------------------------------------------------------------------------- */
/*  Step 1 — Navasan                                                            */
/* -------------------------------------------------------------------------- */

interface ParsedNavasan {
  priceToman: number;
  change: number;
  rawKey: string;
}

function parseNavasanItem(value: unknown): ParsedNavasan | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as { value?: string; percent?: string };
  const rial = Number(v.value);
  if (!Number.isFinite(rial) || rial <= 0) return null;
  const percent = Number(v.percent);
  return {
    priceToman: Math.round(rial / 10), // Rial → Toman
    change: Number.isFinite(percent) ? percent : 0,
    rawKey: '',
  };
}

/** نگاشت canonical → item از Navasan. */
function buildNavasanMap(data: NavasanResponse | null): Map<string, ParsedNavasan> {
  const out = new Map<string, ParsedNavasan>();
  if (!data) return out;
  for (const canonical of WANTED_CANONICAL) {
    const key = NAVASAN_KEY[canonical];
    if (!key) continue;
    const item = parseNavasanItem(data[key]);
    if (item) {
      item.rawKey = key;
      out.set(canonical, item);
    }
  }
  return out;
}

async function fetchNavasanMap(): Promise<Map<string, ParsedNavasan>> {
  const res = await fetchNavasanLatest();
  if (!res.ok || !res.data) return new Map();
  return buildNavasanMap(res.data);
}

/* -------------------------------------------------------------------------- */
/*  Step 2 — USDT (Exir)                                                       */
/* -------------------------------------------------------------------------- */

interface UsdtRate { toman: number; change: number; }

async function getUsdtRate(): Promise<UsdtRate | null> {
  try {
    const r = await fetchExchangeRates();
    if (!r.success || !r.data) return null;
    const usdt = r.data.find((x) => x.symbol.toUpperCase() === 'USDT');
    if (!usdt) return null;
    const irr = usdt.irrPrice; // Exir: ریال
    if (!Number.isFinite(irr) || irr <= 0) return null;
    return { toman: irr / 10, change: usdt.change }; // Rial → Toman
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Step 3 — Global FX (exchangerate-api.com)                                  */
/* -------------------------------------------------------------------------- */

interface FxMap { [currency: string]: number; }

async function getGlobalFxRates(): Promise<FxMap | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(EXR_BASE, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'Biotak/1.0' },
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: FxMap };
    return json?.rates ?? null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

/** کلید FX برای ارز داده‌شده. exchangerate-api.com از ISO استفاده می‌کنه. */
function getFxKey(canonical: string): string | null {
  // اکثر ارزها خود canonical هستن (ISO-style)
  return canonical;
}

/* -------------------------------------------------------------------------- */
/*  Step 4 — DB rows                                                            */
/* -------------------------------------------------------------------------- */

interface DbRow { symbol: string; name: string; price: number; }

async function getDbMarketItems(): Promise<Map<string, DbRow>> {
  try {
    const rows = await prisma.exchangeRate.findMany({
      take: 60,
      orderBy: { createdAt: 'desc' },
    });
    const map = new Map<string, DbRow>();
    for (const row of rows) {
      const sym = row.currency.toUpperCase();
      if (CRYPTO_LIKE.has(sym)) continue;
      if (map.has(sym)) continue;
      const value = row.buyRate || row.singleRate;
      if (!value) continue;
      const price = parseFloat(value);
      if (Number.isNaN(price) || price <= 0) continue;
      map.set(sym, { symbol: sym, name: row.name || sym, price });
    }
    return map;
  } catch {
    return new Map();
  }
}

/* -------------------------------------------------------------------------- */
/*  Diagnostic: لاگ کردن ضریب طلایی مشاهده‌شده (فقط وقتی DB USD داریم)         */
/* -------------------------------------------------------------------------- */

let lastObservedLog = 0;
function logObservedPremium(usdtToman: number, dbUsdToman: number): void {
  if (usdtToman <= 0 || dbUsdToman <= 0) return;
  const observedPercent = ((dbUsdToman - usdtToman) / usdtToman) * 100;
  const envPercent = getUsdtPremiumPercent();
  const now = Date.now();
  if (now - lastObservedLog < 5 * 60_000) return;
  lastObservedLog = now;
  // eslint-disable-next-line no-console
  console.info(
    `[freeMarketRates] premium check: USDT=${Math.round(usdtToman)} ` +
      `DB_USD=${Math.round(dbUsdToman)} → observed=${observedPercent.toFixed(2)}% ` +
      `env=${envPercent}% (delta=${(observedPercent - envPercent).toFixed(2)}%)`,
  );
}

/* -------------------------------------------------------------------------- */
/*  Assemble                                                                   */
/* -------------------------------------------------------------------------- */

export interface AssembledMarket {
  usdRate: number | null;
  usdSource: MarketSource | null;
  items: FreeMarketItem[];
}

export async function assembleFreeMarketRates(): Promise<AssembledMarket> {
  // 1) همه‌ی منابع موازی
  const [navasan, usdt, fx, dbItems] = await Promise.all([
    fetchNavasanMap(),
    getUsdtRate(),
    getGlobalFxRates(),
    getDbMarketItems(),
  ]);

  const items: FreeMarketItem[] = [];

  // 2) USD log: اگه DB USD داریم ضریب طلایی رو مقایسه کن
  const dbUsd = dbItems.get('USD');
  if (dbUsd && usdt) {
    logObservedPremium(usdt.toman, dbUsd.price);
  }

  // 3) برای هر ارز در لیست اصلی، اولویت‌ها رو امتحان کن
  for (const canonical of WANTED_CANONICAL) {
    // Priority 1: Navasan
    const n = navasan.get(canonical);
    if (n) {
      items.push({
        symbol: canonical,
        name: DISPLAY_NAMES[canonical] ?? canonical,
        priceToman: n.priceToman,
        change: n.change,
        source: 'navasan',
        rawKey: n.rawKey,
      });
      continue;
    }

    // Priority 2: Auto-derive
    if (canonical === 'USD' && usdt) {
      const premium = getUsdtPremiumPercent();
      const priceToman = usdt.toman * (1 + premium / 100);
      items.push({
        symbol: 'USD',
        name: DISPLAY_NAMES.USD,
        priceToman: Math.round(priceToman),
        change: usdt.change,
        source: 'usdt',
        rawKey: 'usdt-exir',
      });
      continue;
    }

    if (usdt && fx) {
      const fxKey = getFxKey(canonical);
      if (fxKey) {
        const perUsd = fx[fxKey];
        if (Number.isFinite(perUsd) && perUsd > 0) {
          const priceToman = perUsd * usdt.toman;
          items.push({
            symbol: canonical,
            name: DISPLAY_NAMES[canonical] ?? canonical,
            priceToman: Math.round(priceToman),
            change: 0, // FX رایگان، درصد تغییر روزانه نمی‌ده
            source: 'fx-derived',
            rawKey: fxKey,
          });
          continue;
        }
      }
    }

    // Priority 3: DB (last resort)
    const dbRow = dbItems.get(canonical);
    if (dbRow) {
      items.push({
        symbol: dbRow.symbol,
        name: dbRow.name,
        priceToman: Math.round(dbRow.price),
        change: 0, // DB درصد تغییر معتبر نداره
        source: 'db',
        rawKey: dbRow.symbol,
      });
    }
  }

  // 4) هر آیتم دیگه‌ای در DB که در لیست اصلی نیست (GOLD, OIL, سفارشی، ...)
  for (const [sym, dbRow] of dbItems) {
    if (items.some((i) => i.symbol === sym)) continue; // قبلاً اضافه شده
    items.push({
      symbol: dbRow.symbol,
      name: dbRow.name,
      priceToman: Math.round(dbRow.price),
      change: 0,
      source: 'db',
      rawKey: dbRow.symbol,
    });
  }

  const usdItem = items.find((i) => i.symbol === 'USD');
  return {
    usdRate: usdItem?.priceToman ?? null,
    usdSource: usdItem?.source ?? null,
    items,
  };
}
