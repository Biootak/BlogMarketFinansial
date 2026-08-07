/**
 * exchange-hours — استخراج/بسته‌بندی ساعات کاری از/در Exchange.address
 *
 *   الگوی ذخیره‌سازی backward-compatible:
 *   - address قابل‌مشاهده: "خیابان اصلی، کابل"
 *   - address کامل: "خیابان اصلی، کابل;HOURS={...json...}"
 *
 *   این الگو در [WorkingHoursWorkspace] نوشته می‌شود و در اینجا فقط parse می‌شود.
 *   جداسازی برای جلوگیری از import چرخه‌ای و برای استفاده در هر دو context
 *   (server / public page).
 */

import { z } from 'zod';

export const HoursValueSchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'فرمت ساعت نامعتبر'),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'فرمت ساعت نامعتبر'),
  closed: z.boolean(),
});

export const HoursMapSchema = z.object({
  sat: HoursValueSchema,
  sun: HoursValueSchema,
  mon: HoursValueSchema,
  tue: HoursValueSchema,
  wed: HoursValueSchema,
  thu: HoursValueSchema,
  fri: HoursValueSchema,
});

export type HoursValue = z.infer<typeof HoursValueSchema>;
export type HoursMap = z.infer<typeof HoursMapSchema>;

const MARKER = ';HOURS=';

export const DEFAULT_HOURS: HoursMap = {
  sat: { open: '08:00', close: '16:00', closed: false },
  sun: { open: '08:00', close: '16:00', closed: false },
  mon: { open: '08:00', close: '16:00', closed: false },
  tue: { open: '08:00', close: '16:00', closed: false },
  wed: { open: '08:00', close: '16:00', closed: false },
  thu: { open: '08:00', close: '16:00', closed: false },
  fri: { open: '00:00', close: '00:00', closed: true },
};

/**
 * address کامل را به دو بخش تقسیم می‌کند: visibleAddress (برای نمایش) و hoursMap.
 * اگر marker وجود نداشته باشد یا JSON خراب باشد، hoursMap = DEFAULT_HOURS.
 */
export function splitHours(address: string | null | undefined): {
  visibleAddress: string;
  hours: HoursMap;
} {
  if (!address) return { visibleAddress: '', hours: DEFAULT_HOURS };
  const idx = address.indexOf(MARKER);
  if (idx === -1) return { visibleAddress: address, hours: DEFAULT_HOURS };
  const visibleAddress = address.slice(0, idx);
  const raw = address.slice(idx + MARKER.length);
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = HoursMapSchema.safeParse(parsed);
    if (!result.success) return { visibleAddress, hours: DEFAULT_HOURS };
    return { visibleAddress, hours: result.data };
  } catch {
    return { visibleAddress, hours: DEFAULT_HOURS };
  }
}

/** فقط visibleAddress را برمی‌گرداند (بدون parsing JSON). */
export function stripHours(address: string | null | undefined): string {
  if (!address) return '';
  const idx = address.indexOf(MARKER);
  return idx === -1 ? address : address.slice(0, idx);
}

/** address قابل‌مشاهده + hours را به یک رشته‌ی واحد pack می‌کند. */
export function packHours(visibleAddress: string, hours: HoursMap): string {
  const base = visibleAddress.trim();
  return `${base}${MARKER}${JSON.stringify(hours)}`;
}

// ─── نمایش برنامهٔ هفتگی ────────────────────────────────────────────────────
// منطق مشترک نماهای ساعات کاری (strip روی صفحهٔ صرافی و نمای کامل /hours).

export type DayKey = keyof HoursMap;

/** هفتهٔ افغانستان از شنبه شروع می‌شود. */
export const WEEK_DAYS: ReadonlyArray<{
  key: DayKey;
  label: string;
  short: string;
  long: string;
}> = [
  { key: 'sat', label: 'شنبه', short: 'Sat', long: 'Saturday' },
  { key: 'sun', label: 'یکشنبه', short: 'Sun', long: 'Sunday' },
  { key: 'mon', label: 'دوشنبه', short: 'Mon', long: 'Monday' },
  { key: 'tue', label: 'سه‌شنبه', short: 'Tue', long: 'Tuesday' },
  { key: 'wed', label: 'چهارشنبه', short: 'Wed', long: 'Wednesday' },
  { key: 'thu', label: 'پنجشنبه', short: 'Thu', long: 'Thursday' },
  { key: 'fri', label: 'جمعه', short: 'Fri', long: 'Friday' },
];

export const DEFAULT_TIMEZONE = 'Asia/Tehran';

export type DayStatus = 'closed' | 'open' | 'upcoming' | 'past';

// نماهای ساعات کاری هر ۳۰ ثانیه re-render می‌شوند؛ ساخت Intl در هر render گران است.
const DAY_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();
const TIME_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();

function dayFmt(timeZone: string): Intl.DateTimeFormat {
  let f = DAY_FMT_CACHE.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone });
    DAY_FMT_CACHE.set(timeZone, f);
  }
  return f;
}

function timeFmt(timeZone: string): Intl.DateTimeFormat {
  let f = TIME_FMT_CACHE.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    });
    TIME_FMT_CACHE.set(timeZone, f);
  }
  return f;
}

const WEEKDAY_TO_KEY: Record<string, DayKey> = {
  Sat: 'sat',
  Sun: 'sun',
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
};

/** روز جاری در منطقهٔ زمانی داده‌شده. */
export function nowDayKey(timezone = DEFAULT_TIMEZONE): DayKey {
  return WEEKDAY_TO_KEY[dayFmt(timezone).format(new Date())] ?? 'sat';
}

/** `HH:MM` → ساعت اعشاری (`08:30` → `8.5`). */
export function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

/** ساعت اعشاری لحظهٔ داده‌شده در منطقهٔ زمانی مشخص. */
export function hourOfDayInZone(now: Date, timezone = DEFAULT_TIMEZONE): number {
  const [hh, mm] = timeFmt(timezone)
    .formatToParts(now)
    .map((p) => p.value)
    .join('')
    .split(':')
    .map(Number);
  return hh + mm / 60;
}

export function getDayStatus(
  hours: Record<string, HoursValue>,
  dayKey: DayKey,
  currentHour: number,
): DayStatus {
  const v = hours[dayKey];
  if (!v || v.closed) return 'closed';
  const open = parseTime(v.open);
  const close = parseTime(v.close);
  if (currentHour >= open && currentHour < close) return 'open';
  if (currentHour < open) return 'upcoming';
  return 'past';
}

/** تعداد روزهای باز و مجموع ساعات باز در هفته. */
export function weeklyHoursSummary(hours: Record<string, HoursValue>): {
  openDays: number;
  totalOpenHours: number;
} {
  let openDays = 0;
  let totalOpenHours = 0;
  for (const d of WEEK_DAYS) {
    const v = hours[d.key];
    if (!v || v.closed) continue;
    openDays += 1;
    totalOpenHours += Math.max(0, parseTime(v.close) - parseTime(v.open));
  }
  return { openDays, totalOpenHours };
}
