/**
 * Editorial Command — shared utilities (Persian formatting + trend helpers).
 *
 * Reused 1:1 from the former NOVA deck — no behavior changes, only new
 * class names in the consumers.
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

/** Persian greeting based on the hour of day (0–23). */
export function timeOfDay(hour: number): string {
  if (hour < 5) return 'بامداد بخیر';
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'بعدازظهر بخیر';
  if (hour < 20) return 'عصر بخیر';
  return 'شب بخیر';
}

/**
 * Relative time in Persian: "لحظاتی پیش", "۳ دقیقه پیش", "۲ ساعت پیش", etc.
 */
export function formatRelativeFa(d: Date, now: Date): string {
  const diff = Math.max(0, now.getTime() - d.getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'لحظاتی پیش';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m.toLocaleString('fa-IR')} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h.toLocaleString('fa-IR')} ساعت پیش`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day.toLocaleString('fa-IR')} روز پیش`;
  return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}
