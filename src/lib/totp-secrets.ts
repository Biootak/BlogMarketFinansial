import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'v1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be configured with at least 32 characters');
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptTotpSecret(value: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptTotpSecret(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const parts = value.slice(PREFIX.length).split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted TOTP secret');
  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, 'base64url'));
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new Error('Invalid encrypted TOTP secret');
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
