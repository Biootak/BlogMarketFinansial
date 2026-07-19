// src/lib/market-rates/format.ts

import type { MarketRateUnit } from './types';

export const UNIT_LABELS: Record<MarketRateUnit, string> = {
  toman: 'تومان',
  rial: 'ریال',
  usd: 'دلار',
  eur: 'یورو',
  afn: 'افغانی',
  pound: 'پوند',
};

/**
 * فقط عدد فرمت‌شده، بدون واحد.
 * برای استفاده در کامپوننت‌هایی که واحد را در span جداگانه می‌خواهند.
 */
export function formatValueOnly(value: number, decimals: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * فرمت عدد + واحد به صورت string — فقط برای aria-label و متون غیر-HTML.
 * در رندر HTML از formatValueOnly + UNIT_LABELS استفاده کنید.
 *
 * مثال: formatWithUnit(161500, 'toman', 0)  →  '۱۶۱٬۵۰۰ تومان'
 */
export function formatWithUnit(value: number, unit: MarketRateUnit, decimals: number): string {
  const v = formatValueOnly(value, decimals);
  if (v === '—') return '—';
  return `${v} ${UNIT_LABELS[unit]}`;
}

/**
 * فرمت درصد تغییر (با علامت + یا −).
 * مثال: formatChangePercent(3.19) → '+۳.۱۹%'
 * مثال: formatChangePercent(-1.2) → '−۱.۲۰%'
 * مثال: formatChangePercent(0) → '۰.۰۰%'
 */
export function formatChangePercent(change: number): string {
  if (!Number.isFinite(change)) return '۰.۰۰%';
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const num = Math.abs(change).toFixed(2);
  // تبدیل ارقام ASCII به فارسی
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const numPersian = num.replace(/\d/g, (d) => persianDigits[Number.parseInt(d)]);
  return `${sign}${numPersian}%`;
}
