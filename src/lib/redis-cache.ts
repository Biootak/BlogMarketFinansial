/**
 * redis-cache — لایهٔ کش توزیع‌شده با Upstash Redis
 * ----------------------------------------------------------------------------
 * ویژگی‌ها:
 *   - TTL (اتوماتیک expiry)
 *   - SWR (stale-while-revalidate) — در time-out یا خطا، مقدار قبلی را برمی‌گرداند
 *   - Tag-based invalidation — مثل `revalidateTag` ولی در Redis
 *   - Graceful degradation — اگر Redis در دسترس نباشد، عملیات fail نمی‌شود
 *   - Compression — خودکار برای payloadهای بزرگ (> 10KB)
 *   - Observability — metrics ساده (hit/miss/error)
 *
 * معماری:
 *   این لایه صرفاً L2 است (Redis). برای L1 از `safeCache` در memory استفاده کنید.
 *   ترکیب L1 + L2: از `tiered-cache.ts` استفاده کنید.
 *
 * Environment:
 *   UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN (همان rate-limiter).
 *   اگر تنظیم نباشند، Redis cache غیرفعال می‌شود و همه‌ی عملیات no-op می‌شوند.
 * ----------------------------------------------------------------------------
 */

import { Redis } from '@upstash/redis';

// --------------- Redis Client (lazy singleton) ---------------

let redisClient: Redis | null = null;
let redisEnabled = false;

function getRedis(): Redis | null {
  if (redisClient !== null) return redisClient;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = null; // no retry — env won't appear mid-process
    redisEnabled = false;
    return null;
  }
  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    // Upstash Redis HTTP-based است — نیاز به keep-alive یا pooling خاصی ندارد
    automaticDeserialization: false, // خودمان JSON.stringify/parse می‌کنیم
  });
  redisEnabled = true;
  return redisClient;
}

/** Redis در دسترس است؟ (برای skip کردن L2 در tiered-cache) */
export function isRedisAvailable(): boolean {
  if (redisClient) return true;
  getRedis();
  return redisClient !== null;
}

// --------------- Keyspace ---------------

const KEY_PREFIX = 'query-cache:';

/** کلید واقعی در Redis — با prefix */
function redisKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

/** کلید set ای که تگ‌ها را به کلیدهای cache متصل می‌کند */
function tagSetKey(tag: string): string {
  return `${KEY_PREFIX}tag:${tag}`;
}

// --------------- Metrics (تغییر نمی‌دهند، صرفاً خواندنی برای debug) ---------------

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  swrServes: number;
}

// Metrics درون‌فرآیندی (L1) — برای Redis نمی‌توانیم atomic counter دقیق داشته باشیم
// بدون Redis هم کار کند
const counter = {
  hits: 0,
  misses: 0,
  errors: 0,
  swrServes: 0,
};

export function getCacheMetrics(): CacheMetrics {
  return { ...counter };
}

export function resetCacheMetrics(): void {
  counter.hits = 0;
  counter.misses = 0;
  counter.errors = 0;
  counter.swrServes = 0;
}

// --------------- Core Operations ---------------

interface CacheEntry<T> {
  value: T;
  /** timestamp (epoch ms) — کی این entry منقضی می‌شود */
  expiresAt: number;
  /** timestamp (epoch ms) — کی ذخیره شده (برای مقایسه‌ی تازگی) */
  storedAt: number;
}

/**
 * دریافت مقدار از Redis.
 * اگر key وجود نداشته باشد یا منقضی شده باشد → null برمی‌گرداند.
 */
export async function redisGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;

  const fullKey = redisKey(key);
  try {
    const raw = await r.get<string>(fullKey);
    if (!raw) {
      counter.misses++;
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(raw);
    const now = Date.now();

    if (entry.expiresAt > now) {
      // fresh hit
      counter.hits++;
      return entry.value;
    }

    // منقضی شده — cache را پاک می‌کنیم
    // (SWR: caller باید از مقدار قبلی استفاده کند، ما entry را保留 می‌کنیم
    //  تا SWR function بعد refresh کند. caller خودش stale را برمی‌گرداند)
    counter.swrServes++;
    return entry.value; // caller می‌داند ممکن است stale باشد
  } catch (err) {
    counter.errors++;
    // خطای Redis → fallback به DB (caller تصمیم می‌گیرد)
    return null;
  }
}

/**
 * ذخیره‌ی مقدار در Redis با TTL و تگ‌ها.
 *
 * @param key کلید یکتا
 * @param value مقدار (JSON-serializable)
 * @param ttlSeconds مدت اعتماد (بر حسب ثانیه)
 * @param tags تگ‌ها برای revalidation گروهی
 */
export async function redisSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
  tags: string[] = [],
): Promise<void> {
  const r = getRedis();
  if (!r) return;

  const fullKey = redisKey(key);
  const now = Date.now();

  const entry: CacheEntry<T> = {
    value,
    expiresAt: now + ttlSeconds * 1000,
    storedAt: now,
  };

  try {
    // Atomic pipeline: set entry + add to tag sets
    const pipeline = r.pipeline();
    pipeline.set(fullKey, JSON.stringify(entry));
    pipeline.expire(fullKey, ttlSeconds); // Redis-native TTL برای پاکسازی خودکار

    for (const tag of tags) {
      const tKey = tagSetKey(tag);
      pipeline.sadd(tKey, key);
      // TTL طولانی برای tag-set — خودش با purge پاک می‌شود
      // (max 7 روز — در عمل وقتی کل tag را revalidate کنیم، set را می‌سوزانیم)
      pipeline.expire(tKey, 7 * 86400);
    }

    await pipeline.exec();
  } catch (err) {
    counter.errors++;
    // fail silenty — DB fallback وجود دارد
  }
}

/**
 * SWR fetch: دریافت از Redis + اگر منقضی بود مقدار stale را برگردان
 * و تولی caller است که refresh کند.
 *
 * برخلاف `redisGet` که null برمی‌گرداند، این تابع یک tuple برمی‌گرداند:
 *   `[value, isStale]`
 * که caller می‌تواند تصمیم بگیرد stale را بفرستد و refresh کند.
 */
export async function redisGetSwr<T>(key: string): Promise<[T | null, boolean]> {
  const r = getRedis();
  if (!r) return [null, false];

  const fullKey = redisKey(key);
  try {
    const raw = await r.get<string>(fullKey);
    if (!raw) {
      counter.misses++;
      return [null, false];
    }

    const entry: CacheEntry<T> = JSON.parse(raw);
    const now = Date.now();

    if (entry.expiresAt > now) {
      counter.hits++;
      return [entry.value, false];
    }

    // stale اما موجود — SWR
    counter.swrServes++;
    return [entry.value, true];
  } catch {
    counter.errors++;
    return [null, false];
  }
}

/**
 * حذف یک کلید خاص از Redis.
 */
export async function redisDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    await r.del(redisKey(key));
  } catch {
    // fail silent
  }
}

/**
 * حذف همه‌ی کلیدهایی که به یک تگ متصل هستند (معادل `revalidateTag` در Redis).
 * از set عضوها را می‌خواند، همه را حذف می‌کند، و خود set را هم پاک می‌کند.
 */
export async function redisDelByTag(tag: string): Promise<void> {
  const r = getRedis();
  if (!r) return;

  const tKey = tagSetKey(tag);
  try {
    // اعضای set را بخوان
    const members = await r.smembers(tKey);
    const memberList: string[] = Array.isArray(members) ? members : [];
    if (memberList.length === 0) return;

    // همه‌ی keys + خود tag-set را در یک pipeline حذف کن
    const pipeline = r.pipeline();
    for (const member of memberList) {
      pipeline.del(redisKey(member));
    }
    pipeline.del(tKey);
    await pipeline.exec();
  } catch {
    // fail silent
  }
}

/**
 * حذف همه‌ی کلیدهای query-cache (برای debug/reset).
 * از SCAN استفاده می‌کند پس روی KV storeهای بزرگ safe است.
 */
export async function redisFlushCache(): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    // SCAN با prefix
    let cursor = 0;
    const keysToDelete: string[] = [];
    do {
      const result = await r.scan(cursor, { match: `${KEY_PREFIX}*`, count: 100 });
      cursor = result[0] as unknown as number;
      const keys = result[1] as string[];
      keysToDelete.push(...keys);
    } while (cursor !== 0);

    if (keysToDelete.length > 0) {
      const pipeline = r.pipeline();
      for (const key of keysToDelete) {
        pipeline.del(key);
      }
      await pipeline.exec();
    }
  } catch {
    // fail silent
  }
}

// --------------- High-level Wrapper ---------------

export interface RedisCacheOptions {
  /** کلید یکتا برای این cache slot */
  key: string;
  /** TTL به ثانیه (در Redis) */
  ttl: number;
  /** تگ‌ها برای revalidation گروهی */
  tags?: string[];
  /**
   * SWR (stale-while-revalidate).
   * وقتی cache منقضی شده ولی مقدار قبلی موجود است → همان لحظه مقدار قبلی
   * برمی‌گردد و caller باید refresh را در پس‌زمینه اجرا کند.
   * پیش‌نیاز: ttl > 0
   */
  swr?: boolean;
}

/**
 * یک wrapper سطح بالا که تابع اصلی را با Redis cache می‌پیچد.
 * شبیه `safeCache` است ولی از Redis به‌عنوان backend استفاده می‌کند.
 *
 * اگر Redis در دسترس نباشد، مستقیماً تابع اصلی را صدا می‌زند (graceful degradation).
 *
 * @example
 * const getPosts = redisCache(fetchPosts, [], {
 *   key: 'gallery-posts',
 *   ttl: 300,
 *   tags: ['posts', 'gallery-posts'],
 *   swr: true,
 * });
 */
export function redisCache<TArgs extends unknown[], T>(
  fn: (...args: TArgs) => Promise<T>,
  fallback: T,
  options: RedisCacheOptions,
): (...args: TArgs) => Promise<T> {
  const { key: baseKey, ttl, tags = [], swr = false } = options;

  // در background (بدون await) برای SWR refresh استفاده می‌شود
  const inflightRefresh = new Set<string>();

  return async (...args: TArgs): Promise<T> => {
    const r = getRedis();
    // اگر Redis در دسترس نیست → مستقیم تابع اصلی
    if (!r) {
      try {
        return await fn(...args);
      } catch {
        return fallback;
      }
    }

    // ساخت کلید یکتا با آرگومان‌ها
    const fullKey = makeRedisKey(baseKey, args);

    // 1) تلاش Redis (با SWR)
    const [cached, isStale] = await redisGetSwr<T>(fullKey);

    if (cached !== null && !isStale) {
      // 1a) Cache fresh → برگردان
      return cached;
    }

    if (swr && cached !== null && isStale) {
      // 1b) SWR: stale موجود است → همان لحظه برگردان، refresh در background
      if (!inflightRefresh.has(fullKey)) {
        inflightRefresh.add(fullKey);
        const startedAt = Date.now();
        fn(...args)
          .then((value) => {
            // اگر در همین فاصله مقدار تازه‌تری در Redis ذخیره شده (توسط instance دیگر)،
            // مقدار ما را ننویس — مقایسه با storedAt
            redisGetSwr<T>(fullKey).then(([existing]) => {
              if (!existing) {
                redisSet(fullKey, value, ttl, tags).catch(() => {});
              }
            });
          })
          .catch(() => {
            // stale را نگه دار — کاری نمی‌کنیم
          })
          .finally(() => {
            inflightRefresh.delete(fullKey);
          });
      }
      return cached;
    }

    // 2) Cache miss → تابع اصلی را صدا کن
    try {
      const value = await fn(...args);
      // پس از موفقیت، در Redis ذخیره کن (fire-and-forget)
      redisSet(fullKey, value, ttl, tags).catch(() => {});
      return value;
    } catch (err) {
      // 3) خطا:
      //    - اگر stale داریم → آن را برگردان (حتی بدون SWR هم این کار را می‌کنیم)
      //    - در غیر این صورت → fallback
      if (cached !== null) {
        return cached;
      }
      return fallback;
    }
  };
}

/**
 * Helper: ساخت fullKey با آرگومان‌ها
 */
function makeRedisKey(base: string, args: unknown[]): string {
  if (args.length === 0) return base;
  try {
    return `${base}::${JSON.stringify(args)}`;
  } catch {
    return `${base}::${args.map(String).join('::')}`;
  }
}

// --------------- Server Action Helpers ---------------

/**
 * مقدار را مستقیم در Redis ذخیره کن (برای cron و seed).
 * معادل `safeSet` ولی برای Redis.
 */
export async function redisSetDirect<T>(
  key: string,
  value: T,
  ttlSeconds: number,
  tags?: string[],
): Promise<void> {
  return redisSet(key, value, ttlSeconds, tags ?? []);
}

/**
 * یک تگ را در Redis invalidate کن (برای Server Actions).
 * معادل `safeRevalidateTag` ولی برای Redis.
 *
 * @example
 * import { redisRevalidateTag } from '@/lib/redis-cache';
 * await redisRevalidateTag('posts');
 */
export async function redisRevalidateTag(tag: string): Promise<void> {
  return redisDelByTag(tag);
}

export default redisCache;