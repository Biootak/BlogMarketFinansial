/**
 * phone-validation.ts — Single phone validation mechanism.
 *
 * Two guarantees, both enforced here so every consumer gets them for free:
 *
 *  1. **همه کشورها پذیرفته می‌شوند** — `parsePhoneNumber` از `libphonenumber-js`
 *     استفاده می‌شود. هر شمارهٔ معتبر با پیشوند کشور (`+44…`, `+1…`, `+93…`) قبول
 *     است؛ شمارهٔ بدون پیشوند با کشور پیش‌فرض AF (افغانستان) تفسیر می‌شود.
 *
 *  2. **شمارهٔ مجازی / غیرشخصی مسدود است** — `getNumberType` نوع خط را برمی‌گرداند
 *     (VOIP، TOLL_FREE، PREMIUM_RATE، PAGER، VOICEMAIL، UAN). این نوع‌ها بلوک
 *     می‌شوند. برای کشورهایی که مِتادیتای نوع در باندل پیش‌فرض نیست، مقدار UNDEF
 *     برمی‌گردد → **fail-open** (پذیرفته می‌شود) تا کاربر واقعی بلاک نشود.
 *
 *  ⚠️ لایهٔ نهایی ضد شمارهٔ مجازی، تأیید OTP از طریق **تلگرام** است
 *     (`src/actions/phone-verify.ts`): تلگرام برای ثبت‌نام/تأیید شمارهٔ VoIP را
 *     قبول نمی‌کند، پس حتی اگر این چک fail-open باشد، بدون تلگرام واقعی تأیید
 *     کامل نمی‌شود. این فایل فقط defense-in-depth در لایهٔ اعتبارسنجی است.
 */

import {
  type CountryCode,
  getNumberType,
  isValidPhoneNumber,
  parsePhoneNumber,
} from 'libphonenumber-js';

export const DEFAULT_COUNTRY: CountryCode = 'AF';

/**
 * نوع‌های خطی که «شمارهٔ شخصی واقعی» نیستند — عمدتاً VoIP/مجازی یا خطوط
 * غیرشخصی. وقتی libphonenumber یکی از این نوع‌ها را با قطعیت تشخیص دهد،
 * شماره رد می‌شود. (TOLL_FREE/PREMIUM_RATE اعداد ۸۰۰/۹۰۰ هستند و نمی‌توانند
 * شمارهٔ شخصی معتبر باشند؛ VOIP قلب سرویس‌های شمارهٔ مجازی است.)
 */
const VIRTUAL_OR_NON_PERSONAL_TYPES = new Set<string>([
  'VOIP',
  'TOLL_FREE',
  'PREMIUM_RATE',
  'PAGER',
  'VOICEMAIL',
  'UAN',
]);

/** معتبر و قابل استفاده است؟ (همهٔ کشورها + ضد مجازی) */
export function validatePhone(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): { valid: true; e164: string } | { valid: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, message: 'شماره تماس الزامی است' };
  }

  try {
    const parsed = parsePhoneNumber(trimmed, defaultCountry);

    if (!parsed || !parsed.isValid()) {
      return { valid: false, message: 'شماره تماس معتبر نیست' };
    }

    if (isVirtualNumber(trimmed, defaultCountry)) {
      return {
        valid: false,
        message: 'شماره مجازی (VoIP) قابل استفاده نیست؛ لطفاً شماره واقعی وارد کنید',
      };
    }

    return { valid: true, e164: parsed.format('E.164') };
  } catch {
    return { valid: false, message: 'فرمت شماره تماس نادرست است' };
  }
}

/**
 * آیا شماره از نوع مجازی/غیرشخصی است؟
 * fail-open: اگر نوع قابل تشخیص نباشد (UNDEF یا خطا) → false (مجاز).
 * فقط وقتی بلوک می‌شود که libphonenumber با قطعیت نوع مجازی را تشخیص دهد.
 */
export function isVirtualNumber(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): boolean {
  if (!raw?.trim()) return false;
  try {
    const type = getNumberType(raw.trim(), defaultCountry);
    return typeof type === 'string' && VIRTUAL_OR_NON_PERSONAL_TYPES.has(type);
  } catch {
    return false;
  }
}

/**
 * Zod-compatible refine validator: معتبر و غیرمجازی؟ (همهٔ کشورها)
 * Use alongside a `.transform` to normalize to E.164.
 */
export function isPhoneValid(raw: string, defaultCountry: CountryCode = DEFAULT_COUNTRY): boolean {
  if (!raw?.trim()) return false;
  try {
    if (!isValidPhoneNumber(raw.trim(), defaultCountry)) return false;
    return !isVirtualNumber(raw.trim(), defaultCountry);
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
