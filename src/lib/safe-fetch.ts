/**
 * safe-fetch — 2026-06-21
 * --------------------------------------------------------------------------
 * هر call به دیتابیس/اکسترنال می‌تواند fail شود (timeout, network, DB down).
 * `unstable_cache` در Next.js 16 خطای revalidation را به call-site پاس
 * نمی‌دهد — یعنی try/catch داخل تابع بی‌فایده است.
 *
 * این helper تضمین می‌کند که layout و page ها هرگز کرش نمی‌کنند:
 *   - اگر promise resolve شود → مقدار
 *   - اگر reject شود → fallback (پیش‌فرض undefined یا هر چیزی که بدهیم)
 *   - خطا در dev console لاگ می‌شود ولی کاربر خطا نمی‌بیند
 *
 * استفاده:
 *   const ads = await safe(getActiveAdvertisements(...), { success: true, data: [] });
 *   const rateLists = await safe(getActiveRateListsOrCryptoFallback(), []);
 * --------------------------------------------------------------------------
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * یک promise را اجرا می‌کند و در صورت خطا، مقدار fallback برمی‌گرداند.
 * خطا فقط در dev لاگ می‌شود تا production log ها تمیز بمانند.
 */
export async function safe<T>(
  promise: Promise<T>,
  fallback: T,
  context?: string,
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isDev) {
      const label = context ? ` [${context}]` : '';
      const msg = error instanceof Error ? error.message : String(error);
      // فقط در dev لاگ کن — در prod خطا باید توسط monitoring دیده شود
      // نه این‌جا (تا log ها پر از noise نشود)
      console.warn(`[safe-fetch]${label} خطا: ${msg.slice(0, 200)}`);
    }
    return fallback;
  }
}

/**
 * نسخه‌ی آرایه‌ای: اگر خطا دهد، آرایه‌ی خالی برمی‌گرداند.
 * کوتاه‌نویس برای استفاده‌ی رایج در layout ها.
 */
export async function safeArray<T>(
  promise: Promise<T[]>,
  context?: string,
): Promise<T[]> {
  return safe(promise, [] as T[], context);
}

export default safe;
