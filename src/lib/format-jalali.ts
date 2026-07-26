/**
 * lib/format-jalali.ts
 *
 * Shared Jalali (Persian) date/number formatting utils.
 * یک‌بار تعریف می‌شود — همه داشبوردها از اینجا import می‌کنند.
 * هیچ dependency اضافه ندارد — فقط Intl.DateTimeFormat استاندارد.
 */

/** تاریخ + ساعت کامل: ۱۵ خرداد ۱۴۰۳، ساعت ۱۴:۳۲ */
export function formatJalaliDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/** فقط تاریخ: ۱۵ خرداد ۱۴۰۳ */
export function formatJalaliDate(date: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/** ماه + روز: خرداد ۱۵ */
export function formatJalaliShort(date: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/** ماه + روز + ساعت: خرداد ۱۵، ۱۴:۳۲ */
export function formatJalaliCompact(date: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/** ماه کامل + سال: خرداد ۱۴۰۳ */
export function formatJalaliMonthYear(date: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(date));
}

/** عدد فارسی با جداکننده هزار */
export function formatPersianNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value);
}

/** عدد فارسی فشرده: ۱۲.۳ هزار */
export function formatPersianCompact(value: number): string {
  return new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(value);
}
