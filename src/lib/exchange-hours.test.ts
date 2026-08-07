/**
 * exchange-hours.ts — تست‌های واحد
 *
 * ساعات کاری به‌صورت backward-compatible داخل `Exchange.address` بعد از marker
 * `;HOURS=` ذخیره می‌شود. تست‌ها روی round-trip (pack → split) و رفتار fallback
 * در برابر JSON خراب یا schema نامعتبر تمرکز دارند.
 */

import {
  DEFAULT_HOURS,
  type HoursMap,
  HoursMapSchema,
  packHours,
  splitHours,
  stripHours,
} from '@/lib/exchange-hours';
import { describe, expect, it } from 'vitest';

const CUSTOM_HOURS: HoursMap = {
  ...DEFAULT_HOURS,
  sat: { open: '09:00', close: '18:30', closed: false },
  fri: { open: '00:00', close: '00:00', closed: true },
};

// ─── splitHours ───────────────────────────────────────────────────────────────

describe('splitHours', () => {
  it('address تهی → آدرس خالی + ساعات پیش‌فرض', () => {
    for (const value of [null, undefined, '']) {
      const result = splitHours(value);
      expect(result.visibleAddress).toBe('');
      expect(result.hours).toEqual(DEFAULT_HOURS);
    }
  });

  it('address بدون marker → همان آدرس + ساعات پیش‌فرض', () => {
    const result = splitHours('خیابان اصلی، کابل');
    expect(result.visibleAddress).toBe('خیابان اصلی، کابل');
    expect(result.hours).toEqual(DEFAULT_HOURS);
  });

  it('address با marker → جداسازی آدرس و ساعات', () => {
    const packed = packHours('خیابان اصلی، کابل', CUSTOM_HOURS);
    const result = splitHours(packed);
    expect(result.visibleAddress).toBe('خیابان اصلی، کابل');
    expect(result.hours).toEqual(CUSTOM_HOURS);
  });

  it('JSON خراب → آدرس حفظ می‌شود ولی ساعات پیش‌فرض برمی‌گردد', () => {
    const result = splitHours('کابل;HOURS={not-json');
    expect(result.visibleAddress).toBe('کابل');
    expect(result.hours).toEqual(DEFAULT_HOURS);
  });

  it('JSON معتبر ولی schema ناقص (روز جا افتاده) → ساعات پیش‌فرض', () => {
    const { fri: _fri, ...incomplete } = CUSTOM_HOURS;
    const result = splitHours(`کابل;HOURS=${JSON.stringify(incomplete)}`);
    expect(result.hours).toEqual(DEFAULT_HOURS);
  });

  it('فرمت ساعت نامعتبر → ساعات پیش‌فرض', () => {
    const invalid = { ...CUSTOM_HOURS, sat: { open: '25:00', close: '18:00', closed: false } };
    const result = splitHours(`کابل;HOURS=${JSON.stringify(invalid)}`);
    expect(result.hours).toEqual(DEFAULT_HOURS);
  });

  it('closed غیر boolean → ساعات پیش‌فرض', () => {
    const invalid = { ...CUSTOM_HOURS, sun: { open: '09:00', close: '17:00', closed: 'yes' } };
    const result = splitHours(`کابل;HOURS=${JSON.stringify(invalid)}`);
    expect(result.hours).toEqual(DEFAULT_HOURS);
  });

  it('آدرس خالی قبل از marker مجاز است', () => {
    const result = splitHours(packHours('', DEFAULT_HOURS));
    expect(result.visibleAddress).toBe('');
    expect(result.hours).toEqual(DEFAULT_HOURS);
  });
});

// ─── stripHours ───────────────────────────────────────────────────────────────

describe('stripHours', () => {
  it('تهی → رشته خالی', () => {
    expect(stripHours(null)).toBe('');
    expect(stripHours(undefined)).toBe('');
  });

  it('بدون marker → بدون تغییر', () => {
    expect(stripHours('کابل')).toBe('کابل');
  });

  it('با marker → فقط بخش قابل نمایش', () => {
    expect(stripHours(packHours('کابل، شهر نو', CUSTOM_HOURS))).toBe('کابل، شهر نو');
  });

  it('حتی با JSON خراب هم آدرس را برمی‌گرداند (بدون parse)', () => {
    expect(stripHours('کابل;HOURS={broken')).toBe('کابل');
  });
});

// ─── packHours ────────────────────────────────────────────────────────────────

describe('packHours', () => {
  it('marker را با JSON ساعات اضافه می‌کند', () => {
    const packed = packHours('کابل', DEFAULT_HOURS);
    expect(packed.startsWith('کابل;HOURS=')).toBe(true);
    expect(HoursMapSchema.safeParse(JSON.parse(packed.split(';HOURS=')[1] ?? '')).success).toBe(
      true,
    );
  });

  it('فاصله‌های اضافه آدرس trim می‌شود', () => {
    expect(splitHours(packHours('  کابل  ', DEFAULT_HOURS)).visibleAddress).toBe('کابل');
  });

  it('round-trip: pack → split مقدار اولیه را برمی‌گرداند', () => {
    const { visibleAddress, hours } = splitHours(packHours('کابل، شهر نو', CUSTOM_HOURS));
    expect(visibleAddress).toBe('کابل، شهر نو');
    expect(hours).toEqual(CUSTOM_HOURS);
  });

  it('pack دوباره روی مقدار pack شده idempotent است (پس از strip)', () => {
    const once = packHours('کابل', CUSTOM_HOURS);
    const twice = packHours(stripHours(once), CUSTOM_HOURS);
    expect(twice).toBe(once);
  });
});

// ─── DEFAULT_HOURS ────────────────────────────────────────────────────────────

describe('DEFAULT_HOURS', () => {
  it('با schema سازگار است', () => {
    expect(HoursMapSchema.safeParse(DEFAULT_HOURS).success).toBe(true);
  });

  it('جمعه تعطیل و بقیه روزها ۰۸:۰۰–۱۶:۰۰ است', () => {
    expect(DEFAULT_HOURS.fri.closed).toBe(true);
    for (const day of ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const) {
      expect(DEFAULT_HOURS[day]).toEqual({ open: '08:00', close: '16:00', closed: false });
    }
  });
});
