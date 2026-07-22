/**
 * lib/totp.ts — RFC 6238 TOTP implementation
 *
 * پیاده‌سازی از صفر با Web Crypto API — بدون dependency خارجی.
 * سازگار با Google Authenticator / Authy / Microsoft Authenticator.
 *
 * الگوریتم: HMAC-SHA1 + counter-based (HOTP) بر اساس زمان
 *   - period: 30 ثانیه
 *   - digits: 6
 *   - algorithm: SHA-1 (استاندارد TOTP RFC 6238)
 */

const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;

// ─── Secret Generation ────────────────────────────────────────────────────

/**
 * تولید یک secret رندوم Base32 (160-bit = 32 کاراکتر Base32).
 * مستقیماً با Web Crypto API — بدون node:crypto.
 */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20); // 160 bits
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

// ─── TOTP Verification ────────────────────────────────────────────────────

/**
 * تأیید کد TOTP با پنجره ±1 (تحمل drift 30 ثانیه‌ای).
 */
export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  const cleanToken = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD);

  // بررسی پنجره ±1 برای تحمل clock drift
  for (const offset of [-1, 0, 1]) {
    const expected = await generateHotp(secret, counter + offset);
    if (expected === cleanToken) return true;
  }
  return false;
}

/**
 * تولید کد TOTP جاری (برای تست در dev).
 */
export async function getCurrentTotp(secret: string): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  return generateHotp(secret, counter);
}

// ─── OTPAuth URI ──────────────────────────────────────────────────────────

/**
 * تولید otpauth:// URI برای QR code.
 * قابل scan با Google Authenticator / Authy.
 */
export function generateOtpAuthUri(
  secret: string,
  accountName: string,
  issuer = 'FinancialMarket',
): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ─── HOTP Core ────────────────────────────────────────────────────────────

async function generateHotp(secret: string, counter: number): Promise<string> {
  const keyBytes = base32Decode(secret);
  const counterBytes = counterToBytes(counter);

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, counterBytes as ArrayBuffer);
  const hmacBytes = new Uint8Array(signature);

  // Dynamic truncation (RFC 4226 §5.4)
  const offset = (hmacBytes[19] ?? 0) & 0x0f;
  const binary =
    (((hmacBytes[offset] ?? 0) & 0x7f) << 24) |
    (((hmacBytes[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmacBytes[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmacBytes[offset + 3] ?? 0) & 0xff);

  const otp = binary % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

function counterToBytes(counter: number): ArrayBuffer {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  // counter به صورت big-endian 8 بایتی
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  view.setUint32(0, high, false);
  view.setUint32(4, low, false);
  return buffer;
}

// ─── Base32 ────────────────────────────────────────────────────────────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(encoded: string): Uint8Array {
  const clean = encoded.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}
