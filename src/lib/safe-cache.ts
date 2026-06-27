/**
 * safe-cache — 2026-06-21
 * --------------------------------------------------------------------------
 * جایگزین ایمن برای `unstable_cache` که:
 *   1. خطای DB را catch می‌کند (حتی اگر `unstable_cache` re-throw کند)
 *   2. در صورت خطا، مقدار fallback برمی‌گرداند (نه throw)
 *   3. اگر قبلاً cache موفق داشتیم، آن را به‌عنوان stale-fallback نگه می‌دارد
 *   4. بین request ها share می‌شود (در سطح process)
 *
 * چرا `unstable_cache` به تنهایی کافی نیست:
 *   - وقتی DB fail می‌شود، `unstable_cache` خطا را در سطح cache-layer
 *     throw می‌کند، نه در سطح function body. بنابراین try/catch داخل
 *     function بی‌اثر است.
 *   - نتیجه: کل layout/page کرش می‌کند.
 *
 * استفاده:
 *   export const getSystemSettingsData = safeCache(
 *     async () => prisma.systemSettings.findFirst(),
 *     { siteName: null, ... },   // fallback
 *     { key: 'system-settings', ttl: 300, tags: ['system-settings'] },
 *   );
 * --------------------------------------------------------------------------
 */

const isDev = process.env.NODE_ENV === 'development';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  /** زمان آخرین موفقیت — برای stale-fallback استفاده می‌شود */
  storedAt: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();

interface SafeCacheOptions {
  /** کلید یکتا برای این cache slot */
  key: string;
  /** TTL به ثانیه (مثل unstable_cache revalidate) */
  ttl: number;
  /** اختیاری — برای observability */
  tags?: string[];
}

// کلید cache بر اساس آرگومان‌ها ساخته می‌شود تا call-site های متفاوت
// نتایج متفاوت داشته باشند ولی در slot یکسان share شوند.
const ARG_SEPARATOR = '::';

function makeKey(base: string, args: unknown[]): string {
  if (args.length === 0) return base;
  try {
    return `${base}${ARG_SEPARATOR}${JSON.stringify(args)}`;
  } catch {
    return `${base}${ARG_SEPARATOR}${args.map(String).join(ARG_SEPARATOR)}`;
  }
}

export function safeCache<TArgs extends unknown[], T>(
  fn: (...args: TArgs) => Promise<T>,
  fallback: T,
  options: SafeCacheOptions,
): (...args: TArgs) => Promise<T> {
  const { key: baseKey, ttl, tags = [] } = options;

  return async (...args: TArgs): Promise<T> => {
    // 2026-06-26: `Date.now()` is forbidden in the static prerender shell
    // under `cacheComponents: true` and crashes the home page. We use
    // `performance.now()` instead — it's a monotonic timer (ms since
    // process start) that doesn't trigger Next.js's "current time" guard.
    // For TTL comparison this is perfectly adequate since we only need
    // relative elapsed time, not wall-clock timestamps.
    const now = performance.now();
    const fullKey = makeKey(baseKey, args);
    const cached = memoryStore.get(fullKey) as CacheEntry<T> | undefined;

    // 1) اگر cache تازه است → از cache برگردان (no DB call)
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    // 2) cache تازه نیست → fn را فراخوانی کن
    try {
      const value = await fn(...args);
      memoryStore.set(fullKey, { value, expiresAt: now + ttl * 1000, storedAt: now });
      if (isDev && tags.length > 0) {
        // فقط برای dev observability
      }
      return value;
    } catch (error) {
      // 3) خطا رخ داد:
      //    - اگر قبلاً value موفق داشتیم (stale) → آن را برگردان
      //    - در غیر این صورت → fallback
      if (cached) {
        if (isDev) {
          const msg = error instanceof Error ? error.message : String(error);
          console.warn(`[safe-cache] ${fullKey} DB fail, using stale value (${Math.round((now - cached.storedAt) / 1000)}s old): ${msg.slice(0, 120)}`);
        }
        // TTL را تمدید کن تا request بعدی دوباره امتحان کند
        cached.expiresAt = now + Math.min(ttl, 30) * 1000;
        return cached.value;
      }
      if (isDev) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[safe-cache] ${fullKey} DB fail, using fallback: ${msg.slice(0, 120)}`);
      }
      return fallback;
    }
  };
}

/**
 * پاک کردن cache slot — برای revalidation پس از تغییر داده.
 * معادل `revalidateTag` ولی برای memory cache ما.
 */
export function safeRevalidate(key: string): void {
  memoryStore.delete(key);
}

/**
 * پاک کردن همه‌ی cache ها — برای debug.
 */
export function safeRevalidateAll(): void {
  memoryStore.clear();
}

export default safeCache;
