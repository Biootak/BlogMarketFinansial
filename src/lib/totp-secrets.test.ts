import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptTotpSecret, encryptTotpSecret } from './totp-secrets';

vi.mock('server-only', () => ({}));

beforeEach(() => {
  vi.stubEnv('TOTP_ENCRYPTION_KEY', '');
  vi.stubEnv('TOTP_ENCRYPTION_KEY_LEGACY', '');
  vi.stubEnv('AUTH_SECRET', '');
  vi.stubEnv('NEXTAUTH_SECRET', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** ساخت بلاب v1 (قالب legacy — با AUTH_SECRET) دقیقاً مثل نسخهٔ قبلی. */
function buildV1Blob(value: string, secret: string): string {
  const key = createHash('sha256').update(secret, 'utf8').digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

const SECRET_32 = '0123456789abcdef0123456789abcdef'; // 32 char — minimal length
const OTHER_SECRET_32 = 'fedcba9876543210fedcba9876543210';

describe('totp-secrets v2 — کلید اختصاصی + نسخه‌بندی', () => {
  it('round-trip: encrypt → decrypt مقدار اصلی را برمی‌گرداند', () => {
    vi.stubEnv('TOTP_ENCRYPTION_KEY', SECRET_32);
    const plain = 'JBSWY3DPEHPK3PXP'; // نمونه base32
    const blob = encryptTotpSecret(plain);
    expect(blob.startsWith('v2:')).toBe(true);
    expect(decryptTotpSecret(blob)).toBe(plain);
  });

  it('قالب v2 حاوی kid (fingerprint کلید) است — چرخش امن', () => {
    vi.stubEnv('TOTP_ENCRYPTION_KEY', SECRET_32);
    const blob = encryptTotpSecret('secret-value');
    expect(blob.startsWith('v2:')).toBe(true);
    const kidAndBody = blob.slice(3);
    const sep = kidAndBody.indexOf(':');
    expect(sep).toBeGreaterThan(0);
    const kid = kidAndBody.slice(0, sep);
    expect(kid).toHaveLength(16); // sha256 → 16 hex
    // سه بخش بعد از kid: iv.tag.ct
    expect(kidAndBody.slice(sep + 1).split('.')).toHaveLength(3);
  });

  it('fallback: بدون TOTP_ENCRYPTION_KEY از AUTH_SECRET استفاده می‌کند', () => {
    vi.stubEnv('AUTH_SECRET', SECRET_32);
    const blob = encryptTotpSecret('x');
    expect(decryptTotpSecret(blob)).toBe('x');
  });

  it('decrypt بلاب v1 قدیمی (با AUTH_SECRET) را پشتیبانی می‌کند', () => {
    vi.stubEnv('AUTH_SECRET', SECRET_32);
    const blob = buildV1Blob('legacy-secret', SECRET_32);
    expect(decryptTotpSecret(blob)).toBe('legacy-secret');
  });

  it('چرخش کلید: بلاب‌های قدیمی با TOTP_ENCRYPTION_KEY_LEGACY باز می‌شوند', () => {
    // مرحله ۱ — با کلید قدیمی رمزنگاری شد
    vi.stubEnv('TOTP_ENCRYPTION_KEY', SECRET_32);
    const blob = encryptTotpSecret('rotate-me');
    // مرحله ۲ — کلید چرخید؛ کلید قدیمی به legacy registry رفت
    vi.stubEnv('TOTP_ENCRYPTION_KEY', OTHER_SECRET_32);
    vi.stubEnv('TOTP_ENCRYPTION_KEY_LEGACY', SECRET_32);
    expect(decryptTotpSecret(blob)).toBe('rotate-me');
  });

  it('kid ناشناخته → خطای واضح (نه GCM failure مبهم)', () => {
    vi.stubEnv('TOTP_ENCRYPTION_KEY', SECRET_32);
    const blob = encryptTotpSecret('x');
    vi.stubEnv('TOTP_ENCRYPTION_KEY', OTHER_SECRET_32);
    expect(() => decryptTotpSecret(blob)).toThrow(/Unknown TOTP encryption key id/);
  });

  it('مقدار بدون قالب (plaintext defensive) دست‌نخورده برمی‌گردد', () => {
    expect(decryptTotpSecret('plain-text-value')).toBe('plain-text-value');
  });
});
