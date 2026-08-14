import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * رمزنگاری سکرت‌های TOTP — v2 با کلید اختصاصی و نسخه‌بندی کلید.
 *
 * 2026-08-14 (fix): v1 فقط با `sha256(AUTH_SECRET)` رمزنگاری می‌کرد. چون
 * AUTH_SECRET همزمان برای session signing (Auth.js) استفاده می‌شود، هر چرخش
 * آن (یا استفاده از سکرت متفاوت در dev/prod که DB مشترک دارند) سکرت‌های 2FA
 * را برای همیشه غیرقابل رمزگشایی می‌کرد (خطای TOTP-DEC).
 *
 * طبق NIST SP 800-57 / OWASP Key Management Cheat Sheet:
 *   - «یک کلید، یک purpose»: سکرت‌های TOTP حالا با `TOTP_ENCRYPTION_KEY`
 *     (کلید اختصاصی data-at-rest) رمزنگاری می‌شوند — چرخش AUTH_SECRET دیگر
 *     روی 2FA اثر ندارد.
 *   - Key rotation with versioning: هر بلاب `v2:<kid>:<iv>.<tag>.<ct>` دارد که
 *     `<kid>` = fingerprint خود کلید است (sha256 پایدار از مقدار کلید). وقتی
 *     کلید می‌چرخد، کلید قدیمی در `TOTP_ENCRYPTION_KEY_LEGACY` (کاما-جدا)
 *     ثبت می‌شود و بلاب‌های قبلی همچنان با همان kid رمزگشایی می‌شوند.
 *   - fallback برای dev: اگر `TOTP_ENCRYPTION_KEY` ست نشده باشد از
 *     AUTH_SECRET/NEXTAUTH_SECRET استفاده می‌شود.
 *
 * قالب‌ها:
 *   v1: `v1:<iv>.<tag>.<ct>`            (legacy — با AUTH_SECRET؛ فقط برای decrypt)
 *   v2: `v2:<kid>:<iv>.<tag>.<ct>`      (جاری — با TOTP_ENCRYPTION_KEY)
 */

const V1_PREFIX = 'v1:';
const V2_PREFIX = 'v2:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

/** fingerprint پایدار کلید — خودِ key id داخل بلاب v2. */
function keyIdOf(secret: string): string {
  return createHash('sha256')
    .update(`totp-encryption-key:${secret}`, 'utf8')
    .digest('hex')
    .slice(0, 16);
}

/** کلید جاری برای encrypt — اختصاصی TOTP، با fallback سازگار. */
function currentKeySource(): string {
  const secret =
    process.env.TOTP_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY (or AUTH_SECRET) must be configured with at least 32 characters',
    );
  }
  return secret;
}

/** registry همهٔ کلیدهای شناخته‌شده (جاری + legacy) → kid → کلید مشتق‌شده. */
function keyRegistry(): Map<string, Buffer> {
  const registry = new Map<string, Buffer>();
  const add = (secret: string): void => {
    if (secret.length >= 32) registry.set(keyIdOf(secret), deriveKey(secret));
  };
  const current =
    process.env.TOTP_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (current) add(current);
  const legacy = process.env.TOTP_ENCRYPTION_KEY_LEGACY;
  if (legacy) {
    for (const entry of legacy.split(',')) {
      add(entry.trim());
    }
  }
  return registry;
}

export function encryptTotpSecret(value: string): string {
  const source = currentKeySource();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(source), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${V2_PREFIX}${keyIdOf(source)}:${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptTotpSecret(value: string): string {
  // بلاب‌های قبل از نسخه‌بندی — فقط خواندن (پس از migration وجود ندارند)
  if (value.startsWith(V1_PREFIX)) {
    return decryptV1(value.slice(V1_PREFIX.length));
  }
  if (value.startsWith(V2_PREFIX)) {
    return decryptV2(value.slice(V2_PREFIX.length));
  }
  // defensive: مقدار بدون قالب (plaintext) — رفتار قبلی حفظ می‌شود
  return value;
}

function decryptV1(body: string): string {
  const parts = body.split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted TOTP secret');
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, 'base64url'));
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES)
    throw new Error('Invalid encrypted TOTP secret');
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET required for legacy TOTP secret');
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function decryptV2(body: string): string {
  const sep = body.indexOf(':');
  if (sep <= 0) throw new Error('Invalid encrypted TOTP secret');
  const kid = body.slice(0, sep);
  const parts = body.slice(sep + 1).split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted TOTP secret');
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, 'base64url'));
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES)
    throw new Error('Invalid encrypted TOTP secret');
  const key = keyRegistry().get(kid);
  if (!key) throw new Error(`Unknown TOTP encryption key id: ${kid}`);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
