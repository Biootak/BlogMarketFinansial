/**
 * afn-format.ts — Currency + amount formatter for AFN and supported currencies
 *
 * Usage:
 *   formatAFN(150000)               → "۱۵۰٬۰۰۰ AFN"
 *   formatCurrency(150000, 'USD')   → "$150,000.00"
 *   formatRate(67.5, 'USD', 'AFN') → "۶۷٫۵ AFN/USD"
 *   formatAFNCompact(1_500_000)     → "۱.۵ میلیون AFN"
 *
 * قانون: نماد AFN همیشه بعد از عدد می‌آید (نه جلو)، به صورت "AFN" لاتین.
 * هرگز از Intl.NumberFormat با style:'currency',currency:'AFN' استفاده نکنید —
 * خروجی آن «ف» یا «؋» فارسی را جلوی عدد می‌گذارد.
 */

export type SupportedCurrency =
  | 'AFN'
  | 'USD'
  | 'EUR'
  | 'IRR'
  | 'AED'
  | 'GBP'
  | 'TRY'
  | 'SAR'
  | 'PKR';

const CURRENCY_META: Record<
  SupportedCurrency,
  { symbol: string; locale: string; decimals: number; trailingCode?: string }
> = {
  AFN: { symbol: 'AFN', locale: 'fa-IR', decimals: 0, trailingCode: 'AFN' },
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  EUR: { symbol: '€', locale: 'de-DE', decimals: 2 },
  IRR: { symbol: '﷼', locale: 'fa-IR', decimals: 0 },
  AED: { symbol: 'د.إ', locale: 'ar-AE', decimals: 2 },
  GBP: { symbol: '£', locale: 'en-GB', decimals: 2 },
  TRY: { symbol: '₺', locale: 'tr-TR', decimals: 2 },
  SAR: { symbol: '﷼', locale: 'ar-SA', decimals: 2 },
  PKR: { symbol: '₨', locale: 'ur-PK', decimals: 0 },
};

function toNumber(amount: number | bigint | string): number {
  if (typeof amount === 'bigint') return Number(amount);
  return Number(amount);
}

/**
 * Format an amount in AFN with Persian numerals.
 * نماد "AFN" بعد از عدد می‌آید: ۱۵۰٬۰۰۰ AFN
 */
export function formatAFN(amount: number | bigint | string): string {
  const n = toNumber(amount);
  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(n);
  return `${formatted} AFN`;
}

/** Format an amount in any supported currency */
export function formatCurrency(
  amount: number | bigint | string,
  currency: SupportedCurrency,
): string {
  const meta = CURRENCY_META[currency];
  const n = toNumber(amount);
  // AFN: عدد فارسی + " AFN" بعد از عدد
  if (meta.trailingCode) {
    const formatted = new Intl.NumberFormat(meta.locale, {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
      useGrouping: true,
    }).format(n);
    return `${formatted} ${meta.trailingCode}`;
  }
  // سایر ارزها: رفتار استاندارد Intl
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(n);
}

/** Format a rate — e.g. "۶۷٫۵ AFN/USD" */
export function formatRate(
  rate: number | string,
  fromCurrency: string,
  toCurrency: string,
): string {
  const num = Number(rate);
  return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(num)} ${toCurrency}/${fromCurrency}`;
}

/** Short compact format for large AFN amounts */
export function formatAFNCompact(amount: number | bigint | string): string {
  const num = toNumber(amount);
  const fmt = (n: number, d = 1) =>
    new Intl.NumberFormat('fa-IR', { maximumFractionDigits: d }).format(n);
  if (num >= 1_000_000_000) return `${fmt(num / 1_000_000_000)} میلیارد AFN`;
  if (num >= 1_000_000) return `${fmt(num / 1_000_000)} میلیون AFN`;
  if (num >= 1_000) return `${fmt(num / 1_000, 0)} هزار AFN`;
  return formatAFN(num);
}
