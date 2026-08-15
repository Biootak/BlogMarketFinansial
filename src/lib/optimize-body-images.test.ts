/**
 * optimize-body-images.test.ts — تصاویر بدنهٔ مقالات بعد از حذف /_next/image.
 *
 * رگرسیون واقعی 2026-08-15: با loaderFile سفارشی، route /_next/image دیگر
 * سرو نمی‌شود — اگر این تابع هنوز srcset به /_next/image می‌داد، تصاویر
 * مقالات 404 می‌گرفتند. این تست‌ها URL خروجی را به CDN مستقیم (unsplash/pexels)
 * و passthrough برای بقیه قفل می‌کنند.
 */
import { describe, expect, it } from 'vitest';
import { optimizeBodyImages } from './optimize-body-images';

describe('optimizeBodyImages', () => {
  it('unsplash → srcset مستقیم CDN با پارامترهای loader (بدون /_next/image)', () => {
    const html =
      '<img src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixid=abc" width="1920">';
    const out = optimizeBodyImages(html);

    expect(out).not.toContain('/_next/image');
    expect(out).toContain('srcset=');
    // loader: پارامترهای موجود حفظ می‌شود (ixid) + w/q/auto/fit اضافه می‌شود
    expect(out).toContain(
      'images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixid=abc&w=480&q=75&auto=format&fit=crop 480w',
    );
    expect(out).toContain(' 1200w');
    expect(out).toContain(' 1920w');
    expect(out).toContain('loading="lazy"');
  });

  it('pexels → srcset مستقیم با auto=compress', () => {
    const html =
      '<img src="https://images.pexels.com/photos/123/pexels-photo-123.jpeg" width="800">';
    const out = optimizeBodyImages(html);

    expect(out).not.toContain('/_next/image');
    expect(out).toContain(
      'images.pexels.com/photos/123/pexels-photo-123.jpeg?w=480&q=75&auto=compress&cs=tinysrgb 480w',
    );
    expect(out).toContain(' 768w');
    // 800 intrinsic → 1200 و 1920 نباید باشند
    expect(out).not.toContain(' 1200w');
  });

  it('مسیرهای لوکال (/uploads) → بدون تغییر (بدون srcset)', () => {
    const html = '<img src="/uploads/posts/my-image.webp" width="1200">';
    expect(optimizeBodyImages(html)).toBe(html);
  });

  it('data: URI → بدون تغییر', () => {
    const html = '<img src="data:image/png;base64,AAAA">';
    expect(optimizeBodyImages(html)).toBe(html);
  });

  it('gif → بدون تغییر (animator قابل تبدیل نیست)', () => {
    const html = '<img src="https://images.unsplash.com/photo-1.gif" width="500">';
    expect(optimizeBodyImages(html)).toBe(html);
  });

  it('img با srcset موجود → بدون تغییر (دوباره wrap نمی‌شود)', () => {
    const html = '<img src="https://images.unsplash.com/photo-1" srcset="x 1x" width="500">';
    expect(optimizeBodyImages(html)).toBe(html);
  });

  it('بدون <img> → خروجی همان ورودی', () => {
    const html = '<p>متن ساده</p>';
    expect(optimizeBodyImages(html)).toBe(html);
  });
});
