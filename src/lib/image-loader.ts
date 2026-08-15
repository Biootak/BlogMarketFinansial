/**
 * image-loader — سرویس بهینه‌سازی تصویر خارج از سرور (CDN-side).
 * ----------------------------------------------------------------------------
 * چرا؟ (2026-08-15 — اندازه‌گیری Lighthouse production روی Heroku Eco)
 * بهینه‌ساز داخلی next/image (`/_next/image` + sharp) هر تصویر را در لحظه‌ی
 * درخواست روی dyno ضعیف (512MB/CPU کم) پردازش می‌کرد → LCP 5.6–7.7s در
 * اولین بازدید (کش ۲۴h بعد از deploy خالی است و imgOptConcurrency:1 هر
 * encode را serial می‌کند). هاست‌های CDN تصاویر (Unsplash = imgix، Pexels =
 * CDN اختصاصی) همان تبدیل را روی edge خودشان انجام می‌دهند → صفر CPU روی
 * سرور + cache در لبه‌ی CDN.
 *
 * این loaderFile جایگزین بهینه‌ساز داخلی می‌شود (داک رسمی Next.js:
 * https://nextjs.org/docs/app/api-reference/components/image#loaderfile) —
 * همه‌ی فواید next/image حفظ می‌شوند: srcset ریسپانسیو (w از deviceSizes)،
 * lazy loading، priority، fill و CLS-safe.
 *
 * هاست‌های قابل‌تبدیل → پارامترهای CDN خودشان (w/q/auto).
 * بقیه (uploads، r2.dev، آواتارهای OAuth، placehold) → passthrough بدون
 * تغییر — uploadها موقع آپلود با sharp به WebP بهینه شده‌اند
 * (src/app/api/upload/route.ts) پس سرور کار اضافه‌ای ندارد.
 */
import type { ImageLoaderProps } from 'next/image';

const DEFAULT_QUALITY = 75;

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src.startsWith('http://') && !src.startsWith('https://')) {
    return src;
  }

  try {
    const url = new URL(src);
    const { hostname } = url;

    // Unsplash = imgix — تبدیل روی edge خودشان (پارامترهای رسمی imgix)
    if (hostname === 'images.unsplash.com') {
      url.searchParams.set('w', String(width));
      url.searchParams.set('q', String(quality ?? DEFAULT_QUALITY));
      // auto=format → با هدر Accept مرورگر، imgix webp/avif می‌فرستد
      url.searchParams.set('auto', 'format');
      // fm قدیمی را بردار تا auto=format تصمیم بگیرد (fm=jpg مانع avif می‌شود)
      url.searchParams.delete('fm');
      if (!url.searchParams.has('fit')) url.searchParams.set('fit', 'crop');
      return url.toString();
    }

    // Pexels — CDN اختصاصی با پشتیبانی w/q/compress
    if (hostname === 'images.pexels.com') {
      url.searchParams.set('w', String(width));
      url.searchParams.set('q', String(quality ?? DEFAULT_QUALITY));
      url.searchParams.set('auto', 'compress');
      url.searchParams.set('cs', 'tinysrgb');
      return url.toString();
    }
  } catch {
    // URL نامعتبر — بدون تبدیل برگردان
    return src;
  }

  // هاست‌هایی که تبدیل edge ندارند → اورجینال (از قبل بهینه شده‌اند)
  return src;
}
