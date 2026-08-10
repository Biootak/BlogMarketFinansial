/**
 * ============================================================================
 * FONT SETUP — تنها جایی از پروژه که فونت تعریف می‌شود (single source of truth)
 * ----------------------------------------------------------------------------
 * وزیرمتن در دو subset مجزا (فارسی + لاتین) با unicode-range بارگذاری می‌شود.
 * مرورگر فقط فایلی را دانلود می‌کند که گلیف‌هایش نیاز باشد:
 *   - صفحات کاملاً فارسی → فقط ۴۴KB
 *   - صفحات با متن لاتین → ۴۴ + ۴۰ = ۸۴KB
 *
 * خروجی‌ها:
 *   - layout ریشه → `fontVariables` (کلاس CSS variable روی <html>)
 *   - globals.css  → متغیرهای --font-fa و --font-fa-latin (در @theme)
 *   - ادیتور       → `FONT_FAMILIES` (نام خانوادهٔ فونت)
 *   - استایل‌های inline → `FONT_STACKS`
 *
 * ⚡️ چطور فونت را عوض کنم؟
 *   ۱. فایل woff2 جدید را در پوشهٔ src/app/fonts/<name>/ بگذار؛
 *   ۲. `src` و `declarations.unicode-range` و `FONT_FAMILIES.fa` را عوض کن؛
 *   ۳. فایل قبلی را حذف کن. متغیرهای CSS دست‌نخورده می‌مانند و کل سایت
 *      خودکار فونت جدید را می‌گیرد.
 *
 * رفرنس: داک رسمی Next.js 2026
 *   https://nextjs.org/docs/app/api-reference/components/font#declarations
 *   https://nextjs.org/docs/app/getting-started/fonts
 * ============================================================================
 */
import localFont from 'next/font/local';

/* ----------------------------------------------------------------------------
 * Vazirmatn (وزیرمتن) — subset فارسی/عربی (Saber Rastikerdar, SIL OFL 1.1).
 * فقط گلیف‌های عربی، فارسی، علائم نگارشی و نقطهٔ دایره (برای اعراب).
 * wght 100–900، ~۴۴KB. preload: true چون متن اصلی سایت با این subset است.
 * unicode-range باعث می‌شود مرورگر این فایل را فقط برای متن عربی/fارسی
 * بارگیری کند.
 * -------------------------------------------------------------------------- */
const vazirArabic = localFont({
  src: './vazirmatn/vazirmatn-arabic.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-fa',
  preload: true,
  adjustFontFallback: 'Arial',
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+2000-206F,U+25CC',
    },
  ],
});

/* ----------------------------------------------------------------------------
 * Vazirmatn (وزیرمتن) — subset لاتین/ارقام.
 * حروف لاتین، ارقام و فلش‌های ← → برای متن انگلیسی سایت.
 * wght 100–900، ~۴۰KB. preload: false (غیرحیاتی — فقط گاهی نیاز می‌شود).
 * -------------------------------------------------------------------------- */
const vazirLatin = localFont({
  src: './vazirmatn/vazirmatn-latin.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-fa-latin',
  preload: false,
  adjustFontFallback: 'Arial',
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0020-007E,U+00A0-00FF,U+2190-21FF',
    },
  ],
});

export const fonts = { ara: vazirArabic, lat: vazirLatin };

/**
 * کلاس‌های CSS variable — روی <html> در layout ریشه اعمال می‌شود.
 * (خروجی: "var(--font-fa) var(--font-fa-latin)")
 */
export const fontVariables = `${vazirArabic.variable} ${vazirLatin.variable}`;

/**
 * نام خانوادهٔ فونت — برای جاهایی که family name لازم دارند (مثل
 * انتخاب‌گر فونت ادیتور). اگر فونت را عوض کردی این را هم همگام کن.
 */
export const FONT_FAMILIES = {
  fa: 'Vazirmatn',
} as const;

/**
 * استک‌های آمادهٔ font-family برای استایل‌های inline (مثل ادیتور).
 * ترتیب: اول subset فارسی (برای متن اصلی)، بعد subset لاتین (برای ارقام و
 * حروف انگلیسی). مرورگر طبق unicode-range تصمیم می‌گیرد کدام فایل برای هر
 * کاراکتر استفاده شود — فقط فایل موردنیاز دانلود می‌شود.
 */
export const FONT_STACKS = {
  /** متن عادی — معادل --font-sans در globals.css */
  sans: 'var(--font-fa), var(--font-fa-latin), Arial, sans-serif',
  /** تیترهای display — معادل --font-display در globals.css */
  display: 'var(--font-fa), var(--font-fa-latin), system-ui, sans-serif',
} as const;
