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
