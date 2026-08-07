/**
 * totp.ts — تست‌های واحد
 *
 * RFC 6238 / RFC 4226 — بردارهای رسمی با secret "12345678901234567890"
 * (Base32: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ) بررسی می‌شوند.
 * زمان با vi.setSystemTime قفل می‌شود تا تست deterministic بماند.
 */

import { generateOtpAuthUri, generateTotpSecret, getCurrentTotp, verifyTotp } from '@/lib/totp';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** secret استاندارد RFC 4226 = ASCII "12345678901234567890" */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

/** counter = floor(epochSeconds / 30) → زمان لازم برای هر بردار */
function timeForCounter(counter: number): number {
  return counter * 30 * 1000;
}

afterEach(() => {
  vi.useRealTimers();
});

// ─── generateTotpSecret ───────────────────────────────────────────────────────

describe('generateTotpSecret', () => {
  it('۳۲ کاراکتر Base32 تولید می‌کند (۱۶۰ بیت)', () => {
    const secret = generateTotpSecret();
    expect(secret).toHaveLength(32);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it('هر بار مقدار متفاوت می‌دهد', () => {
    const secrets = new Set(Array.from({ length: 20 }, () => generateTotpSecret()));
    expect(secrets.size).toBe(20);
  });
});

// ─── getCurrentTotp / RFC 6238 vectors ────────────────────────────────────────

describe('getCurrentTotp', () => {
  it('کد ۶ رقمی برمی‌گرداند', async () => {
    const code = await getCurrentTotp(RFC_SECRET);
    expect(code).toMatch(/^\d{6}$/);
  });

  // RFC 6238 Appendix B — SHA-1، ۶ رقم، period=30
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('epoch %i → کد %s (بردار RFC 6238)', async (epochSeconds, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(epochSeconds * 1000);
    await expect(getCurrentTotp(RFC_SECRET)).resolves.toBe(expected);
  });

  it('secret با حروف کوچک هم همان کد را می‌دهد (Base32 case-insensitive)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(timeForCounter(1000));
    const upper = await getCurrentTotp(RFC_SECRET);
    const lower = await getCurrentTotp(RFC_SECRET.toLowerCase());
    expect(lower).toBe(upper);
  });

  it('padding با «=» نتیجه را تغییر نمی‌دهد', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(timeForCounter(1000));
    const plain = await getCurrentTotp(RFC_SECRET);
    const padded = await getCurrentTotp(`${RFC_SECRET}======`);
    expect(padded).toBe(plain);
  });
});

// ─── verifyTotp ───────────────────────────────────────────────────────────────

describe('verifyTotp', () => {
  it('کد جاری پذیرفته می‌شود', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(timeForCounter(5000));
    const code = await getCurrentTotp(RFC_SECRET);
    await expect(verifyTotp(RFC_SECRET, code)).resolves.toBe(true);
  });

  it('کد پنجره قبل (drift −۳۰ ثانیه) پذیرفته می‌شود', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(timeForCounter(4999));
    const previous = await getCurrentTotp(RFC_SECRET);
    vi.setSystemTime(timeForCounter(5000));
    await expect(verifyTotp(RFC_SECRET, previous)).resolves.toBe(true);
  });

  it('کد پنجره بعد (drift +۳۰ ثانیه) پذیرفته می‌شود', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(timeForCounter(5001));
    const next = await getCurrentTotp(RFC_SECRET);
    vi.setSystemTime(timeForCounter(5000));
    await expect(verifyTotp(RFC_SECRET, next)).resolves.toBe(true);
  });

  it('کد دو پنجره دورتر رد می‌شود', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(timeForCounter(5002));
    const tooOld = await getCurrentTotp(RFC_SECRET);
    vi.setSystemTime(timeForCounter(5000));
    await expect(verifyTotp(RFC_SECRET, tooOld)).resolves.toBe(false);
  });

  it('فاصله‌های داخل کد نادیده گرفته می‌شوند', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(timeForCounter(5000));
    const code = await getCurrentTotp(RFC_SECRET);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    await expect(verifyTotp(RFC_SECRET, spaced)).resolves.toBe(true);
  });

  it.each(['', '12345', '1234567', 'abcdef', '12345a', '۱۲۳۴۵۶'])(
    'ورودی بدشکل «%s» بدون محاسبه HMAC رد می‌شود',
    async (token) => {
      await expect(verifyTotp(RFC_SECRET, token)).resolves.toBe(false);
    },
  );

  it('کد درست با secret دیگر رد می‌شود', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(timeForCounter(5000));
    const code = await getCurrentTotp(RFC_SECRET);
    await expect(verifyTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJA', code)).resolves.toBe(false);
  });
});

// ─── generateOtpAuthUri ───────────────────────────────────────────────────────

describe('generateOtpAuthUri', () => {
  it('scheme و پارامترهای استاندارد را دارد', () => {
    const uri = generateOtpAuthUri(RFC_SECRET, 'admin@example.com');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain(`secret=${RFC_SECRET}`);
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
    expect(uri).toContain('issuer=FinancialMarket');
  });

  it('label را به شکل «issuer:account» و URL-encoded می‌سازد', () => {
    const uri = generateOtpAuthUri(RFC_SECRET, 'ali@example.com', 'صرافی کابل');
    const label = uri.slice('otpauth://totp/'.length, uri.indexOf('?'));
    expect(decodeURIComponent(label)).toBe('صرافی کابل:ali@example.com');
  });

  it('issuer سفارشی در query هم می‌آید', () => {
    const uri = generateOtpAuthUri(RFC_SECRET, 'ali', 'Kabul Exchange');
    expect(new URL(uri).searchParams.get('issuer')).toBe('Kabul Exchange');
  });

  it('secret تولیدشده در URI قابل مصرف است (round-trip)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(timeForCounter(7000));
    const secret = generateTotpSecret();
    const uri = generateOtpAuthUri(secret, 'ali');
    const fromUri = new URL(uri).searchParams.get('secret') ?? '';
    const code = await getCurrentTotp(fromUri);
    await expect(verifyTotp(secret, code)).resolves.toBe(true);
  });
});
