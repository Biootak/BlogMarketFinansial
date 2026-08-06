/**
 * قالب‌بندی مشترک مرکز مشاهده‌پذیری.
 *
 * همهٔ زمان‌ها با timeZone صریح فرمت می‌شوند تا خروجی سرور و کلاینت یکی
 * باشد و hydration mismatch رخ ندهد. مرجع زمان همیشه `generatedAt` خودِ
 * snapshot است، نه ساعت مرورگر.
 */

import { formatFaNumber } from '@/lib/fa-number';

const TZ = 'Asia/Tehran';

const CLOCK = new Intl.DateTimeFormat('fa-IR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

const STAMP = new Intl.DateTimeFormat('fa-IR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

export const HOUR_MS = 3_600_000;

export function faNum(value: number): string {
  return formatFaNumber(Math.round(value));
}

export function faFixed(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return formatFaNumber(value.toFixed(digits));
}

export function faPercent(value: number, digits = 1): string {
  return `${faFixed(value, digits)}٪`;
}

/** میلی‌ثانیه، کوتاه — برای جدول و نشانگر */
export function msShort(ms: number): string {
  if (ms >= 1000) return `${faFixed(ms / 1000, 2)} ثانیه`;
  return `${faNum(ms)} م‌ث`;
}

export function clock(iso: string | number): string {
  const date = typeof iso === 'number' ? new Date(iso) : new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return CLOCK.format(date);
}

export function stamp(iso: string | number): string {
  const date = typeof iso === 'number' ? new Date(iso) : new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return STAMP.format(date);
}

/** فاصلهٔ زمانی نسبت به مرجعِ snapshot — قطعی و بدون وابستگی به ساعت مرورگر */
export function relative(iso: string, referenceIso: string): string {
  const target = new Date(iso).getTime();
  const reference = new Date(referenceIso).getTime();
  if (Number.isNaN(target) || Number.isNaN(reference)) return '—';

  const seconds = Math.max(0, Math.floor((reference - target) / 1000));
  if (seconds < 45) return 'همین حالا';
  if (seconds < 3600) return `${faNum(seconds / 60)} دقیقه پیش`;
  if (seconds < 86_400) return `${faNum(seconds / 3600)} ساعت پیش`;
  return `${faNum(seconds / 86_400)} روز پیش`;
}

export function uptimeFa(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${faNum(days)} روز و ${faNum(hours)} ساعت`;
  if (hours > 0) return `${faNum(hours)} ساعت و ${faNum(minutes)} دقیقه`;
  return `${faNum(minutes)} دقیقه`;
}

/** زمان شروع سطل ساعتی شمارهٔ index در پنجرهٔ windowHours */
export function bucketStartMs(generatedAt: string, index: number, windowHours: number): number {
  return new Date(generatedAt).getTime() - (windowHours - index) * HOUR_MS;
}

/** برچسب بازهٔ یک سطل، مثل «۱۴:۰۰ تا ۱۵:۰۰» */
export function bucketLabel(generatedAt: string, index: number, windowHours: number): string {
  const start = bucketStartMs(generatedAt, index, windowHours);
  return `${clock(start)} تا ${clock(start + HOUR_MS)}`;
}

/** درصد ایمن برای عرض/ارتفاع نوارها */
export function ratio(value: number, max: number, min = 0): number {
  if (!Number.isFinite(value) || max <= 0) return min;
  return Math.max(min, Math.min(100, (value / max) * 100));
}
