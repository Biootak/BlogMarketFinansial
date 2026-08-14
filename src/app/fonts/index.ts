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
 *   - globals.css  → متغیرهای --font-fa و --font-latin (در @theme)
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
  /**
   * ⚠️ عمداً false — نه 'Arial'.
   * با adjustFontFallback، next/font یک face «Fallback» بدون unicode-range
   * (همهٔ کاراکترها) تولید می‌کند. چون در استک بعد از vazirArabic می‌آید،
   * حروف لاتین را قبل از رسیدن به Inter می‌گیرد و فونت لاتین هرگز دانلود
   * نمی‌شود (متن انگلیسی با Arial ساده رندر می‌شد). با false این face حذف
   * می‌شود و لاتین به --font-latin (Inter) می‌رسد.
   */
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+2000-206F,U+25CC',
    },
  ],
});

/* ----------------------------------------------------------------------------
 * Inter (اینتر) — subset لاتین/ارقام (Rasmus Andersson, SIL OFL 1.1).
 * حروف لاتین، ارقام و فلش‌های ← → برای متن انگلیسی سایت.
 *
 * چرا Inter؟
 *   - پرفروش‌ترین/پراستفاده‌ترین فونت UI ۲۰۲۶ (بیشترین خوانایی در سایز کوچک؛
 *     رفرنس: landingpageflow.com 2026، madegooddesigns.com 2026)
 *   - ارقام جدولی (tabular figures) برای نرخ‌ها و جدول‌های مالی
 *   - جایگزین subset لاتین وزیرمتن (که از Roboto می‌آمد و نازک/بی‌هویت دیده می‌شد)
 * wght 100–900، ~۴۸KB. preload: false (غیرحیاتی — فقط گاهی نیاز می‌شود).
 * -------------------------------------------------------------------------- */
const interLatin = localFont({
  src: './inter/InterVariable-latin.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-latin',
  preload: false,
  adjustFontFallback: 'Arial',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});

export const fonts = { ara: vazirArabic, lat: interLatin };

/**
 * کلاس‌های CSS variable — روی <html> در layout ریشه اعمال می‌شود.
 * (خروجی: "var(--font-fa) var(--font-latin)")
 */
export const fontVariables = `${vazirArabic.variable} ${interLatin.variable}`;

/**
 * نام خانوادهٔ فونت — برای جاهایی که family name لازم دارند (مثل
 * انتخاب‌گر فونت ادیتور). اگر فونت را عوض کردی این را هم همگام کن.
 */
export const FONT_FAMILIES = {
  fa: 'Vazirmatn',
} as const;

/**
 * استک‌های آمادهٔ font-family برای استایل‌های inline (مثل ادیتور).
 * ترتیب: اول subset فارسی (برای متن اصلی)، بعد Inter (برای ارقام و حروف
 * انگلیسی). مرورگر طبق unicode-range تصمیم می‌گیرد کدام فایل برای هر کاراکتر
 * استفاده شود — فقط فایل موردنیاز دانلود می‌شود.
 */
export const FONT_STACKS = {
  /** متن عادی — معادل --font-sans در globals.css */
  sans: 'var(--font-fa), var(--font-latin), Arial, sans-serif',
  /** تیترهای display — معادل --font-display در globals.css */
  display: 'var(--font-fa), var(--font-latin), system-ui, sans-serif',
} as const;
