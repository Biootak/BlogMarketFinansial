/**
 * tiered-cache — لایهٔ کش دو-سطحی (L1 in-memory + L2 Redis)
 * ----------------------------------------------------------------------------
 * معماری:
 *   ┌─────────┐   hit   ┌──────────────────┐
 *   │  درخواست │ ─────→ │  L1: safeCache   │ ← in-memory, ~μs
 *   └─────────┘         │  (per-instance)   │
 *                        └────────┬─────────┘
 *                                 │ miss
 *                                 ↓
 *                        ┌──────────────────┐
 *                        │  L2: Redis       │ ← distributed, ~1-5ms
 *                        │  (Upstash)        │
 *                        └────────┬─────────┘
 *                                 │ miss
 *                                 ↓
 *                        ┌──────────────────┐
 *                        │  DB / API fetch  │ ← ~10-500ms
 *                        └──────────────────┘
 *
 * ویژگی‌ها:
 *   - L1: از safeCache استفاده می‌کند (SWR, error handling, tag purging)
 *   - L2: از redis-cache استفاده می‌کند (shared, persistent)
 *   - SWR در هر دو سطح: اگر L1 منقضی شود اما داده موجود باشد،
 *     همان لحظه stale برمی‌گردد و refresh در پس‌زمینه اجرا می‌شود
 *   - Populate: وقتی L2 می‌خورد، L1 هم پر می‌شود تا دفعه‌ی بعد instant hit
 *   - Graceful degradation: اگر Redis down باشد، فقط L1 کار می‌کند
 *   - اگر L1 و Redis هر دو down باشند، fallback برمی‌گردد
 *
 * نکته:
 *   L1 TTL می‌تواند کوتاه‌تر از L2 TTL باشد (= L1 سریع‌تر منقضی می‌شود
 *   تا داده‌ی تازه‌تر از L2 بگیرد). اگر L2 TTL کوتاه‌تر باشد، L1
 *   همیشه stale می‌زند که نادرست است.
 *   پیشنهاد: L1 TTL = 30-60s, L2 TTL = 120-300s
 * ----------------------------------------------------------------------------
 */

import {
  isRedisAvailable,
  redisRevalidateTag as l2RevalidateTag,
  redisSet as l2Set,
  redisGetSwr,
} from '@/lib/redis-cache';
import { safeRevalidateTag as l1RevalidateTag, safeCache, safeSet } from '@/lib/safe-cache';

// --------------- Options ---------------

export interface TieredCacheOptions {
  /** کلید یکتا برای این cache slot (برای L1 و L2 یکسان) */
  key: string;
  /** TTL در L1 (in-memory) — ثانیه */
  l1Ttl: number;
  /** TTL در L2 (Redis) — ثانیه. معمولاً > l1Ttl */
  l2Ttl: number;
  /** تگ‌ها برای revalidation گروهی (در هر دو سطح) */
  tags?: string[];
  /** SWR در هر دو سطح */
  swr?: boolean;
}

// --------------- Tiered Cache Factory ---------------

/**
 * یک تابع کش‌شده با دو سطح L1 + L2 ایجاد می‌کند.
 *
 * API مشابه `safeCache` است ولی دو TTL مجزا دارد.
 *
 * @example
 * const getPosts = tieredCache(fetchPosts, [] as PostWithRelations[], {
 *   key: 'gallery-posts',
 *   l1Ttl: 30,   // in-memory: 30 ثانیه
 *   l2Ttl: 300,  // Redis: 5 دقیقه
 *   tags: ['posts', 'gallery-posts'],
 *   swr: true,
 * });
 *
 * // استفاده:
 * const posts = await getPosts(10);
 */
export function tieredCache<TArgs extends unknown[], T>(
  fn: (...args: TArgs) => Promise<T>,
  fallback: T,
  options: TieredCacheOptions,
): (...args: TArgs) => Promise<T> {
  const { key: baseKey, l1Ttl, l2Ttl, tags = [], swr = false } = options;

  // --- L1: in-memory safeCache ---
  // فیلتر کردن tags تکراری (اختیاری — safeCache خودش مدیریت می‌کند)
  const l1Tags = tags.length > 0 ? tags : undefined;

  const l1Cached = safeCache(
    // L1 wrapper: اگر L1 miss خورد، L2 را چک کن
    async (...args: TArgs): Promise<T> => {
      const fullKey = makeKey(baseKey, args);

      // L2 check (Redis) — با بودجهٔ زمانی کوتاه.
      // 2026-08-12: قبلاً `await redisGetSwr` بدون سقف بود؛ روی شبکه‌های
      // پر-latency (مثلاً افغانستان → Upstash اروپا) هر فراخوانی ۰.۵ تا ۵
      // ثانیه طول می‌کشید و مسیر رندر صفحه را روی L1-miss کامل مسدود می‌کرد
      // (گرفت سراسری سایت). حالا L2 فقط اگر در L2_READ_TIMEOUT_MS جواب داد
      // استفاده می‌شود؛ وگرنه از منبع اصلی (fn/DB) می‌آید و L2 بعداً در
      // پس‌زمینه populate می‌شود — ارزش L2 (کش مشترک بین instanceها) حفظ
      // می‌شود ولی دیگر در مسیر بحرانی رندر نیست.
      if (isRedisAvailable()) {
        const l2Read = redisGetSwr<T>(fullKey).then(
          ([v, stale]) => ({ v, stale }) as const,
          () => ({ v: null, stale: false }) as const,
        );
        const budget = new Promise<{ timedOut: true }>((resolve) => {
          setTimeout(() => resolve({ timedOut: true }), L2_READ_TIMEOUT_MS);
        });

        const l2Result = await Promise.race([l2Read, budget]);

        if (!('timedOut' in l2Result)) {
          const { v: l2Value, stale: isStale } = l2Result;
          if (l2Value !== null && !isStale) {
            // L2 hit (fresh) → L1 را populate کن و برگردان
            // safeCache خودش این مقدار را cache می‌کند چون از داخل fn برگردونده شده
            return l2Value;
          }

          if (swr && l2Value !== null && isStale) {
            // L2 stale → L1 را با stale populate کن (برای SWR بعدی)
            // و refresh را در پس‌زمینه اجرا کن
            safeSet(fullKey, l2Value, l1Ttl);
            scheduleL2Refresh(fn, args as unknown as TArgs, fullKey, l2Ttl, tags, l2Value);
            return l2Value;
          }
        }
      }
      const value = await fn(...args);
      // populate L2 (fire-and-forget)
      if (isRedisAvailable()) {
        l2Set(fullKey, value, l2Ttl, tags).catch(() => {});
      }
      return value;
    },
    fallback,
    {
      key: baseKey,
      ttl: l1Ttl,
      tags: l1Tags,
      swr, // SWR در L1
    },
  );

  // wrapper نهایی: آرگومان‌ها را transparently عبور بده
  return async (...args: TArgs): Promise<T> => {
    return l1Cached(...args);
  };
}

// 2026-08-12: سقف انتظار برای خواندن L2. کوتاه نگه داشته شده تا در شبکه‌های
// پر-latency مسیر رندر بلاک نشود؛ در منطقه‌ای که Upstash سریع است (مثلاً هم‌منطقه
// با دیتاسنتر Upstash) پاسخ در چند ms می‌رسد و این بودجه تقریباً هرگز مصرف نمی‌شود.
const L2_READ_TIMEOUT_MS = 200;

// --------------- Helpers ---------------

/** ساخت کلید یکتا با آرگومان‌ها (همان منطق safeCache) */
const ARG_SEPARATOR = '::';
function makeKey(base: string, args: unknown[]): string {
  if (args.length === 0) return base;
  try {
    return `${base}${ARG_SEPARATOR}${JSON.stringify(args)}`;
  } catch {
    return `${base}${ARG_SEPARATOR}${args.map(String).join(ARG_SEPARATOR)}`;
  }
}

// نگهداری SWR refresh های فعال (ضد stampede)
const inflightSet = new Set<string>();

/**
 * اجرای refresh در پس‌زمینه با anti-stampede (فقط یک refresh هم‌زمان).
 * اگر موفق شود → L2 و L1 را مقدار جدید populate می‌کند.
 * اگر success=false برگرداند → stale را نگه می‌دارد.
 */
function scheduleL2Refresh<T, TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<T>,
  args: TArgs,
  fullKey: string,
  l2Ttl: number,
  tags: string[],
  staleValue: T,
): void {
  if (inflightSet.has(fullKey)) return; // از قبل در حال refresh است
  inflightSet.add(fullKey);

  const _startedAt = Date.now();
  fn(...args)
    .then((value) => {
      // populate L2
      l2Set(fullKey, value, l2Ttl, tags).catch(() => {});
      // populate L1 (با set مستقیم — سریع‌تر)
      safeSet(fullKey, value, l1TtlDefault);
    })
    .catch(() => {
      // stale را تا 30 ثانیه دیگر در L1 نگه دار
      safeSet(fullKey, staleValue, 30);
    })
    .finally(() => {
      inflightSet.delete(fullKey);
    });
}

// Default L1 TTL برای safeSet در SWR refresh
const l1TtlDefault = 60;

// --------------- Utility Functions ---------------

/**
 * Invalidate یک تگ در هر دو سطح L1 و L2.
 * معادل `revalidateTag` ولی برای tiered cache.
 *
 * @example
 * import { revalidateTag } from '@/lib/tiered-cache';
 * await revalidateTag('posts');
 */
export async function revalidateTag(tag: string): Promise<void> {
  // L1: in-memory
  l1RevalidateTag(tag);
  // L2: Redis
  await l2RevalidateTag(tag);
}

/**
 * مقدار را مستقیم در هر دو سطح ذخیره کن (برای cron/seed).
 */
export async function tieredSet<T>(
  key: string,
  value: T,
  l1Ttl: number,
  l2Ttl: number,
  tags?: string[],
): Promise<void> {
  safeSet(key, value, l1Ttl);
  await l2Set(key, value, l2Ttl, tags ?? []);
}

export default tieredCache;
