/**
 * format.ts — قالب‌بندی و توکن‌های مشترک مرکز مشاهده‌پذیری.
 * ─────────────────────────────────────────────────────────────
 *  چرا اینجا: هر چهار board (نمای کلی، خطا، تأخیر، کوئری) به یک زبان عددی
 *  واحد نیاز دارند. تکرار Intl در هر فایل هم هزینهٔ runtime دارد هم drift.
 *
 *  قاعدهٔ زمان: هیچ ساعت مطلقی روی سرور فرمت نمی‌شود. timezone سرور و مرورگر
 *  یکی نیست و باعث hydration mismatch می‌شد. همه‌ی زمان‌ها «نسبی» هستند و
 *  مبنایشان `now` است که از `generatedAt` می‌آید (پایدار بین SSR و client).
 */

import type { CSSProperties } from 'react';

export type Tone = 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';

const TONE_VAR: Record<Tone, string> = {
  cyan: 'var(--ds-accent-cyan)',
  emerald: 'var(--ds-accent-emerald)',
  amber: 'var(--ds-accent-amber)',
  rose: 'var(--ds-accent-rose)',
  indigo: 'var(--ds-accent-indigo)',
  slate: 'var(--ds-accent-slate)',
};

const INTEGER = new Intl.NumberFormat('fa-IR');
const decimalFormatters = new Map<number, Intl.NumberFormat>();

/** عدد صحیح با ارقام فارسی و جداکنندهٔ هزارگان. */
export function formatNumber(value: number): string {
  return INTEGER.format(Math.round(value));
}

/** عدد اعشاری با تعداد رقم ثابت — برای درصد و ثانیه. */
export function formatDecimal(value: number, digits = 1): string {
  const cached = decimalFormatters.get(digits);
  if (cached) return cached.format(value);
  const formatter = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  decimalFormatters.set(digits, formatter);
  return formatter.format(value);
}

/** درصد با علامت فارسی. */
export function formatShare(value: number): string {
  return `${formatDecimal(value, 1)}٪`;
}

/**
 * عدد و واحد جدا برگردانده می‌شوند تا واحد لاتین (`ms` / `s`) داخل یک span
 * با `dir="ltr"` رندر شود و bidi متن فارسی را نشکند.
 */
export interface Measure {
  value: string;
  unit: string;
}

export function msMeasure(ms: number): Measure {
  if (ms < 1000) return { value: formatNumber(ms), unit: 'ms' };
  return { value: formatDecimal(ms / 1000, 2), unit: 's' };
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${formatNumber(days)} روز و ${formatNumber(hours)} ساعت`;
  if (hours > 0) return `${formatNumber(hours)} ساعت و ${formatNumber(minutes)} دقیقه`;
  return `${formatNumber(minutes)} دقیقه`;
}

/** فاصلهٔ نسبی تا `now` — hydration-safe چون به timezone وابسته نیست. */
export function formatTimeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - Date.parse(iso));
  if (diff < 60_000) return `${formatNumber(Math.floor(diff / 1000))} ثانیه پیش`;
  if (diff < 3_600_000) return `${formatNumber(Math.floor(diff / 60_000))} دقیقه پیش`;
  if (diff < 86_400_000) return `${formatNumber(Math.floor(diff / 3_600_000))} ساعت پیش`;
  return `${formatNumber(Math.floor(diff / 86_400_000))} روز پیش`;
}

/** برچسب کامل سطل ساعتی — `offset` یعنی چند ساعت قبل از اکنون. */
export function hourOffsetLabel(offset: number): string {
  if (offset <= 0) return 'ساعت جاری';
  return `${formatNumber(offset)} ساعت پیش`;
}

/** نسخهٔ کوتاه برای خط‌کش و برچسب ردیف‌های موبایل. */
export function hourOffsetShort(offset: number): string {
  if (offset <= 0) return 'اکنون';
  return `${formatNumber(offset)}س`;
}

/**
 * کلیدهای پایدار سطل‌های ساعتی. کلید نباید index باشد (هم lint، هم باعث
 * remount کل ستون‌ها در هر refresh می‌شود).
 */
export const HOUR_KEYS: string[] = Array.from({ length: 24 }, (_, index) => `bucket-${index}`);

export function hourKey(index: number): string {
  return HOUR_KEYS[index] ?? `bucket-${index}`;
}

export const STATUS_LABEL: Record<string, string> = {
  healthy: 'سالم',
  degraded: 'کند',
  down: 'قطع',
  idle: 'بی‌ترافیک',
  unknown: 'نامشخص',
};

export const STATUS_TONE: Record<string, Tone> = {
  healthy: 'emerald',
  degraded: 'amber',
  down: 'rose',
  idle: 'slate',
  unknown: 'slate',
};

export const LEVEL_LABEL: Record<string, string> = {
  debug: 'اشکال‌زدایی',
  info: 'اطلاع',
  warn: 'هشدار',
  error: 'خطا',
  fatal: 'بحرانی',
};

export const LEVEL_TONE: Record<string, Tone> = {
  debug: 'slate',
  info: 'cyan',
  warn: 'amber',
  error: 'rose',
  fatal: 'rose',
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function statusTone(status: string): Tone {
  return STATUS_TONE[status] ?? 'slate';
}

export function levelLabel(level: string): string {
  return LEVEL_LABEL[level] ?? level;
}

export function levelTone(level: string): Tone {
  return LEVEL_TONE[level] ?? 'slate';
}

export function toneVar(tone: Tone): string {
  return TONE_VAR[tone];
}

/** نسبت محدودشده به بازهٔ ۰..۱ — ورودی مستقیم متغیرهای CSS. */
export function ratio(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/** پاس دادن custom property به style بدون any. */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as unknown as CSSProperties;
}
