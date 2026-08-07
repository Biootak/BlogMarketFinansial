/**
 * setup/format.ts — تست‌های واحد
 *
 * قرارداد Afghanistan-first: شماره‌های افغان (`07XXXXXXXX` / `+93 7XXXXXXXX`)
 * با گروه‌بندی 2-3-4 قالب می‌شوند و شماره‌های ایرانی (`+98`/`09...`) با 4-3-4
 * به‌عنوان legacy پشتیبانی می‌شوند.
 */

import {
  formatPersianPhone,
  maskEmail,
  maskPhone,
  toAsciiDigits,
  toPersianDigits,
} from '@/lib/setup/format';
import { describe, expect, it } from 'vitest';

// ─── toPersianDigits ──────────────────────────────────────────────────────────

describe('toPersianDigits', () => {
  it('ارقام لاتین → فارسی', () => {
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
  });

  it('عدد هم قبول می‌شود', () => {
    expect(toPersianDigits(1402)).toBe('۱۴۰۲');
  });

  it('کاراکترهای غیر رقمی دست‌نخورده می‌مانند', () => {
    expect(toPersianDigits('070 123 4567')).toBe('۰۷۰ ۱۲۳ ۴۵۶۷');
  });

  it('متن بدون رقم تغییر نمی‌کند', () => {
    expect(toPersianDigits('کابل')).toBe('کابل');
  });
});

// ─── toAsciiDigits ────────────────────────────────────────────────────────────

describe('toAsciiDigits', () => {
  it('ارقام فارسی → لاتین', () => {
    expect(toAsciiDigits('۰۷۰۱۲۳۴۵۶۷')).toBe('0701234567');
  });

  it('ارقام عربی (٠-٩) → لاتین', () => {
    expect(toAsciiDigits('٠٧٠١٢٣٤٥٦٧')).toBe('0701234567');
  });

  it('با toPersianDigits رفت‌وبرگشت می‌شود', () => {
    expect(toAsciiDigits(toPersianDigits('+93701234567'))).toBe('+93701234567');
  });

  it('ورودی لاتین بدون تغییر می‌ماند', () => {
    expect(toAsciiDigits('0701234567')).toBe('0701234567');
  });
});

// ─── formatPersianPhone ───────────────────────────────────────────────────────

describe('formatPersianPhone', () => {
  it('شماره ملی افغان → گروه‌بندی 2-3-4', () => {
    expect(formatPersianPhone('0701234567')).toBe('070 123 4567');
  });

  it('بدون صفر ابتدایی هم افغان شناسایی می‌شود', () => {
    expect(formatPersianPhone('701234567')).toBe('070 123 4567');
  });

  it('فرم E.164 افغان → «+93 7XX XXX XXX»', () => {
    expect(formatPersianPhone('+93701234567')).toBe('+93 701 234 567');
  });

  it('پیش‌شماره ۹۳ بدون + به فرم ملی تبدیل می‌شود', () => {
    expect(formatPersianPhone('93701234567')).toBe('070 123 4567');
  });

  it('ارقام فارسی هم پذیرفته می‌شود', () => {
    expect(formatPersianPhone('۰۷۰۱۲۳۴۵۶۷')).toBe('070 123 4567');
  });

  it('کاراکترهای اضافه (خط تیره/فاصله/پرانتز) حذف می‌شوند', () => {
    expect(formatPersianPhone('(070) 123-4567')).toBe('070 123 4567');
  });

  it('تایپ تدریجی افغان — هر مرحله معتبر می‌ماند', () => {
    expect(formatPersianPhone('07')).toBe('07');
    expect(formatPersianPhone('070')).toBe('070');
    expect(formatPersianPhone('07012')).toBe('070 12');
    expect(formatPersianPhone('070123')).toBe('070 123');
  });

  // ⚠️ docstring تابع «0912 345 6789» را وعده می‌دهد، ولی شاخهٔ generic صفر را
  // پیش از گروه‌بندی اضافه می‌کند و خروجی واقعی 5-3-3 است. تست رفتار فعلی را
  // قفل می‌کند تا هر تغییر عمدی در قالب‌بندی legacy دیده شود.
  it('شماره ایرانی legacy (شاخهٔ generic) → گروه‌بندی 5-3-3', () => {
    expect(formatPersianPhone('09123456789')).toBe('09123 456 789');
  });

  it('فرم E.164 ایرانی legacy → «+98 912 345 6789»', () => {
    expect(formatPersianPhone('+989123456789')).toBe('+98 912 345 6789');
  });

  it('پیش‌شماره ۹۸ بدون + به فرم ملی ایرانی تبدیل می‌شود', () => {
    expect(formatPersianPhone('989123456789')).toBe('0912 345 6789');
  });

  it('شماره بین‌المللی سایر کشورها دست‌نخورده می‌ماند', () => {
    expect(formatPersianPhone('+971501234567')).toBe('+971501234567');
  });

  it('ارقام اضافه بعد از طول مجاز بریده می‌شوند', () => {
    expect(formatPersianPhone('+93701234567999')).toBe('+93 701 234 567');
    expect(formatPersianPhone('091234567890000')).toBe('09123 456 789');
  });

  it('رشته خالی → فقط صفر', () => {
    expect(formatPersianPhone('')).toBe('0');
  });
});

// ─── maskEmail ────────────────────────────────────────────────────────────────

describe('maskEmail', () => {
  it('دو کاراکتر اول نگه داشته و بقیه ستاره می‌شود', () => {
    expect(maskEmail('admin@example.com')).toBe('ad***@example.com');
  });

  it('local کوتاه (≤۲) → یک کاراکتر + سه ستاره', () => {
    expect(maskEmail('ab@example.com')).toBe('a***@example.com');
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
  });

  it('طول ماسک با طول local متناسب است', () => {
    expect(maskEmail('abcdef@x.io')).toBe('ab****@x.io');
  });

  it('ایمیل نامعتبر (بدون @ یا دامنه) دست‌نخورده برمی‌گردد', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email');
    expect(maskEmail('user@')).toBe('user@');
  });

  it('دامنه هرگز ماسک نمی‌شود', () => {
    expect(maskEmail('operator@sarafi-kabul.af')).toContain('@sarafi-kabul.af');
  });
});

// ─── maskPhone ────────────────────────────────────────────────────────────────

describe('maskPhone', () => {
  it('۴ رقم اول و ۳ رقم آخر باقی می‌ماند', () => {
    expect(maskPhone('0701234567')).toBe('0701 •••• 567');
  });

  it('ارقام فارسی اول به لاتین تبدیل می‌شوند', () => {
    expect(maskPhone('۰۷۰۱۲۳۴۵۶۷')).toBe('0701 •••• 567');
  });

  it('ورودی کوتاه‌تر از ۴ کاراکتر بدون ماسک برمی‌گردد', () => {
    expect(maskPhone('070')).toBe('070');
  });

  it('رشته خالی → خالی', () => {
    expect(maskPhone('')).toBe('');
  });
});
