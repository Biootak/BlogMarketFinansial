import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
/**
 * scripts/reencrypt-totp-secrets.ts
 *
 * تعمیر سکرت‌های TOTP که با AUTH_SECRET قدیمی (مثلاً سکرت محلی dev) رمزنگاری
 * شده‌اند و با کلید جاری production رمزگشایی نمی‌شوند (خطای ورود 2FA).
 *
 * چرا رخ می‌دهد: dev و prod روی یک دیتابیس مشترک (RDS) کار می‌کنند؛ اگر 2FA
 * از طریق سرور محلی فعال شده باشد، بلاب با سکرت محلی (.env / .env.local)
 * رمزنگاری می‌شود و production (با کلید خودش) نمی‌تواند آن را باز کند.
 *
 * خروجی این اسکریپت قالب **v2** است (مطابق `src/lib/totp-secrets.ts`):
 *   v2:<kid>:<iv>.<tag>.<ct>  — با `TOTP_ENCRYPTION_KEY` و kid = fingerprint کلید.
 * بعد از migration، چرخش AUTH_SECRET دیگر روی 2FA اثر ندارد؛ فقط کلید اختصاصی
 * TOTP (که در dev و prod یکسان تنظیم می‌شود) مهم است.
 *
 * سکرت TOTP کاربر (مقدار base32) حفظ می‌شود — فقط قالب رمزنگاری عوض می‌شود؛
 * اپ Authenticator کاربر بدون re-enroll همچنان کار می‌کند.
 *
 * استفاده:
 *   TARGET_TOTP_KEY=<TOTP_ENCRYPTION_KEY جدید> \
 *   CAND_OLD_1=<سکرت قدیمی ۱> CAND_OLD_2=<سکرت قدیمی ۲> ... \
 *   npx tsx scripts/reencrypt-totp-secrets.ts
 *
 * روی dyno که به DB دسترسی دارد اجرا شود (`heroku run` برای RDS خصوصی).
 * idempotent است — بلاب‌هایی که با کلید جاری باز می‌شوند untouched می‌مانند.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const IV_BYTES = 12;
const TAG_BYTES = 16;

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

function keyIdOf(secret: string): string {
  return createHash('sha256')
    .update(`totp-encryption-key:${secret}`, 'utf8')
    .digest('hex')
    .slice(0, 16);
}

function decryptV1(value: string, secret: string): string | null {
  if (!value.startsWith('v1:')) return null;
  try {
    const parts = value.slice(3).split('.');
    if (parts.length !== 3) return null;
    const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, 'base64url'));
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

function decryptV2(value: string, secrets: string[]): string | null {
  if (!value.startsWith('v2:')) return null;
  const body = value.slice(3);
  const sep = body.indexOf(':');
  if (sep <= 0) return null;
  const kid = body.slice(0, sep);
  const parts = body.slice(sep + 1).split('.');
  if (parts.length !== 3) return null;
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, 'base64url'));
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
  for (const secret of secrets) {
    if (keyIdOf(secret) !== kid) continue;
    try {
      const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      return null;
    }
  }
  return null;
}

/** decrypt با هر قالبی (v1 با AUTH_SECRET، v2 با کلید اختصاصی). */
function decryptAny(value: string, secrets: string[]): string | null {
  if (value.startsWith('v2:')) return decryptV2(value, secrets);
  if (value.startsWith('v1:')) {
    for (const secret of secrets) {
      const plain = decryptV1(value, secret);
      if (plain) return plain;
    }
    return null;
  }
  return value; // plaintext defensive — رفتار قبلی
}

function encryptV2(value: string, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2:${keyIdOf(secret)}:${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

async function main() {
  const targetKey = process.env.TARGET_TOTP_KEY ?? '';
  const candidates: string[] = [];
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith('CAND_') && typeof value === 'string' && value.length > 0) {
      candidates.push(value);
    }
  }
  if (targetKey.length < 32) throw new Error('TARGET_TOTP_KEY missing (must be >= 32 chars)');
  if (candidates.length === 0) throw new Error('at least one CAND_* secret required');

  const users = await prisma.user.findMany({
    where: { twoFactorEnabled: true },
    select: { id: true, email: true, twoFactorSecretEnc: true },
  });

  let updated = 0;
  let alreadyOk = 0;
  let unknown = 0;

  for (const u of users) {
    const enc = u.twoFactorSecretEnc;
    if (!enc) {
      console.log('SKIP_NO_SECRET'.padEnd(16), u.email);
      continue;
    }
    if (decryptAny(enc, [targetKey])) {
      console.log('SKIP_ALREADY_OK'.padEnd(16), u.email);
      alreadyOk++;
      continue;
    }
    const plain = decryptAny(enc, candidates);
    if (plain) {
      await prisma.user.update({
        where: { id: u.id },
        data: { twoFactorSecretEnc: encryptV2(plain, targetKey) },
      });
      console.log('REENCRYPTED'.padEnd(16), u.email);
      updated++;
    } else {
      console.log('UNKNOWN_KEY'.padEnd(16), u.email);
      unknown++;
    }
  }

  console.log('---');
  console.log('re-encrypted:', updated, '| already ok:', alreadyOk, '| unknown key:', unknown);
}

main()
  .catch((e) => {
    console.log('SCRIPT_ERROR:', (e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
