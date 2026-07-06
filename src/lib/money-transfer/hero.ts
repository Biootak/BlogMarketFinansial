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
 * ----------------------------------------------------------------------------
 */

import type { ExchangeRateData } from '@/types/types';

export type HeroCategory = 'forex' | 'afghan';

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
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  const normalized = String(raw)
    .split('')
    .map((c) => faMap[c] ?? c)
    .join('')
    .replace(/[^\d.\-]/g, '');
  return parseFloat(normalized);
}

/** تبدیل عدد به رشته‌ی ارقام فارسی برای UI. اگه NaN، dash بر می‌گرداند. */
export function formatFaNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fa-IR', options).format(value);
}

/** حذف ارقام فارسی از ورودی کاربر (برای ذخیره سازگار با schema) */
export function toEnglishDigits(raw: string): string {
  const faMap: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  return raw.split('').map((c) => faMap[c] ?? c).join('');
}

/**
 * تبدیل رکوردهای خام DB به HeroPair برای calculator.
 * فیلتر خودکار:
 *   - فقط نرخ‌های فعال
 *   - BUY_SELL (صرافی ملی) یا SINGLE_BULK با singleRate معتبر
 *   - فقط forex و افغانی (coin/gold/global در calculator معنا ندارند)
 *   - فقط نرخ‌هایی با مقادیر عددی معتبر
 *
 * نکته (2026-07-06): snapshot JSON فقط `value` (mid rate) دارد، نه buyValue/sellValue.
 *   اگه این تابع فقط BUY_SELL قبول کند، pairs در dev خالی می‌ماند. بنابراین
 *   SINGLE_BULK با singleRate به‌عنوان fallback هم پذیرفته می‌شود، با
 *   `buy = sell = mid` (spread=0). این در UI به‌صورت spread صفر نمایش داده
 *   می‌شود — نه جعلی، فقط informational که دو طرف یکی‌اند.
 *
 * نتیجه‌ی sort: بر اساس کد (الفبایی، الفبای لاتین برای پایداری)
 */
export function buildHeroPairs(rates: ExchangeRateData[]): HeroPair[] {
  const pairs: HeroPair[] = [];
  for (const r of rates) {
    if (!r.active) continue;

    const group = (r.group ?? '').toLowerCase();
    let category: HeroCategory | null = null;
    if (group === 'iran-forex') category = 'forex';
    else if (group === 'afghan') category = 'afghan';
    else continue; // coin, gold, global — out of scope

    const divisor = r.divisor && r.divisor > 0 ? r.divisor : 1;
    let buy = NaN;
    let sell = NaN;

    if (r.rateType === 'BUY_SELL' && r.buyRate && r.sellRate) {
      buy = parseLocaleNumber(r.buyRate) / divisor;
      sell = parseLocaleNumber(r.sellRate) / divisor;
    } else if (r.rateType === 'SINGLE_BULK' && r.singleRate) {
      // Fallback برای snapshot: فقط mid rate موجود است → دو طرف یکی.
      const mid = parseLocaleNumber(r.singleRate) / divisor;
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
export function convertViaIRT(
  amount: number,
  from: HeroPair,
  to: HeroPair,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return Number.NaN;
  if (from.id === to.id) return amount;
  return (amount * from.buy) / to.sell;
}

/** inverse rate برای نمایش 1 TO = X FROM در calculator */
export function inverseRate(rate: number): number {
  return Number.isFinite(rate) && rate > 0 ? 1 / rate : Number.NaN;
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
