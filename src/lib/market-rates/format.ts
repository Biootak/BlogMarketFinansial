// src/lib/market-rates/format.ts

import type { MarketRateUnit } from './types';

const UNIT_LABELS: Record<MarketRateUnit, string> = {
  toman: 'تومان',
  rial: 'ریال',
  usd: 'دلار',
  eur: 'یورو',
  afn: 'افغانی',
  pound: 'پوند',
};

/**
 * فرمت عدد + واحد پولی.
 *
 * Source order: «${value} ${unit}» (عدد قبل از واحد)
 * در container با dir="rtl"، BiDi algorithm این ترتیب را به صورت
 * بصری «${unit} ${value}» نمایش می‌دهد (واحد سمت چپ، عدد سمت راست).
 *
 * مثال: formatWithUnit(161500, 'toman', 0)
 *   source: '۱۶۱٬۵۰۰ تومان'
 *   visual: 'تومان ۱۶۱٬۵۰۰'
 *
 * مثال: formatWithUnit(4160.26, 'usd', 2)
 *   source: '۴٬۱۶۰٫۲۶ دلار'
 *   visual: 'دلار ۴٬۱۶۰٫۲۶'
 */
export function formatWithUnit(value: number, unit: MarketRateUnit, decimals: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';

  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return `${formatted} ${UNIT_LABELS[unit]}`;
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
