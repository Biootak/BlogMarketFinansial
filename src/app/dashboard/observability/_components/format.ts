/**
 * format.ts — زبان عددی مشترک مرکز مشاهده‌پذیری.
 * ─────────────────────────────────────────────────────────────
 *  چرا اینجا: هر شش board (نمای کلی، سرویس، خطا، تأخیر، کوئری، ممیزی) به یک
 *  زبان عددی واحد نیاز دارند. تکرار Intl در هر فایل هم هزینهٔ runtime دارد و
 *  هم باعث drift می‌شود.
 *
 *  قاعدهٔ زمان (hydration-safe):
 *   همهٔ فرمترهای زمان با `timeZone` ثابت «Asia/Kabul» ساخته می‌شوند. پلتفرم
 *   افغانستان-محور است، پس ساعت مرجع هم کابل است — و چون timezone صریح است،
 *   سرور و مرورگر دقیقاً یک رشته تولید می‌کنند و hydration mismatch رخ نمی‌دهد.
 *
 *  قاعدهٔ bidi:
 *   واحدهای لاتین (`ms` / `s`) داخل متن فارسی برعکس رندر می‌شوند. هر جایی که
 *   خروجی `msShort` نمایش داده می‌شود باید کلاس `.metric` (direction: ltr +
 *   unicode-bidi: isolate) بگیرد. این قرارداد در obs.module.css تعریف شده.
 */

import type { CSSProperties } from 'react';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'idle';

const LOCALE = 'fa-IR';
/** ساعت مرجع پلتفرم — کابل. ثابت بودنش hydration را امن می‌کند. */
const TIME_ZONE = 'Asia/Kabul';

const HOUR_MS = 3_600_000;

/* ───────────────────────── numbers ───────────────────────── */

const INTEGER = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimalCache = new Map<number, Intl.NumberFormat>();

function decimalFormatter(digits: number): Intl.NumberFormat {
  const cached = decimalCache.get(digits);
  if (cached) return cached;
  const created = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  decimalCache.set(digits, created);
  return created;
}

/** عدد صحیح با ارقام فارسی و جداکنندهٔ هزارگان. */
export function faNum(value: number): string {
  if (!Number.isFinite(value)) return INTEGER.format(0);
  return INTEGER.format(Math.round(value));
}

/** عدد اعشاری با تعداد رقم ثابت. */
export function faDec(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return decimalFormatter(digits).format(0);
  return decimalFormatter(digits).format(value);
}

/** درصد با علامت فارسی. */
export function faPercent(value: number, digits = 1): string {
  return `${faDec(value, digits)}٪`;
}

/**
 * مدت زمان کوتاه. زیر یک ثانیه با `ms`، بالاتر با `s`.
 * خروجی باید داخل عنصری با کلاس `.metric` بنشیند تا bidi نشکند.
 */
export function msShort(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return `${faNum(0)}ms`;
  if (ms < 1000) return `${faNum(ms)}ms`;
  return `${faDec(ms / 1000, 2)}s`;
}

/** حافظه بر حسب مگابایت — واحد فارسی، پس نیازی به isolate ندارد. */
export function mbFa(mb: number): string {
  if (mb >= 1024) return `${faDec(mb / 1024, 2)} گیگابایت`;
  return `${faNum(mb)} مگابایت`;
}

/** عمر پروسه به زبان آدمیزاد. */
export function uptimeFa(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const days = Math.floor(safe / 86_400);
  const hours = Math.floor((safe % 86_400) / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  if (days > 0) return `${faNum(days)} روز و ${faNum(hours)} ساعت`;
  if (hours > 0) return `${faNum(hours)} ساعت و ${faNum(minutes)} دقیقه`;
  if (minutes > 0) return `${faNum(minutes)} دقیقه`;
  return `${faNum(safe)} ثانیه`;
}

/* ───────────────────────── time ───────────────────────── */

const HM = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
});

const HMS = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
});

const STAMP = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
});

/** ساعت و دقیقهٔ یک لحظه — برای برچسب محور. */
export function clock(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';
  return HMS.format(new Date(at));
}

/** تاریخ و ساعت کامل (تقویم شمسی، ساعت کابل). */
export function stamp(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';
  return STAMP.format(new Date(at));
}

export interface HourRange {
  /** ساعت شروع سطل، مثلاً «۱۴:۰۰» */
  start: string;
  /** ساعت پایان سطل، مثلاً «۱۵:۰۰» */
  end: string;
  /** برچسب کامل، مثلاً «۱۴:۰۰ تا ۱۵:۰۰» */
  label: string;
}

/**
 * بازهٔ یک سطل ساعتی.
 * اندیس ۰ = قدیمی‌ترین سطل پنجره، اندیس `windowHours - 1` = ساعت جاری.
 * دقیقاً هم‌راستا با `bucketStartIso` در `src/lib/observability.ts`.
 *
 * برچسب‌ها به‌صورت ساختاریافته برمی‌گردند (نه یک رشتهٔ قابل slice) چون
 * Intl گاهی نشانه‌های bidi نامرئی اضافه می‌کند و slice آن‌ها را می‌شکست.
 */
export function hourRange(generatedAt: string, index: number, windowHours: number): HourRange {
  const now = Date.parse(generatedAt);
  if (Number.isNaN(now)) return { start: '—', end: '—', label: '—' };
  const startMs = now - (windowHours - index) * HOUR_MS;
  const start = HM.format(new Date(startMs));
  const end = HM.format(new Date(startMs + HOUR_MS));
  return { start, end, label: `${start} تا ${end}` };
}

/** «چند وقت پیش» نسبت به لحظهٔ تولید snapshot — مستقل از timezone. */
export function relative(iso: string, referenceIso: string): string {
  const at = Date.parse(iso);
  const reference = Date.parse(referenceIso);
  if (Number.isNaN(at) || Number.isNaN(reference)) return '—';
  const diff = Math.max(0, reference - at);
  if (diff < 60_000) return `${faNum(Math.floor(diff / 1000))} ثانیه پیش`;
  if (diff < HOUR_MS) return `${faNum(Math.floor(diff / 60_000))} دقیقه پیش`;
  if (diff < 86_400_000) return `${faNum(Math.floor(diff / HOUR_MS))} ساعت پیش`;
  return `${faNum(Math.floor(diff / 86_400_000))} روز پیش`;
}

/** فاصلهٔ نسبی سطل تا اکنون — برای خط‌کش فشرده. */
export function hourOffsetShort(index: number, windowHours: number): string {
  const offset = windowHours - 1 - index;
  if (offset <= 0) return 'اکنون';
  return `${faNum(offset)}س`;
}

/* ───────────────────────── keys & math ───────────────────────── */

/**
 * کلید پایدار سطل ساعتی. کلید نباید خودِ index باشد (هم قانون lint، هم باعث
 * remount کل ستون‌ها در هر refresh می‌شود).
 */
export function bucketKey(index: number): string {
  return `bucket-${index}`;
}

/** نسبت به درصد، محدودشده به ۰..۱۰۰ — ورودی مستقیم متغیرهای CSS. */
export function ratio(value: number, max: number, digits = 1): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  const clamped = Math.min(1, Math.max(0, value / max));
  return Number((clamped * 100).toFixed(digits));
}

/** پاس دادن custom property به style بدون any. */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}

/* ───────────────────────── vocabulary ───────────────────────── */

const LEVEL_LABEL: Record<string, string> = {
  debug: 'اشکال‌زدایی',
  info: 'اطلاع',
  warn: 'هشدار',
  error: 'خطا',
  fatal: 'بحرانی',
};

const LEVEL_TONE: Record<string, Tone> = {
  debug: 'idle',
  info: 'info',
  warn: 'warn',
  error: 'bad',
  fatal: 'bad',
};

const STATUS_LABEL: Record<string, string> = {
  healthy: 'سالم',
  degraded: 'کند',
  down: 'قطع',
  idle: 'بی‌ترافیک',
  unknown: 'نامشخص',
};

const STATUS_TONE: Record<string, Tone> = {
  healthy: 'ok',
  degraded: 'warn',
  down: 'bad',
  idle: 'idle',
  unknown: 'idle',
};

export function levelLabel(level: string): string {
  return LEVEL_LABEL[level] ?? level;
}

export function levelTone(level: string): Tone {
  return LEVEL_TONE[level] ?? 'info';
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function statusTone(status: string): Tone {
  return STATUS_TONE[status] ?? 'idle';
}

/** رتبهٔ ریسک — پرخطرترین اول. مبنای مرتب‌سازی نردبان سرویس‌ها. */
export const STATUS_RISK: Record<string, number> = {
  down: 0,
  degraded: 1,
  healthy: 2,
  idle: 3,
};
