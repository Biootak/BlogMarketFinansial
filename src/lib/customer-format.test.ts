/**
 * customer-format.ts — تست‌های واحد
 *
 * همه توابع pure هستند. خروجی Intl با locale `fa-IR` است، پس به‌جای مقایسه
 * رشته‌ای شکننده، ارقام فارسی به لاتین نرمال می‌شوند و ساختار بررسی می‌شود.
 */

import {
  formatAmount,
  formatAmountCompact,
  formatCompact,
  formatDateShort,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatPhone,
  formatRelative,
  formatTime,
  getInitials,
  minorToDecimal,
  riskLabel,
  riskTone,
  shortHash,
} from '@/lib/customer-format';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** ارقام فارسی/جداکننده‌ها → لاتین، برای assertion پایدار */
function toLatin(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٬،]/g, ',')
    .replace(/٫/g, '.')
    .replace(/\s/g, ' ');
}

afterEach(() => {
  vi.useRealTimers();
});

// ─── minorToDecimal ───────────────────────────────────────────────────────────

describe('minorToDecimal', () => {
  it('null/undefined → صفر', () => {
    expect(minorToDecimal(null)).toBe(0);
    expect(minorToDecimal(undefined)).toBe(0);
  });

  it('واحد خرد → اعشاری', () => {
    expect(minorToDecimal(123456)).toBe(1234.56);
  });

  it('string و number و bigint یکسان نتیجه می‌دهند', () => {
    expect(minorToDecimal('123456')).toBe(1234.56);
    expect(minorToDecimal(BigInt(123456))).toBe(1234.56);
  });

  it('مقدار بسیار بزرگ بدون سرریز BigInt', () => {
    expect(minorToDecimal('1000000000000')).toBe(10_000_000_000);
  });

  it('صفر → صفر', () => {
    expect(minorToDecimal(0)).toBe(0);
  });

  it('اعشار بدون خطای شناور جمع می‌شود', () => {
    expect(minorToDecimal(1)).toBe(0.01);
    expect(minorToDecimal(99)).toBe(0.99);
  });
});

// ─── formatAmount / formatAmountCompact ───────────────────────────────────────

describe('formatAmount', () => {
  it('واحد بعد از عدد می‌آید (AFN اول در دامنه افغانستان)', () => {
    const out = formatAmount(150000, 'AFN');
    expect(out.endsWith(' AFN')).toBe(true);
    expect(toLatin(out)).toBe('1,500 AFN');
  });

  it('حداکثر دو رقم اعشار', () => {
    expect(toLatin(formatAmount(123456, 'AFN'))).toBe('1,234.56 AFN');
  });

  it('null → صفر با واحد', () => {
    expect(toLatin(formatAmount(null, 'USD'))).toBe('0 USD');
  });
});

describe('formatAmountCompact', () => {
  it('مقدار بزرگ با مقیاس فارسی فشرده می‌شود', () => {
    const compact = formatAmountCompact(1_234_500_00, 'AFN');
    expect(compact.endsWith(' AFN')).toBe(true);
    expect(toLatin(compact)).toBe('1.2 میلیون AFN');
  });

  it('صفر → حاوی واحد است', () => {
    expect(formatAmountCompact(0, 'AFN')).toContain('AFN');
  });
});

// ─── number formatters ────────────────────────────────────────────────────────

describe('formatNumber / formatCompact / formatPercent', () => {
  it('formatNumber جداکننده هزار فارسی می‌گذارد', () => {
    expect(toLatin(formatNumber(1234567))).toBe('1,234,567');
  });

  it('formatCompact مقیاس فارسی با یک رقم اعشار می‌دهد', () => {
    expect(toLatin(formatCompact(1_500_000))).toBe('1.5 میلیون');
    expect(toLatin(formatCompact(0))).toBe('0');
  });

  it('formatPercent نسبت را به درصد تبدیل می‌کند', () => {
    expect(toLatin(formatPercent(0.125))).toContain('12.5');
    expect(formatPercent(0.125)).toContain('٪');
  });

  it('صفر درصد هم قالب می‌گیرد', () => {
    expect(formatPercent(0)).toContain('٪');
  });
});

// ─── getInitials ──────────────────────────────────────────────────────────────

describe('getInitials', () => {
  it('حرف اول نام را بزرگ برمی‌گرداند', () => {
    expect(getInitials('ahmad wali')).toBe('A');
  });

  it('نام فارسی → حرف اول همان', () => {
    expect(getInitials('احمد ولی')).toBe('ا');
  });

  it('فضای اضافه نادیده گرفته می‌شود', () => {
    expect(getInitials('   zahra  ')).toBe('Z');
  });

  it('نام خالی → علامت سؤال', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });
});

// ─── date/time formatters ─────────────────────────────────────────────────────

describe('date formatters', () => {
  const iso = '2026-03-21T10:30:00.000Z';

  it('formatDateTime شامل ساعت است', () => {
    expect(formatDateTime(iso)).toMatch(/[۰-۹]{2}:[۰-۹]{2}/);
  });

  it('formatDateShort سال ندارد', () => {
    const short = formatDateShort(iso);
    expect(short.length).toBeLessThan(formatDateTime(iso).length);
    expect(short).not.toMatch(/:/);
  });

  it('formatTime فقط ساعت و دقیقه است', () => {
    expect(formatTime(iso)).toMatch(/^[۰-۹]{2}:[۰-۹]{2}$/);
  });

  it('Date و رشته ISO نتیجه یکسان می‌دهند', () => {
    expect(formatDateTime(new Date(iso))).toBe(formatDateTime(iso));
  });
});

// ─── formatRelative ───────────────────────────────────────────────────────────

describe('formatRelative', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  function ago(ms: number): string {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    return formatRelative(new Date(now.getTime() - ms));
  }

  it('کمتر از یک دقیقه → «لحظاتی پیش»', () => {
    expect(ago(30_000)).toBe('لحظاتی پیش');
  });

  it('زمان آینده هم «لحظاتی پیش» است (diff منفی clamp می‌شود)', () => {
    expect(ago(-60_000)).toBe('لحظاتی پیش');
  });

  it('دقیقه / ساعت', () => {
    expect(toLatin(ago(5 * 60_000))).toBe('5 دقیقه پیش');
    expect(toLatin(ago(3 * 3600_000))).toBe('3 ساعت پیش');
  });

  it('یک روز → «دیروز»', () => {
    expect(ago(25 * 3600_000)).toBe('دیروز');
  });

  it('روز / هفته / ماه / سال', () => {
    expect(toLatin(ago(3 * 86_400_000))).toBe('3 روز پیش');
    expect(toLatin(ago(10 * 86_400_000))).toBe('1 هفته پیش');
    expect(toLatin(ago(60 * 86_400_000))).toBe('2 ماه پیش');
    expect(toLatin(ago(800 * 86_400_000))).toBe('2 سال پیش');
  });

  it('مرز ۵۹ دقیقه هنوز دقیقه است و ۶۰ دقیقه ساعت می‌شود', () => {
    expect(ago(59 * 60_000)).toContain('دقیقه پیش');
    expect(ago(60 * 60_000)).toContain('ساعت پیش');
  });
});

// ─── risk helpers ─────────────────────────────────────────────────────────────

describe('riskTone / riskLabel', () => {
  it.each([
    [0, 'emerald', 'کم‌ریسک'],
    [40, 'emerald', 'کم‌ریسک'],
    [41, 'amber', 'متوسط'],
    [70, 'amber', 'متوسط'],
    [71, 'rose', 'پرریسک'],
    [100, 'rose', 'پرریسک'],
  ])('score %i → %s / %s', (score, tone, label) => {
    expect(riskTone(score)).toBe(tone);
    expect(riskLabel(score)).toBe(label);
  });
});

// ─── formatPhone / shortHash ──────────────────────────────────────────────────

describe('formatPhone', () => {
  it('ارقام فارسی می‌شوند', () => {
    expect(formatPhone('0701234567')).toBe('۰۷۰۱۲۳۴۵۶۷');
  });

  it('علامت + حفظ و بقیه کاراکترها حذف می‌شوند', () => {
    expect(formatPhone('+93 (70) 123-4567')).toBe('+۹۳۷۰۱۲۳۴۵۶۷');
  });
});

describe('shortHash', () => {
  it('null/undefined → خط تیره', () => {
    expect(shortHash(null)).toBe('—');
    expect(shortHash(undefined)).toBe('—');
  });

  it('هش کوتاه (≤۱۰) دست‌نخورده می‌ماند', () => {
    expect(shortHash('abc123')).toBe('abc123');
    expect(shortHash('0123456789')).toBe('0123456789');
  });

  it('هش بلند → ۴ کاراکتر اول … ۴ کاراکتر آخر', () => {
    expect(shortHash('0123456789abcdef')).toBe('0123…cdef');
  });
});
