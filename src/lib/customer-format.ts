/**
 * lib/customer-format.ts
 *
 * Pure functions for formatting customer-related values in Persian.
 * No DOM, no React — just number / currency / time helpers used across
 * the customers cockpit and detail views.
 */

const fa = new Intl.NumberFormat('fa-IR');
const faCompact = new Intl.NumberFormat('fa-IR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const faPercent = new Intl.NumberFormat('fa-IR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

/** amount (minor units) → decimal */
export function minorToDecimal(value: string | number | bigint | null | undefined): number {
  if (value == null) return 0;
  const big = typeof value === 'bigint' ? value : BigInt(String(value));
  const int = Number(big / BigInt(100));
  const frac = Number(big % BigInt(100)) / 100;
  return int + frac;
}

/** «۱٬۲۳۴٫۵۶ AFN» */
export function formatAmount(value: string | number | bigint | null | undefined, currency: string): string {
  const num = minorToDecimal(value);
  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
  return `${formatted} ${currency}`;
}

/** compact: ۱٫۲K AFN */
export function formatAmountCompact(
  value: string | number | bigint | null | undefined,
  currency: string,
): string {
  const num = minorToDecimal(value);
  return `${faCompact.format(num)} ${currency}`;
}

export function formatNumber(value: number): string {
  return fa.format(value);
}

export function formatCompact(value: number): string {
  return faCompact.format(value);
}

export function formatPercent(value: number): string {
  return faPercent.format(value);
}

export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const firstWord = trimmed.split(/\s+/)[0] ?? trimmed;
  return (firstWord[0] ?? '?').toUpperCase();
}

export function formatDateTime(iso: string | Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDateShort(iso: string | Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

export function formatTime(iso: string | Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatRelative(iso: string | Date): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'لحظاتی پیش';
  if (minutes < 60) return `${fa.format(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${fa.format(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'دیروز';
  if (days < 7) return `${fa.format(days)} روز پیش`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${fa.format(weeks)} هفته پیش`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${fa.format(months)} ماه پیش`;
  }
  const years = Math.floor(days / 365);
  return `${fa.format(years)} سال پیش`;
}

export function riskTone(score: number): 'emerald' | 'amber' | 'rose' {
  if (score > 70) return 'rose';
  if (score > 40) return 'amber';
  return 'emerald';
}

export function riskLabel(score: number): string {
  if (score > 70) return 'پرریسک';
  if (score > 40) return 'متوسط';
  return 'کم‌ریسک';
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d);
}

export function shortHash(hash: string | null | undefined): string {
  if (!hash) return '—';
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
}
