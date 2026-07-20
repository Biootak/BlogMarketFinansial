/**
 * Phone validation + E.164 normalization using libphonenumber-js.
 *
 * Strategy: accept any format the user types (local or international),
 * normalize it to E.164 (+XXXXXXXXXXX) for storage, and surface a
 * single human-readable error message in Persian.
 *
 * Default country: Afghanistan (AF) — aligns with product audience.
 * Users may override with an explicit +CountryCode prefix.
 */

import { type CountryCode, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

export const DEFAULT_COUNTRY: CountryCode = 'AF';

/**
 * Validate a phone string (with optional default country hint).
 * Returns { valid: true, e164 } on success, { valid: false, message } on failure.
 */
export function validatePhone(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): { valid: true; e164: string } | { valid: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, message: 'شماره تماس الزامی است' };
  }

  try {
    // If it starts with + we parse internationally, otherwise with default country
    const parsed = parsePhoneNumber(trimmed, defaultCountry);

    if (!parsed || !parsed.isValid()) {
      return { valid: false, message: 'شماره تماس معتبر نیست' };
    }

    return { valid: true, e164: parsed.format('E.164') };
  } catch {
    return { valid: false, message: 'فرمت شماره تماس نادرست است' };
  }
}

/**
 * Zod-compatible refine validator. Returns true if valid, false otherwise.
 * Use alongside a `.transform` to normalize to E.164.
 */
export function isPhoneValid(raw: string, defaultCountry: CountryCode = DEFAULT_COUNTRY): boolean {
  if (!raw?.trim()) return false;
  try {
    return isValidPhoneNumber(raw.trim(), defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Normalize a valid phone number to E.164.
 * Caller MUST ensure `isPhoneValid` returned true before calling this.
 */
export function normalizeToE164(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string {
  try {
    const parsed = parsePhoneNumber(raw.trim(), defaultCountry);
    return parsed?.format('E.164') ?? raw.trim();
  } catch {
    return raw.trim();
  }
}

/**
 * Format an E.164 number for display (international format).
 * e.g. +93701234567 → +93 70 123 4567
 */
export function formatPhoneForDisplay(e164: string): string {
  try {
    const parsed = parsePhoneNumber(e164);
    return parsed?.formatInternational() ?? e164;
  } catch {
    return e164;
  }
}
