/**
 * Atelier 2026 — shared utilities (Persian formatting + trend helpers).
 *
 * Designed for the redesigned dashboard home. All numbers render in
 * Persian (fa-IR) digits, all timestamps are Jalali-aware, and
 * `pickTrend` / `formatRelativeFa` mirror the editorial utilities so
 * the new components stay consistent.
 */

export type Trend = 'up' | 'down' | 'flat';

/**
 * Compare the recent half of a numeric series to the older half.
 * Returns the trend direction and the percentage change.
 */
export function pickTrend(data: number[]): { trend: Trend; delta: number } {
  if (data.length < 2) return { trend: 'flat', delta: 0 };
  const half = Math.max(1, Math.floor(data.length / 2));
  const recent = data.slice(-half).reduce((a, b) => a + b, 0);
  const prev = data.slice(0, -half).reduce((a, b) => a + b, 0);
  if (prev === 0 && recent === 0) return { trend: 'flat', delta: 0 };
  if (prev === 0) return { trend: 'up', delta: 100 };
  const d = ((recent - prev) / prev) * 100;
  const t: Trend = Math.abs(d) < 1 ? 'flat' : d > 0 ? 'up' : 'down';
  return { trend: t, delta: d };
}

/** Format a number with Persian digits and group separators. */
export function fmt(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

/** Compact formatter: 1.2K / 3.4M (uses Persian digits). */
export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return '۰';
  const abs = Math.abs(n);
  if (abs < 1000) return new Intl.NumberFormat('fa-IR').format(n);
  if (abs < 1_000_000) {
    const v = (n / 1000).toFixed(abs < 10_000 ? 1 : 0);
    return `${toFaDigits(v)}K`;
  }
  if (abs < 1_000_000_000) {
    const v = (n / 1_000_000).toFixed(abs < 10_000_000 ? 1 : 0);
    return `${toFaDigits(v)}M`;
  }
  const v = (n / 1_000_000_000).toFixed(1);
  return `${toFaDigits(v)}B`;
}

function toFaDigits(s: string): string {
  return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.charAt(Number.parseInt(d, 10)));
}

/** Persian greeting based on the hour of day (0–23). */
export function timeOfDay(hour: number): string {
  if (hour < 5) return 'بامداد بخیر';
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'بعدازظهر بخیر';
  if (hour < 20) return 'عصر بخیر';
  return 'شب بخیر';
}

/**
 * Persian month name (Jalali) from the current locale date.
 * Used in the hero header line.
 */
export function persianMonthName(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(d);
}

/** Long Persian date: «شنبه ۱۳ تیر ۱۴۰۵» */
export function persianLongDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** Short Persian date: «۱۳ تیر» */
export function persianShortDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('fa-IR', {
    day: 'numeric',
    month: 'long',
  }).format(d);
}

/**
 * Relative time in Persian: "لحظاتی پیش", "۳ دقیقه پیش", "۲ ساعت پیش", etc.
 */
export function formatRelativeFa(d: Date | string, now: Date): string {
  const ts = typeof d === 'string' ? new Date(d).getTime() : d.getTime();
  const diff = Math.max(0, now.getTime() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'لحظاتی پیش';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m.toLocaleString('fa-IR')} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h.toLocaleString('fa-IR')} ساعت پیش`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day.toLocaleString('fa-IR')} روز پیش`;
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(ts));
}

/** Persian day name for the calendar week strip. */
export function dayNameFa(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(d);
}

/** Persian day-of-month (numeric). */
export function dayNumberFa(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(d);
}
