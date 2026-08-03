/**
 * afn-format.ts — تست‌های واحد
 *
 * همه توابع pure هستند — بدون DB، بدون mock.
 * از Intl.NumberFormat وابسته به locale — Node 18+ پشتیبانی کامل دارد.
 *
 * قرارداد نمایش: نماد "AFN" (لاتین) بعد از عدد می‌آید، نه "ف" یا "؋" جلوی عدد.
 */

import { formatAFN, formatAFNCompact, formatCurrency, formatRate } from '@/lib/afn-format';
import { describe, expect, it } from 'vitest';

// ─── formatAFN ────────────────────────────────────────────────────────────────

describe('formatAFN', () => {
  it('نماد AFN در خروجی وجود دارد', () => {
    const result = formatAFN(150000);
    expect(result).toContain('AFN');
  });

  it('نماد AFN بعد از عدد می‌آید', () => {
    const result = formatAFN(150000);
    const idx = result.indexOf('AFN');
    // باید حداقل یک رقم قبل از AFN باشد
    expect(idx).toBeGreaterThan(0);
  });

  it('صفر → حاوی AFN است', () => {
    expect(formatAFN(0)).toContain('AFN');
  });

  it('مقدار number و bigint یکسان نتیجه می‌دهند', () => {
    expect(formatAFN(150000)).toBe(formatAFN(BigInt(150000)));
  });

  it('رشته عددی هم قبول می‌شود', () => {
    expect(formatAFN('150000')).toContain('AFN');
  });

  it('اعداد منفی هم کار می‌کند', () => {
    const result = formatAFN(-5000);
    expect(result).toContain('AFN');
  });
});

// ─── formatAFNCompact ─────────────────────────────────────────────────────────

describe('formatAFNCompact', () => {
  it('مقادیر >= 1 میلیارد → "میلیارد AFN" دارند', () => {
    expect(formatAFNCompact(2_000_000_000)).toContain('میلیارد AFN');
  });

  it('مقادیر >= 1 میلیون → "میلیون AFN" دارند', () => {
    expect(formatAFNCompact(1_500_000)).toContain('میلیون AFN');
  });

  it('مقادیر >= 1000 → "هزار AFN" دارند', () => {
    expect(formatAFNCompact(5_000)).toContain('هزار AFN');
  });

  it('مقادیر < 1000 → formatAFN معمولی', () => {
    const result = formatAFNCompact(500);
    expect(result).toContain('AFN');
    expect(result).not.toContain('هزار');
    expect(result).not.toContain('میلیون');
    expect(result).not.toContain('میلیارد');
  });

  it('مرز دقیق ۱۰۰۰ → هزار فرمت', () => {
    expect(formatAFNCompact(1000)).toContain('هزار AFN');
  });

  it('۹۹۹ → compact نیست', () => {
    const result = formatAFNCompact(999);
    expect(result).not.toContain('هزار');
  });

  it('مقادیر bigint درست کار می‌کند', () => {
    expect(formatAFNCompact(BigInt(2_000_000))).toContain('میلیون AFN');
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

  it('AFN → حاوی AFN است (نه ؋)', () => {
    expect(formatCurrency(1000, 'AFN')).toContain('AFN');
  });

  it('AFN → نماد AFN بعد از عدد می‌آید', () => {
    const result = formatCurrency(1000, 'AFN');
    const idx = result.indexOf('AFN');
    expect(idx).toBeGreaterThan(0);
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
