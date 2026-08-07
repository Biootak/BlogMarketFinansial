/**
 * phone-validation.ts — تست‌های مکانیزم واحد اعتبارسنجی شماره
 *
 * پوشش:
 *   - همهٔ کشورها پذیرفته می‌شوند (AF، US، UK، DE، PK، …)
 *   - شمارهٔ مجازی/غیرشخصی (VOIP، toll-free، premium) رد می‌شود
 *   - نرمال‌سازی E.164
 *   - ورودی خالی/نامعتبر
 */

import { describe, expect, it } from 'vitest';
import {
  formatPhoneForDisplay,
  isPhoneValid,
  isVirtualNumber,
  normalizeToE164,
  validatePhone,
} from './phone-validation';

describe('validatePhone — همه کشورها', () => {
  it('افغانستان (پیش‌فرض) — ملی', () => {
    expect(validatePhone('0701234567')).toEqual({ valid: true, e164: '+93701234567' });
  });

  it('افغانستان — E.164', () => {
    expect(validatePhone('+93701234567')).toEqual({ valid: true, e164: '+93701234567' });
  });

  it('آمریکا', () => {
    expect(validatePhone('+12025550143').valid).toBe(true);
  });

  it('بریتانیا', () => {
    expect(validatePhone('+447911123456').valid).toBe(true);
  });

  it('آلمان', () => {
    expect(validatePhone('+4915123456789').valid).toBe(true);
  });

  it('پاکستان', () => {
    expect(validatePhone('+923001234567').valid).toBe(true);
  });

  it('ایران (legacy)', () => {
    expect(validatePhone('+989123456789').valid).toBe(true);
  });

  it('شماره خالی رد می‌شود', () => {
    expect(validatePhone('').valid).toBe(false);
    expect(validatePhone('   ').valid).toBe(false);
  });

  it('شماره نامعتبر رد می‌شود', () => {
    expect(validatePhone('123').valid).toBe(false);
    expect(validatePhone('abc').valid).toBe(false);
  });
});

describe('isVirtualNumber — ضد شماره مجازی', () => {
  it('toll-free آمریکا (۸۰۰) غیرشخصی است', () => {
    // باندل پیش‌فرض libphonenumber-js نوع این رنج را TOLL_FREE تشخیص می‌دهد
    expect(isVirtualNumber('+18005550199')).toBe(true);
  });

  it('premium آمریکا (۹۰۰) غیرشخصی است', () => {
    expect(isVirtualNumber('+19005550199')).toBe(true);
  });

  it('VOIP بریتانیا (رنج ۰۵۶) مجازی است', () => {
    // UK 056 range — باندل پیش‌فرض آن را VOIP تشخیص می‌دهد
    expect(isVirtualNumber('+445612345678')).toBe(true);
  });

  it('شماره موبایل عادی مجازی نیست', () => {
    expect(isVirtualNumber('+93701234567')).toBe(false);
    expect(isVirtualNumber('+12025550143')).toBe(false);
    expect(isVirtualNumber('+447911123456')).toBe(false);
  });
});

describe('isPhoneValid — مکانیزم واحد (همه کشورها + ضد مجازی)', () => {
  it('پذیرش همه کشورها', () => {
    expect(isPhoneValid('0701234567')).toBe(true); // AF
    expect(isPhoneValid('+93701234567')).toBe(true); // AF
    expect(isPhoneValid('+12025550143')).toBe(true); // US
    expect(isPhoneValid('+447911123456')).toBe(true); // UK
    expect(isPhoneValid('+4915123456789')).toBe(true); // DE
  });

  it('رد ورودی‌های خالی/نامعتبر', () => {
    expect(isPhoneValid('')).toBe(false);
    expect(isPhoneValid('  ')).toBe(false);
    expect(isPhoneValid('abc')).toBe(false);
  });
});

describe('normalizeToE164', () => {
  it('ملی → E.164', () => {
    expect(normalizeToE164('0701234567')).toBe('+93701234567');
  });

  it('بین‌المللی دست‌نخورده', () => {
    expect(normalizeToE164('+12025550143')).toBe('+12025550143');
  });
});

describe('formatPhoneForDisplay', () => {
  it('فرمت بین‌المللی', () => {
    expect(formatPhoneForDisplay('+93701234567')).toBe('+93 70 123 4567');
  });

  it('fallback روی ورودی اصلی', () => {
    expect(formatPhoneForDisplay('not-a-number')).toBe('not-a-number');
  });
});
