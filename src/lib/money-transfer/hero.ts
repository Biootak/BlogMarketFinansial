/**
 * money-transfer/hero
 * ----------------------------------------------------------------------------
 * helper های data layer برای HeroConverter (Money Transfer).
 *   - normalizes کردن رکوردهای ExchangeRate به یک شکل واحد برای UI
 *   - محاسبه‌ی cross-rate از طریق pivot تومان (IRT)
 *   - استخراج short code (مثل IRAN_USD → USD) برای نمایش
 *
 * نکته‌ی معماری:
 *   پایگاه همه‌ی conversion در صفحه‌ی money-transfer پایه‌ی «تومان» است؛
 *   حتی طلا و سکه به تومان seed می‌شوند. ولی calculator هیرو فقط
 *   forex + افغانی را ساپورت می‌کند چون:
 *     - طلا/سکه ارز نیست (تبدیل‌پذیری متفاوت دارد)
 *     - انس طلا با USD pivot می‌خواهد (نه تومان)
 *     - این‌ها در جداول جدای صفحه نمایش داده می‌شوند.
 *
 * M12: IRT_RIAL_RATIO برای تبدیل ریال به تومان — از units.ts (تک‌منبع تبدیل).
 * در ایران درست است ولی برای پشتیبانی از افغانستان در آینده می‌توان ratio را
 * از system settings خواند.
 * ----------------------------------------------------------------------------
 */

import type { MarketRateItem } from '@/lib/market-rates/types';
import { RIAL_PER_TOMAN, rialToToman } from '@/lib/market-rates/units';
import type { CryptoTickerRate, ExchangeRateData } from '@/types/types';

/** M12: نسبت تومان به ریال — ۱ تومان = ۱۰ ریال (الزاماً با units.ts هم‌ارز). */
export const IRT_RIAL_RATIO = RIAL_PER_TOMAN;

export type HeroCategory = 'forex' | 'afghan' | 'gold' | 'crypto';

export interface HeroPair {
  /** Prisma id */
  id: string;
  /** کد کوتاه ارز — مثلاً "USD" (بدون prefix های IRAN_/AFGHANI_) */
  code: string;
  /** کد کامل — "IRAN_USD" یا "AFGHANI_AFN" */
  fullCode: string;
  /** نام فارسی — «دلار تهران» */
  name: string;
  /** دسته‌بندی برای فیلتر کردن در chip categories */
  category: HeroCategory;
  /** نرخ خرید صرافی از کاربر (تومان) — بعد از اعمال divisor */
  buy: number;
  /** نرخ فروش صرافی به کاربر (تومان) — بعد از اعمال divisor */
  sell: number;
  /** زمان آخرین به‌روزرسانی */
  updatedAt: Date;
  /**
   * واحد ارز — "toman" | "usd" | "afn" | ... (B2-fix 2026-07)
   * برای تعیین تعداد رقم اعشار در نمایش نتیجه تبدیل.
   */
  unit: string;
  /**
   * تعداد ارقام اعشار پیش‌فرض برای نمایش (B2-fix 2026-07).
   */
  decimals: number;
}

/** استخراج کد کوتاه از symbol. مثلاً "IRAN_USD" → "USD". */
function extractShortCode(symbol: string | null | undefined, fallback: string): string {
  const raw = (symbol ?? '').trim();
  const match = raw.match(/^(?:IRAN|AFGHANI|GLOBAL)_(.+)$/);
  if (match) return match[1].toUpperCase();
  return (raw || fallback || '').toUpperCase();
}

/** حذف ارقام فارسی و تبدیل به عدد — ایمن در برابر null */
export function parseLocaleNumber(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return Number.NaN;
  const faMap: Record<string, string> = {
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };
  const normalized = String(raw)
    .split('')
    .map((c) => faMap[c] ?? c)
    .join('')
    .replace(/[^\d.\-]/g, '');
  return Number.parseFloat(normalized);
}

/** تبدیل عدد به رشته‌ی ارقام فارسی برای UI. اگه NaN، dash بر می‌گرداند. */
export function formatFaNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fa-IR', options).format(value);
}

/** حذف ارقام فارسی از ورودی کاربر (برای ذخیره سازگار با schema) */
export function toEnglishDigits(raw: string): string {
  const faMap: Record<string, string> = {
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };
  return raw
    .split('')
    .map((c) => faMap[c] ?? c)
    .join('');
}

/**
 * تبدیل رکوردهای خام DB به HeroPair برای calculator.
 *
 * Categories:
 *   forex  → iran-forex (دلار، یورو، درهم، ...)
 *   afghan → afghan (دلار هرات، افغانی)
 *   crypto → از buildCryptoPairs جداگانه می‌آید
 *
 * Fallback: BUY_SELL یا SINGLE_BULK با singleRate (mid rate، spread=0).
 *
 * نکته: gold/سکه از calculator حذف شده (2026-07) — فقط در جداول نمایش داده می‌شود.
 */
export function buildHeroPairs(rates: ExchangeRateData[]): HeroPair[] {
  // تومان (IRT) pivot است — به عنوان اولین ارز در لیست forex اضافه می‌شود
  // تا کاربر بتواند «USD → تومان» یا «EUR → تومان» را مستقیم انتخاب کند.
  // buy=sell=1 چون تومان خودش واحد مرجع است.
  const pairs: HeroPair[] = [
    {
      id: 'IRT',
      code: 'IRT',
      fullCode: 'IRAN_IRT',
      name: 'تومان',
      category: 'forex',
      buy: 1,
      sell: 1,
      updatedAt: new Date(),
      unit: 'toman',
      decimals: 0,
    },
  ];
  for (const r of rates) {
    if (!r.active) continue;

    const group = (r.group ?? '').toLowerCase();
    const sym = (r.symbol ?? '').toUpperCase();

    let category: HeroCategory | null = null;
    // minor group هم به forex اضافه شد (2026-07) تا JPY, RUB, INR, PKR, SAR, ... در calculator باشند
    // AFGHANI_USD (دلار هرات با pivot تومان) هم به forex می‌رود تا کنار سایر ارزهای تومانی باشد
    if (group === 'iran-forex' || group === 'minor') category = 'forex';
    else if (group === 'afghan' && (sym === 'AFGHANI_USD' || sym === 'AFGHANI_AFN'))
      category = 'forex';
    // SARA_* از buildSarafiPairs جداگانه می‌آیند (unit=afn، تب افغانی)
    else continue;

    // ⚠️ divisor نباید اینجا اعمال شود!
    // مقادیر buyRate/sellRate/singleRate از rateItemToExchangeRate می‌آیند که
    // assembler قبلاً rawValue/divisor را حساب کرده — پس مقادیر اینجا
    // **قبلاً به تومان تبدیل شده‌اند**.
    // اعمال مجدد divisor → double-division → نرخ ۱۰× کمتر از واقعی (باگ ۲۰۲۶-۰۷).
    let buy = Number.NaN;
    let sell = Number.NaN;

    if (r.rateType === 'BUY_SELL' && r.buyRate && r.sellRate) {
      buy = parseLocaleNumber(r.buyRate);
      sell = parseLocaleNumber(r.sellRate);
    } else if (r.rateType === 'SINGLE_BULK' && r.singleRate) {
      // mid rate — assembler قبلاً نرمال کرده
      const mid = parseLocaleNumber(r.singleRate);
      buy = mid;
      sell = mid;
    } else {
      continue;
    }

    if (!Number.isFinite(buy) || !Number.isFinite(sell)) continue;
    if (buy <= 0 || sell <= 0) continue;

    const code = extractShortCode(r.symbol, r.currency);

    pairs.push({
      id: r.id,
      code,
      fullCode: r.symbol ?? code,
      name: r.displayNameFa ?? r.name,
      category,
      buy,
      sell,
      updatedAt: r.updatedAt,
      // B2-fix 2026-07: unit + decimals برای نمایش درست در HeroConverter
      unit: r.unit ?? 'toman',
      decimals: r.decimals ?? 0,
    });
  }
  // Sort by code (Latin alphabet) for predictable dropdown order in RTL.
  pairs.sort((a, b) => a.code.localeCompare(b.code));
  return pairs;
}

/**
 * cross-rate از طریق تومان (IRT) — منطق صرافی ایران.
 *
 *   user می‌فرستد amount واحد از FROM، صرافی:
 *     1) می‌خرد FROM از user در FROM.buy  (صرافی پایین‌تر می‌خره)
 *     2) می‌فروشد TO به user در TO.sell    (صرافی بالاتر می‌فروشه)
 *     → pivot: toman؛  result: (amount × from.buy) / to.sell
 */
export function convertViaIRT(amount: number, from: HeroPair, to: HeroPair): number {
  if (!Number.isFinite(amount) || amount <= 0) return Number.NaN;
  if (!Number.isFinite(from.buy) || from.buy <= 0) return Number.NaN;
  if (!Number.isFinite(to.sell) || to.sell <= 0) return Number.NaN;
  if (from.id === to.id) return amount;
  return (amount * from.buy) / to.sell;
}

/** inverse rate برای نمایش 1 TO = X FROM در calculator */
export function inverseRate(rate: number): number {
  return Number.isFinite(rate) && rate > 0 ? 1 / rate : Number.NaN;
}

/**
 * formatRate — فرمت‌بندی unit-aware نرخ برای نمایش در calculator.
 *
 * قوانین:
 *   - اگه مقصد تومان (unit='toman') است → 0 اعشار، جداکننده هزار
 *   - اگه مقصد ارز خارجی با decimals مشخص → از decimals pair استفاده
 *   - اعداد خیلی کوچک (abs < 0.001) → significantDigits برای خوانایی
 *     مثال: ۱ IRT = 0.0000517 USD → «۰٫۰۰۰۰۵۱۷۴» خوانا نیست،
 *     پس significantDigits=4 استفاده می‌کنیم که «۵٫۱۷۴ × ۱۰⁻⁵» نمی‌دهد
 *     بلکه «۰٫۰۰۰۰۵۱۷» می‌دهد — اما با maxFractionDigits محدود می‌شود.
 *   - اعداد خیلی بزرگ (≥ 100_000) → بدون اعشار + جداکننده هزار
 *
 * این تابع single source of truth برای فرمت نرخ در calculator است.
 * هر جایی که نرخ نمایش می‌دهید از این استفاده کنید نه inline.
 */
export function formatRate(value: number, targetPair: HeroPair | null): string {
  if (!Number.isFinite(value)) return '—';
  if (!targetPair) return formatFaNumber(value, { maximumFractionDigits: 4 });

  const abs = Math.abs(value);

  // تومان: همیشه 0 اعشار
  if (targetPair.unit === 'toman' || targetPair.unit === 'IRT') {
    return new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(value);
  }

  // اعداد خیلی بزرگ (مثل تبدیل IRT به JPY/RUB) → بدون اعشار
  if (abs >= 100_000) {
    return new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(value);
  }

  // اعداد خیلی کوچک (مثل IRT → USD): نمایش معنادار با significant digits
  // مثال: 0.00005174 → ۰٫۰۰۰۰۵۱۷۴ با sig=4 می‌شود ۰٫۰۰۰۰۵۱۷۴ — کافی است
  if (abs > 0 && abs < 0.01) {
    return new Intl.NumberFormat('fa-IR', {
      maximumSignificantDigits: 4,
      useGrouping: false,
    }).format(value);
  }

  // حالت عادی: از decimals pair استفاده می‌کنیم
  const dec = targetPair.decimals ?? 2;
  return new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: Math.max(dec, 4),
    useGrouping: true,
  }).format(value);
}

/** شاخص freshness از updatedAt — زمان نسبی فارسی */
export function formatFreshness(latest: Date | null, now: Date): string {
  if (!latest) return 'نامشخص';
  const diffMs = Math.max(0, now.getTime() - new Date(latest).getTime());
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'همین الآن';
  if (mins < 60) {
    const fmt = new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(mins);
    return `${fmt} دقیقه پیش`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const fmt = new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(hours);
    return `${fmt} ساعت پیش`;
  }
  const days = Math.floor(hours / 24);
  const fmt = new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(days);
  return `${fmt} روز پیش`;
}

/** کمترین/بیشترین spread در sample فعلی؛ spread = (sell-buy)/buy */
export interface SpreadStat {
  lowest: number;
  highest: number;
  average: number;
}

export function computeSpreadStats(pairs: HeroPair[]): SpreadStat {
  if (pairs.length === 0) return { lowest: 0, highest: 0, average: 0 };
  const spreads = pairs.map((p) => ((p.sell - p.buy) / p.buy) * 100);
  let lowest = spreads[0];
  let highest = spreads[0];
  let sum = 0;
  for (const s of spreads) {
    if (s < lowest) lowest = s;
    if (s > highest) highest = s;
    sum += s;
  }
  return {
    lowest,
    highest,
    average: sum / spreads.length,
  };
}

/**
 * تبدیل MarketRateItem[] (SARA_* از sarafi.af) به HeroPair[] برای تب افغانی.
 *
 * واحد: AFN (افغانی). هر دو طرف buy/sell به AFN هستند.
 * pivot تبدیل = AFN (نه IRT) — فرمول convertViaIRT یکسان است چون
 * هر دو from و to از یک منبع (AFN) می‌آیند.
 *
 * نمایش نتیجه: «۱ USD = X AFN» — مستقیم از سرای شاهزاده.
 */
export function buildSarafiPairs(marketItems: MarketRateItem[]): HeroPair[] {
  const pairs: HeroPair[] = [];

  // pivot افغانی (AFN) — مثل IRT در تب forex: buy=sell=1 تا نرخ «۱ USD = X افغانی»
  // مستقیماً از buy/sell صرافی سرای شاهزاده (AFN) قابل نمایش باشد. بدون این pair،
  // انتخاب پیش‌فرض تب افغانی به USD برمی‌گشت و نرخ‌های افغانستان دیده نمی‌شد.
  pairs.push({
    id: 'sara-AFN',
    code: 'AFN',
    fullCode: 'SARA_AFN',
    name: 'افغانی',
    category: 'afghan',
    buy: 1,
    sell: 1,
    updatedAt: new Date(),
    unit: 'afn',
    decimals: 2,
  });

  for (const r of marketItems) {
    if (!r.symbol.startsWith('SARA_')) continue;
    // buy/sell باید موجود باشند (سرای شاهزاده همیشه هر دو را می‌دهد)
    if (r.buyValue == null || r.sellValue == null) continue;
    if (!Number.isFinite(r.buyValue) || !Number.isFinite(r.sellValue)) continue;
    if (r.buyValue <= 0 || r.sellValue <= 0) continue;

    const code = r.symbol.replace('SARA_', '');
    // نرخ‌ها raw هستند — اگر divisor دارد تقسیم می‌کنیم
    const divisor = r.divisor > 0 ? r.divisor : 1;
    const buy = r.buyValue / divisor;
    const sell = r.sellValue / divisor;

    pairs.push({
      id: `sara-${code}`,
      code,
      fullCode: r.symbol,
      name: r.displayNameFa,
      category: 'afghan',
      buy,
      sell,
      updatedAt: r.updatedAt,
      unit: 'afn',
      decimals: r.decimals,
    });
  }

  // ترتیب: AFN (pivot) اول، سپس USD, EUR, AED — بقیه alphabetical
  const priority = ['AFN', 'USD', 'EUR', 'AED', 'GBP', 'SAR', 'TRY', 'CNY', 'CAD', 'AUD'];
  pairs.sort((a, b) => {
    const ai = priority.indexOf(a.code);
    const bi = priority.indexOf(b.code);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.code.localeCompare(b.code);
  });

  return pairs;
}

/**
 * نام فارسی ارزهای دیجیتال — برای نمایش در CurrencyPicker.
 * فقط رایج‌ترین‌ها که Exir پشتیبانی می‌کند.
 */
const CRYPTO_FA_NAMES: Record<string, string> = {
  BTC: 'بیت‌کوین',
  ETH: 'اتریوم',
  USDT: 'تتر',
  XRP: 'ریپل',
  SOL: 'سولانا',
  DOGE: 'دوج‌کوین',
  ADA: 'کاردانو',
  AVAX: 'آوالانچ',
  DOT: 'پولکادات',
  LINK: 'چین‌لینک',
  LTC: 'لایت‌کوین',
  TRX: 'ترون',
  UNI: 'یونی‌سواپ',
  MATIC: 'ماتیک',
  BNB: 'بایننس‌کوین',
};

/**
 * تبدیل CryptoTickerRate[] (از Exir) به HeroPair[] برای تب رمزارز.
 *
 * pivot = USDT (نه تومان): همه ارزهای دیجیتال در USDT قیمت‌گذاری می‌شوند.
 * چون ماشین‌حساب IRT-pivot است، یک «USDT مجازی» با mid=usdtToman ساخته می‌شود
 * و بقیه از طریق آن convert می‌شوند.
 *
 * نکته: buy=sell=mid چون Exir نرخ bid/ask جداگانه نمی‌دهد.
 */
export function buildCryptoPairs(cryptoRates: CryptoTickerRate[], usdtToman: number): HeroPair[] {
  if (!Number.isFinite(usdtToman) || usdtToman <= 0) return [];

  const now = new Date();
  const pairs: HeroPair[] = [];

  for (const r of cryptoRates) {
    const sym = r.symbol.toUpperCase();
    // irrPrice از Exir به ریال است → rialToToman = تومان
    const toman = r.irrPrice > 0 ? rialToToman(r.irrPrice) : r.usdtPrice * usdtToman;
    if (!Number.isFinite(toman) || toman <= 0) continue;

    pairs.push({
      id: `crypto-${sym}`,
      code: sym,
      fullCode: `CRYPTO_${sym}`,
      name: CRYPTO_FA_NAMES[sym] ?? sym,
      category: 'crypto',
      buy: toman,
      sell: toman,
      updatedAt: now,
      unit: 'toman',
      decimals: 0,
    });
  }

  // BTC, ETH, USDT اول — بقیه alphabetical
  const priority = ['BTC', 'ETH', 'USDT', 'XRP', 'SOL', 'DOGE'];
  pairs.sort((a, b) => {
    const ai = priority.indexOf(a.code);
    const bi = priority.indexOf(b.code);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.code.localeCompare(b.code);
  });

  return pairs;
}
