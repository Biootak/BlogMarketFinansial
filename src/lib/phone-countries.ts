/**
 * phone-countries.ts — کد کشورهای تلفن (مشترک بین کلاینت و سرور)
 * ----------------------------------------------------------------------------
 * افغانستان (مقصد اصلی) همیشه اول است. هر فرم شمارهٔ موبایل می‌تواند
 * این لیست را با یک سلیکت کد کشور نمایش دهد.
 */

export interface PhoneCountryOption {
  code: string;
  /** کد کشور به همراه + (مثل +93) */
  dial: string;
  /** نام فارسی کشور */
  label: string;
  /** پرچم برای نمایش */
  flag: string;
}

export const PHONE_COUNTRIES: PhoneCountryOption[] = [
  { code: 'AF', dial: '+93', label: 'افغانستان', flag: '🇦🇫' },
  { code: 'IR', dial: '+98', label: 'ایران', flag: '🇮🇷' },
  { code: 'PK', dial: '+92', label: 'پاکستان', flag: '🇵🇰' },
  { code: 'AE', dial: '+971', label: 'امارات', flag: '🇦🇪' },
  { code: 'SA', dial: '+966', label: 'عربستان', flag: '🇸🇦' },
  { code: 'US', dial: '+1', label: 'آمریکا', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', label: 'انگلیس', flag: '🇬🇧' },
  { code: 'DE', dial: '+49', label: 'آلمان', flag: '🇩🇪' },
  { code: 'TR', dial: '+90', label: 'ترکیه', flag: '🇹🇷' },
  { code: 'IN', dial: '+91', label: 'هند', flag: '🇮🇳' },
  { code: 'TJ', dial: '+992', label: 'تاجیکستان', flag: '🇹🇯' },
  { code: 'UZ', dial: '+998', label: 'ازبکستان', flag: '🇺🇿' },
  { code: 'RU', dial: '+7', label: 'روسیه', flag: '🇷🇺' },
  { code: 'CN', dial: '+86', label: 'چین', flag: '🇨🇳' },
];

/** کد کشور پیش‌فرض — افغانستان */
export const DEFAULT_DIAL_CODE = '+93';

/**
 * تشخیص خودکار کد کشور از شمارهٔ تایپ‌شده.
 * - شروع با 0 → شمارهٔ محلی است → null (کد انتخابی استفاده می‌شود)
 * - شروع با + → رقم‌ها بعد از + بررسی می‌شوند
 * - در غیر این صورت طولانی‌ترین پیشوند کد کشور (مثل 98 در 989916520952) پیدا می‌شود
 */
export function detectDialCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('0')) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  // اول کدهای سه‌رقمی تا با دورقمی‌ها اشتباه نشود (مثل 971 امارات vs 97)
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    const dialDigits = c.dial.replace('+', '');
    if (digits.startsWith(dialDigits) && digits.length > dialDigits.length) {
      return c.dial;
    }
  }
  return null;
}

/** تبدیل شمارهٔ محلی به E.164 با کد کشور انتخابی (مقاوم در برابر ورودی‌های ناقص) */
export function combineDialAndNumber(dialCode: string, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // کاربر خودش + زده → همان را می‌فرستیم
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  const dialDigits = dialCode.replace('+', '');
  // کاربر کد کشور را خودش تایپ کرده (مثل 989916520952) → فقط + اضافه کن
  if (digits.startsWith(dialDigits) && digits.length > dialDigits.length) {
    return `+${digits}`;
  }
  // صفر ابتدایی محلی را حذف کن: ۰۷۰۱۲۳۴۵۶۷ → +93701234567
  return `+${dialDigits}${digits.replace(/^0+/, '')}`;
}

/**
 * پیشوندهای محلی شناخته‌شده برای تشخیص کد کشور از شمارهٔ بدون `+`
 * (فرمت ذخیره‌شده در پروفایل — مثلاً seed دمو مشتری). AF همیشه fallback است.
 */
const LOCAL_PREFIX_TO_COUNTRY: Array<{ prefix: string; code: string }> = [
  // ایران: 0913… (شمارهٔ موبایل با صفر ابتدایی)
  { prefix: '09', code: 'IR' },
  // افغانستان: 070… / 078… (موبایل با 07)
  { prefix: '07', code: 'AF' },
  // پاکستان: 030…
  { prefix: '03', code: 'PK' },
  // امارات: 050…
  { prefix: '05', code: 'AE' },
];

/**
 * تشخیص کد کشور از شمارهٔ ذخیره‌شده/واردشده (بدون وابستگی جدید — AF-first).
 * - با `+` → پیشوند کد کشور از PHONE_COUNTRIES (طولانی‌ترین match، مثل 971 قبل از 97)
 * - با `0` (شمارهٔ محلی) → پیشوندهای محلی شناخته‌شدهٔ بالا؛ هر چیز دیگر → AF
 *
 * کاربرد: فرم‌هایی که شمارهٔ پروفایل را پیش‌پر می‌کنند (مثل KYC Level 1) — اگر
 * شمارهٔ مشتری ایرانی باشد (0913…) ولی کد پیش‌فرض AF بماند، ترکیب +93+09…
 * نامعتبر می‌شود و «تأیید» هرگز انجام نمی‌شود.
 */
export function detectCountryCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'AF';

  if (trimmed.startsWith('+')) {
    const dial = detectDialCode(trimmed);
    return dial ? (PHONE_COUNTRIES.find((o) => o.dial === dial)?.code ?? 'AF') : 'AF';
  }

  const digits = trimmed.replace(/\D/g, '');
  for (const { prefix, code } of LOCAL_PREFIX_TO_COUNTRY) {
    if (digits.startsWith(prefix)) return code;
  }
  return 'AF';
}
