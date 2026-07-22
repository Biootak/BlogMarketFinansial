/**
 * afn-format.ts — Currency + amount formatter for AFN and supported currencies
 *
 * Usage:
 *   formatAFN(150000)               → "۱۵۰٬۰۰۰ ؋"
 *   formatCurrency(150000, 'USD')   → "$150,000.00"
 *   formatRate(67.5, 'USD', 'AFN') → "۶۷٫۵ AFN/USD"
 *   formatAFNCompact(1_500_000)     → "1.5 میلیون ؋"
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
  { symbol: string; locale: string; decimals: number }
> = {
  AFN: { symbol: '؋', locale: 'fa-AF', decimals: 0 },
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

/** Format an amount in AFN with Persian numerals + ؋ symbol */
export function formatAFN(amount: number | bigint | string): string {
  return new Intl.NumberFormat('fa-AF', {
    style: 'currency',
    currency: 'AFN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNumber(amount));
}

/** Format an amount in any supported currency */
export function formatCurrency(
  amount: number | bigint | string,
  currency: SupportedCurrency,
): string {
  const meta = CURRENCY_META[currency];
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(toNumber(amount));
}

/** Format a rate — e.g. "۶۷٫۵ AFN/USD" */
export function formatRate(
  rate: number | string,
  fromCurrency: string,
  toCurrency: string,
): string {
  const num = Number(rate);
  return `${new Intl.NumberFormat('fa-AF', { maximumFractionDigits: 4 }).format(num)} ${toCurrency}/${fromCurrency}`;
}

/** Short compact format for large AFN amounts */
export function formatAFNCompact(amount: number | bigint | string): string {
  const num = toNumber(amount);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} میلیارد ؋`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} میلیون ؋`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K ؋`;
  return formatAFN(num);
}
