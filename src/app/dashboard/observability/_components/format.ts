/**
 * format.ts — زبان عددی و زمانیِ مشترک مرکز مشاهده‌پذیری.
 * ─────────────────────────────────────────────────────────────
 *  چرا اینجا: هر شش board (نمای کلی، سرویس، خطا، تأخیر، کوئری، ممیزی) به یک
 *  زبان عددی واحد نیاز دارند. تکرار Intl در هر فایل هم هزینهٔ runtime دارد و
 *  هم drift می‌سازد.
 *
 *  قواعد سختِ این فایل:
 *   1. **هیچ وابستگی به ICU** برای عدد. ارقام فارسی و جداکنندهٔ هزارگان دستی
 *      ساخته می‌شوند، پس خروجی روی Node و مرورگر بیت‌به‌بیت یکی است و
 *      hydration mismatch غیرممکن می‌شود.
 *   2. زمانِ مطلق فقط با timezone ثابت و hourCycle h23 خوانده می‌شود؛ تاریخ
 *      شمسی با تبدیل ریاضی محض تولید می‌گردد نه با تقویم ICU.
 *   3. هر واحد لاتین (ms / s) داخل ایزولهٔ bidi بسته می‌شود (U+2066…U+2069)
 *      تا در متن راست‌به‌چپ جابه‌جا نشود.
 */

import type { CSSProperties } from 'react';

/* ═══════════════════════ ارقام و اعداد ═══════════════════════ */

const TZ = 'Asia/Tehran';
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const GROUP_SEP = '٬';
const DECIMAL_SEP = '٫';
const MINUS = '−';
/** ایزولهٔ چپ‌به‌راست — واحدهای لاتین را در متن RTL سرجایشان نگه می‌دارد. */
const LRI = '\u2066';
const PDI = '\u2069';

/** ارقام لاتین → فارسی. قطعی و مستقل از ICU. */
export function toFa(input: string): string {
  return input.replace(/[0-9]/g, (digit) => FA_DIGITS[Number(digit)] ?? digit);
}

/**
 * بستن یک رشتهٔ لاتین در ایزولهٔ bidi.
 * هر جا نام سرویس، کلید لاگ یا واحد لاتین داخل جملهٔ فارسی می‌آید باید از این
 * رد شود، وگرنه الگوریتم bidi پرانتز و نقطه را به سمت اشتباه پرت می‌کند.
 */
export function isolate(text: string): string {
  return `${LRI}${text}${PDI}`;
}

function groupDigits(digits: string): string {
  let out = '';
  for (let index = 0; index < digits.length; index += 1) {
    if (index > 0 && (digits.length - index) % 3 === 0) out += GROUP_SEP;
    out += digits[index] ?? '';
  }
  return out;
}

/** عدد صحیح با ارقام فارسی و جداکنندهٔ هزارگان. */
export function faNum(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  const sign = rounded < 0 ? MINUS : '';
  return sign + toFa(groupDigits(String(Math.abs(rounded))));
}

/** عدد اعشاری با تعداد رقم ثابت — برای درصد، ثانیه و نسبت. */
export function faDecimal(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  const places = Math.max(0, Math.min(6, Math.round(digits)));
  const fixed = Math.abs(value).toFixed(places);
  const [intPart = '0', fracPart] = fixed.split('.');
  const sign = value < 0 ? MINUS : '';
  const body = fracPart ? `${groupDigits(intPart)}${DECIMAL_SEP}${fracPart}` : groupDigits(intPart);
  return sign + toFa(body);
}

/** درصد با علامت فارسی. */
export function faPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${faDecimal(value, digits)}٪`;
}

/**
 * عدد فشرده برای جاهای تنگ — «۱۲٫۴ هزار» به‌جای «۱۲٬۴۳۱».
 * فقط جایی استفاده می‌شود که دقت کامل معنی ندارد (برچسب محور، بج شمارش).
 */
export function faCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${faDecimal(value / 1_000_000, 1)} میلیون`;
  if (abs >= 1_000) return `${faDecimal(value / 1_000, 1)} هزار`;
  return faNum(value);
}

/** مدت کوتاه با واحد ایزوله‌شده — در متن فارسی جابه‌جا نمی‌شود. */
export function msShort(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  if (Math.abs(ms) >= 1000) return isolate(`${faDecimal(ms / 1000, 2)} s`);
  return isolate(`${faNum(ms)} ms`);
}

/** حجم حافظه — ورودی مگابایت. */
export function mbShort(mb: number): string {
  if (!Number.isFinite(mb)) return '—';
  if (mb >= 1024) return `${faDecimal(mb / 1024, 2)} گیگابایت`;
  return `${faNum(mb)} مگابایت`;
}

/**
 * نسبت به درصد، محدودشده به بازهٔ [min, 100].
 * `min` کفِ دیداری است: نوارهای بسیار کوچک هم باید دیده شوند وگرنه کاربر
 * فکر می‌کند اصلاً داده‌ای وجود ندارد.
 */
export function ratio(value: number, max: number, min = 0): number {
  const floor = Math.max(0, Math.min(100, min));
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0 || value <= 0) return floor;
  const percent = (value / max) * 100;
  return Math.min(100, Math.max(floor, Math.round(percent * 100) / 100));
}

/* ═══════════════════════ زمان ═══════════════════════ */

const WALL = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClock(at: number): WallClock {
  const bag: Record<string, string> = {};
  for (const part of WALL.formatToParts(new Date(at))) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year ?? 0),
    month: Number(bag.month ?? 1),
    day: Number(bag.day ?? 1),
    hour: Number(bag.hour ?? 0) % 24,
    minute: Number(bag.minute ?? 0),
    second: Number(bag.second ?? 0),
  };
}

const pad2 = (value: number): string => (value < 10 ? `0${value}` : String(value));

/** میلادی → شمسی. ریاضی محض، بدون تقویم ICU، پس سرور و کلاینت یکی می‌مانند. */
function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const cumulative = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const shifted = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((shifted + 3) / 4) -
    Math.floor((shifted + 99) / 100) +
    Math.floor((shifted + 399) / 400) +
    gd +
    (cumulative[gm - 1] ?? 0);

  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  if (days < 186) return [jy, 1 + Math.floor(days / 31), 1 + (days % 31)];
  return [jy, 7 + Math.floor((days - 186) / 30), 1 + ((days - 186) % 30)];
}

function hhmmAt(at: number): string {
  const parts = wallClock(at);
  return toFa(`${pad2(parts.hour)}:${pad2(parts.minute)}`);
}

/** ساعت کامل با ثانیه — برای نوار وضعیت زنده. */
export function clock(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';
  const parts = wallClock(at);
  return toFa(`${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`);
}

/** ساعت و دقیقه. */
export function hhmm(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';
  return hhmmAt(at);
}

/** مهرِ زمانی کامل شمسی — «۱۴۰۵/۰۵/۱۵ ۱۴:۳۲». */
export function stamp(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';
  const parts = wallClock(at);
  const [jy, jm, jd] = toJalali(parts.year, parts.month, parts.day);
  return toFa(`${jy}/${pad2(jm)}/${pad2(jd)} ${pad2(parts.hour)}:${pad2(parts.minute)}`);
}

const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** تاریخ کوتاه شمسی — «۱۵ مرداد». */
export function dayLabel(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';
  const parts = wallClock(at);
  const [, jm, jd] = toJalali(parts.year, parts.month, parts.day);
  return `${toFa(String(jd))} ${JALALI_MONTHS[jm - 1] ?? ''}`.trim();
}

/** تاریخ کامل شمسی — «۱۵ مرداد ۱۴۰۵». برای سرصفحهٔ سالنامه. */
export function fullDayLabel(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';
  const parts = wallClock(at);
  const [jy, jm, jd] = toJalali(parts.year, parts.month, parts.day);
  return `${toFa(String(jd))} ${JALALI_MONTHS[jm - 1] ?? ''} ${toFa(String(jy))}`.trim();
}

/**
 * فاصلهٔ نسبی نسبت به یک مبنا. مبنا همیشه `generatedAt` است نه `Date.now()`
 * تا خروجی SSR و اولین رندر کلاینت دقیقاً یکی باشد.
 */
export function relative(iso: string, reference: string | number): string {
  const at = Date.parse(iso);
  const base = typeof reference === 'number' ? reference : Date.parse(reference);
  if (Number.isNaN(at) || Number.isNaN(base)) return '—';
  const diff = base - at;
  if (diff < 5_000) return 'هم‌اکنون';
  if (diff < 60_000) return `${faNum(Math.floor(diff / 1000))} ثانیه پیش`;
  if (diff < 3_600_000) return `${faNum(Math.floor(diff / 60_000))} دقیقه پیش`;
  if (diff < 86_400_000) return `${faNum(Math.floor(diff / 3_600_000))} ساعت پیش`;
  return `${faNum(Math.floor(diff / 86_400_000))} روز پیش`;
}

/** عمر پروسه به زبان آدمیزاد. */
export function uptimeFa(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'تازه بالا آمده';
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${faNum(days)} روز و ${faNum(hours)} ساعت`;
  if (hours > 0) return `${faNum(hours)} ساعت و ${faNum(minutes)} دقیقه`;
  if (minutes > 0) return `${faNum(minutes)} دقیقه`;
  return `${faNum(Math.floor(seconds))} ثانیه`;
}

/**
 * برچسب یک سطل ساعتی.
 * قرارداد سطل‌ها با `src/lib/observability.ts` یکی است: سطل i بازهٔ
 * `[now-(window-i)h , now-(window-i-1)h]` را پوشش می‌دهد، یعنی سطل آخر ساعتِ
 * جاری است. خروجی همیشه «HH:MM تا HH:MM» است، پس `slice(0, 5)` شروع و
 * `slice(-5)` پایان بازه را می‌دهد (چند مصرف‌کننده به همین شکل استفاده می‌کنند).
 */
export function bucketLabel(generatedAt: string, index: number, windowHours = 24): string {
  const base = Date.parse(generatedAt);
  if (Number.isNaN(base)) return '—';
  const start = base - (windowHours - index) * 3_600_000;
  return `${hhmmAt(start)} تا ${hhmmAt(start + 3_600_000)}`;
}

/** فقط ساعتِ شروع یک سطل — برای برچسب محور. */
export function bucketStart(generatedAt: string, index: number, windowHours = 24): string {
  const base = Date.parse(generatedAt);
  if (Number.isNaN(base)) return '—';
  return hhmmAt(base - (windowHours - index) * 3_600_000);
}

/** همان سطل، ولی به‌صورت «چند ساعت پیش» — برای برچسب‌های فشرده. */
export function bucketAgo(index: number, windowHours = 24): string {
  const offset = windowHours - 1 - index;
  if (offset <= 0) return 'ساعت جاری';
  return `${faNum(offset)} ساعت پیش`;
}

/* ═══════════════════════ کلید و تُن ═══════════════════════ */

/**
 * کلیدهای پایدار سطل‌های ساعتی. کلید نباید خودِ index باشد؛ هم قانون lint است
 * و هم باعث remount کل ستون‌ها در هر refresh می‌شود.
 */
export const HOUR_KEYS: readonly string[] = Array.from(
  { length: 48 },
  (_, index) => `bucket-${index}`,
);

export function hourKey(index: number): string {
  return HOUR_KEYS[index] ?? `bucket-${index}`;
}

/** تُن‌های معنایی — دقیقاً همان مقادیری که CSS با `data-tone` می‌شناسد. */
export type ToneKey = 'ok' | 'warn' | 'bad' | 'info' | 'idle';

const STATUS_LABEL: Record<string, string> = {
  healthy: 'سالم',
  degraded: 'کند',
  down: 'قطع',
  idle: 'بی‌ترافیک',
  unknown: 'نامشخص',
};

const STATUS_TONE: Record<string, ToneKey> = {
  healthy: 'ok',
  degraded: 'warn',
  down: 'bad',
  idle: 'idle',
  unknown: 'idle',
};

const LEVEL_LABEL: Record<string, string> = {
  debug: 'اشکال‌زدایی',
  info: 'اطلاع',
  warn: 'هشدار',
  error: 'خطا',
  fatal: 'بحرانی',
};

const LEVEL_TONE: Record<string, ToneKey> = {
  debug: 'idle',
  info: 'info',
  warn: 'warn',
  error: 'bad',
  fatal: 'bad',
};

/**
 * نام فارسی منابع شناخته‌شدهٔ لاگ.
 * کلیدها دقیقاً همان `ServiceKey` های `src/lib/observability.ts` هستند. منبعی
 * که اینجا نباشد با نام خام خودش نمایش داده می‌شود — حدس نمی‌زنیم.
 */
const SOURCE_LABEL: Record<string, string> = {
  api: 'API اصلی',
  db: 'پایگاه داده',
  cache: 'کش',
  queue: 'صف پیام',
  auth: 'احراز هویت',
  edge: 'Edge و CDN',
  email: 'ایمیل',
  sms: 'پیامک',
  storage: 'ذخیره‌سازی',
  system: 'سامانه',
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function statusTone(status: string): ToneKey {
  return STATUS_TONE[status] ?? 'idle';
}

export function levelLabel(level: string): string {
  return LEVEL_LABEL[level] ?? level;
}

export function levelTone(level: string): ToneKey {
  return LEVEL_TONE[level] ?? 'info';
}

/** نام خواناى منبع؛ اگر نشناسیم همان کلید خام برمی‌گردد. */
export function sourceName(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

/** true یعنی برای این منبع نام فارسی داریم و کلید خام هم ارزش نمایش دارد. */
export function hasSourceName(source: string): boolean {
  return SOURCE_LABEL[source] !== undefined;
}

/** پاس دادن custom property به `style` بدون `any`. */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as unknown as CSSProperties;
}
