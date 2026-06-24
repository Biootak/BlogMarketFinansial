/**
 * Display formatters for the setup wizard — Persian phone spacing, partial
 * masking for the review step, and Persian-digit conversion for the audit
 * log style used by the dashboard's editorial typography.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

/**
 * Auto-format a Persian mobile number as the user types:
 *   09123456789 → 0912 345 6789
 *   +989123456789 → +98 912 345 6789
 * Non-digit characters are stripped; the result is trimmed.
 */
export function formatPersianPhone(raw: string): string {
  const trimmed = raw.replace(/[^\d+]/g, '');
  if (trimmed.startsWith('+98')) {
    const digits = trimmed.slice(3).slice(0, 10);
    if (digits.length <= 3) return `+98 ${digits}`;
    if (digits.length <= 6) return `+98 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `+98 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (trimmed.startsWith('98') && trimmed.length > 2) {
    const digits = trimmed.slice(2).slice(0, 10);
    if (digits.length <= 3) return `0${digits}`;
    if (digits.length <= 6) return `0${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  const local = trimmed.replace(/^0/, '').slice(0, 10);
  if (local.length <= 4) return `0${local}`;
  if (local.length <= 7) return `0${local.slice(0, 4)} ${local.slice(4)}`;
  return `0${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/**
 * Convert Persian/Arabic digits to ASCII for storage + comparison.
 * The action expects ASCII so we normalize before submission.
 */
export function toAsciiDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d as (typeof PERSIAN_DIGITS)[number])))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const ascii = toAsciiDigits(phone);
  if (ascii.length < 4) return ascii;
  return `${ascii.slice(0, 4)} •••• ${ascii.slice(-3)}`;
}
