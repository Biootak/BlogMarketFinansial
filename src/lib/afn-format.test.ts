/**
 * afn-format.ts — تست‌های واحد
 *
 * همه توابع pure هستند — بدون DB، بدون mock.
 * از Intl.NumberFormat وابسته به locale — Node 18+ پشتیبانی کامل دارد.
 */

import { describe, expect, it } from 'vitest';
import {
  formatAFN,
  formatAFNCompact,
  formatCurrency,
  formatRate,
} from '@/lib/afn-format';

// ─── formatAFN ────────────────────────────────────────────────────────────────

describe('formatAFN', () => {
  it('نمادِ ؋ در خروجی وجود دارد', () => {
    const result = formatAFN(150000);
    expect(result).toContain('؋');
  });

  it('صفر → حاوی ؋ است', () => {
    expect(formatAFN(0)).toContain('؋');
  });

  it('مقدار number و bigint یکسان نتیجه می‌دهند', () => {
    expect(formatAFN(150000)).toBe(formatAFN(BigInt(150000)));
  });

  it('رشته عددی هم قبول می‌شود', () => {
    expect(formatAFN('150000')).toContain('؋');
  });

  it('اعداد منفی هم کار می‌کند', () => {
    const result = formatAFN(-5000);
    expect(result).toContain('؋');
  });
});

// ─── formatAFNCompact ─────────────────────────────────────────────────────────

describe('formatAFNCompact', () => {
  it('مقادیر >= 1 میلیارد → "میلیارد ؋" دارند', () => {
    expect(formatAFNCompact(2_000_000_000)).toContain('میلیارد ؋');
  });

  it('۱ میلیارد دقیقاً', () => {
    expect(formatAFNCompact(1_000_000_000)).toBe('1.0 میلیارد ؋');
  });

  it('مقادیر >= 1 میلیون → "میلیون ؋" دارند', () => {
    expect(formatAFNCompact(1_500_000)).toContain('میلیون ؋');
  });

  it('۱.۵ میلیون دقیقاً', () => {
    expect(formatAFNCompact(1_500_000)).toBe('1.5 میلیون ؋');
  });

  it('مقادیر >= 1000 → "K ؋" دارند', () => {
    expect(formatAFNCompact(5_000)).toContain('K ؋');
  });

  it('۵K دقیقاً', () => {
    expect(formatAFNCompact(5_000)).toBe('5K ؋');
  });

  it('مقادیر < 1000 → formatAFN معمولی', () => {
    const result = formatAFNCompact(500);
    expect(result).toContain('؋');
    expect(result).not.toContain('K');
    expect(result).not.toContain('میلیون');
    expect(result).not.toContain('میلیارد');
  });

  it('مرز دقیق ۱۰۰۰ → K فرمت', () => {
    expect(formatAFNCompact(1000)).toContain('K ؋');
  });

  it('۹۹۹ → compact نیست', () => {
    const result = formatAFNCompact(999);
    expect(result).not.toContain('K');
  });

  it('مقادیر bigint درست کار می‌کند', () => {
    expect(formatAFNCompact(BigInt(2_000_000))).toContain('میلیون ؋');
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('USD → حاوی $ است', () => {
    expect(formatCurrency(1000, 'USD')).toContain('$');
  });

  it('EUR → حاوی € است', () => {
    expect(formatCurrency(1000, 'EUR')).toContain('€');
  });

  it('GBP → حاوی £ است', () => {
    expect(formatCurrency(1000, 'GBP')).toContain('£');
  });

  it('AFN → حاوی ؋ است', () => {
    expect(formatCurrency(1000, 'AFN')).toContain('؋');
  });

  it('صفر → خروجی معتبر', () => {
    expect(formatCurrency(0, 'USD')).toContain('$');
  });

  it('bigint ورودی', () => {
    expect(formatCurrency(BigInt(1000), 'USD')).toContain('$');
  });
});

// ─── formatRate ───────────────────────────────────────────────────────────────

describe('formatRate', () => {
  it('جفت ارز در خروجی وجود دارد', () => {
    const result = formatRate(67.5, 'USD', 'AFN');
    expect(result).toContain('AFN/USD');
  });

  it('نرخ رشته هم قبول می‌شود', () => {
    const result = formatRate('67.5', 'USD', 'AFN');
    expect(result).toContain('AFN/USD');
  });

  it('نرخ صفر', () => {
    const result = formatRate(0, 'EUR', 'IRR');
    expect(result).toContain('IRR/EUR');
  });
});
