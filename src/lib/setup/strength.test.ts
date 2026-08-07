/**
 * setup/strength.ts — تست‌های واحد
 *
 * توابع pure هستند؛ آستانه‌ها بر اساس NIST 800-63B تنظیم شده‌اند.
 * هدف تست: پایداری فرمول entropy + نگاشت درست bits → score/label/tone.
 */

import { calculateEntropy, evaluatePassword, scoreFromEntropy } from '@/lib/setup/strength';
import { describe, expect, it } from 'vitest';

// ─── calculateEntropy ─────────────────────────────────────────────────────────

describe('calculateEntropy', () => {
  it('رمز خالی → صفر', () => {
    expect(calculateEntropy('')).toBe(0);
  });

  it('فقط حروف کوچک → length × log2(26)', () => {
    expect(calculateEntropy('abcd')).toBeCloseTo(4 * Math.log2(26), 6);
  });

  it('حروف کوچک + بزرگ → charset = 52', () => {
    expect(calculateEntropy('abcD')).toBeCloseTo(4 * Math.log2(52), 6);
  });

  it('حروف + رقم → charset = 62', () => {
    expect(calculateEntropy('abcD1')).toBeCloseTo(5 * Math.log2(62), 6);
  });

  it('افزودن نماد → charset = 94', () => {
    expect(calculateEntropy('abcD1!')).toBeCloseTo(6 * Math.log2(94), 6);
  });

  it('حروف فارسی هر دو کلاس symbol و other را فعال می‌کند → charset = 132', () => {
    const persianOnly = calculateEntropy('گذرواژه');
    expect(persianOnly).toBeCloseTo(7 * Math.log2(32 + 100), 6);
    expect(persianOnly).toBeGreaterThan(calculateEntropy('password'));
  });

  it('فاصله به‌تنهایی هیچ کلاسی را فعال نمی‌کند → صفر', () => {
    expect(calculateEntropy('   ')).toBe(0);
  });

  it('با طول یکسان، تنوع بیشتر entropy بیشتری می‌دهد', () => {
    expect(calculateEntropy('Aa1!Aa1!')).toBeGreaterThan(calculateEntropy('aaaaaaaa'));
  });

  it('با کلاس یکسان، طول بیشتر entropy بیشتری می‌دهد', () => {
    expect(calculateEntropy('abcdefgh')).toBeGreaterThan(calculateEntropy('abcd'));
  });
});

// ─── scoreFromEntropy ─────────────────────────────────────────────────────────

describe('scoreFromEntropy', () => {
  it('طول صفر → score 0 حتی با bits بالا', () => {
    expect(scoreFromEntropy(120, 0)).toBe(0);
  });

  it.each([
    [0, 8, 0],
    [27, 8, 0],
    [28, 8, 1],
    [39, 8, 1],
    [40, 8, 2],
    [54, 8, 2],
    [55, 12, 3],
    [69, 12, 3],
    [70, 16, 4],
    [200, 24, 4],
  ])('bits=%i length=%i → score %i', (bits, length, expected) => {
    expect(scoreFromEntropy(bits, length)).toBe(expected);
  });
});

// ─── evaluatePassword ─────────────────────────────────────────────────────────

describe('evaluatePassword', () => {
  it('رمز خالی → ضعیف‌ترین حالت با tone خطر', () => {
    const result = evaluatePassword('');
    expect(result).toMatchObject({ score: 0, bits: 0, tone: 'danger', label: 'بسیار ضعیف' });
  });

  it('«123456» → score 0', () => {
    expect(evaluatePassword('123456').score).toBe(0);
  });

  it('رمز ۱۲ کاراکتری با ۴ کلاس → score 4 و tone قوی', () => {
    const result = evaluatePassword('Kabul#2026Afn');
    expect(result.score).toBe(4);
    expect(result.tone).toBe('strong');
    expect(result.label).toBe('عالی');
  });

  it('bits گرد شده است (عدد صحیح)', () => {
    const { bits } = evaluatePassword('abcD1!x');
    expect(Number.isInteger(bits)).toBe(true);
    expect(bits).toBe(Math.round(calculateEntropy('abcD1!x')));
  });

  it('score و bits با scoreFromEntropy سازگارند', () => {
    const password = 'Aa1!Aa1!';
    const result = evaluatePassword(password);
    expect(result.score).toBe(scoreFromEntropy(result.bits, password.length));
  });

  it('description همیشه غیرخالی است', () => {
    for (const password of ['', 'abc', 'abcdefgh', 'Abcdefgh1', 'Kabul#2026Afn!']) {
      expect(evaluatePassword(password).description.length).toBeGreaterThan(0);
    }
  });

  it('رمز قوی‌تر هرگز score کمتری نمی‌گیرد (monotonic در طول)', () => {
    const scores = ['Aa1!', 'Aa1!Aa1!', 'Aa1!Aa1!Aa1!'].map((p) => evaluatePassword(p).score);
    expect(scores[1]).toBeGreaterThanOrEqual(scores[0] ?? 0);
    expect(scores[2]).toBeGreaterThanOrEqual(scores[1] ?? 0);
  });
});
