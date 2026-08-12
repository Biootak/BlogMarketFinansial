/**
 * safe-cache — جایگزین ایمن برای `unstable_cache`.
 * خطای DB را catch می‌کند، fallback برمی‌گرداند، و stale-while-revalidate دارد.
 * unstable_cache به تنهایی کافی نیست چون خطا را در cache-layer throw می‌کند
 * نه داخل function body — یعنی try/catch داخل function بی‌اثر است.
 */

const isDev = process.env.NODE_ENV === 'development';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  /** زمان آخرین موفقیت — برای stale-fallback استفاده می‌شود */
  storedAt: number;
}

// In-memory cache bounded to prevent unbounded growth; oldest entries evicted first.
// 2026-08-12: علاوه بر سقف تعداد، سقف حجمی هم داریم — چند entry بزرگ (پست‌ها،
// نرخ بازار) می‌توانند صدها KB بگیرند و ۱۰۰۰ تا از آن‌ها = صدها MB (دلیل
// R14 روی dyno 512MB). هر entry هم وزن تخمینی دارد؛ وقتی مجموع از
// SAFE_CACHE_MAX_BYTES گذشت، قدیمی‌ترین‌ها حذف می‌شوند.
const MAX_CACHE_ENTRIES = Number(process.env.SAFE_CACHE_MAX_ENTRIES) || 1000;
const MAX_CACHE_BYTES = Number(process.env.SAFE_CACHE_MAX_BYTES) || 150 * 1024 * 1024;
const memoryStore = new Map<string, CacheEntry<unknown>>();

/** وزن تخمینی یک entry (بایت) — برای سقف حجمی. */
function estimateBytes<T>(value: T): number {
  // JSON.stringify روی objects/cache های بزرگ کافی است؛ برای ساده‌سازی
  // string/number/boolean هم به همین شکل محاسبه می‌شود.
  try {
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (value === null || value === undefined) return 0;
    const json = JSON.stringify(value);
    return json ? json.length * 2 : 64;
  } catch {
    // circular reference یا خیلی بزرگ — تخمین محافظه‌کارانه
    return 1024;
  }
}

// Maps tag → set of base keys so safeRevalidateTag can purge in-memory slots by tag.
const tagRegistry = new Map<string, Set<string>>();

// 2026-08-08: single-flight برای background refresh (حالت swr) — فقط یک
// refresh هم‌زمان برای هر key؛ بقیه‌ی request ها stale می‌گیرند نه اینکه
// scrape دوباره را trigger کنند (ضد stampede).
const inflightRefresh = new Set<string>();

let totalBytes = 0;

function evictIfNeeded(): void {
  while (memoryStore.size > MAX_CACHE_ENTRIES || totalBytes > MAX_CACHE_BYTES) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey === undefined) {
      totalBytes = 0;
      break;
    }
    const entry = memoryStore.get(oldestKey);
    if (entry) totalBytes -= estimateBytes(entry.value);
    memoryStore.delete(oldestKey);
  }
}

function trackSet(key: string, entry: CacheEntry<unknown>): void {
  memoryStore.set(key, entry);
  totalBytes += estimateBytes(entry.value);
  evictIfNeeded();
}

interface SafeCacheOptions {
  /** کلید یکتا برای این cache slot */
  key: string;
  /** TTL به ثانیه (مثل unstable_cache revalidate) */
  ttl: number;
  /** اختیاری — برای observability */
  tags?: string[];
  /**
   * 2026-08-08: stale-while-revalidate.
   * وقتی cache منقضی شده ولی مقدار قبلی موجود است → همان لحظه مقدار قبلی
   * (stale) برمی‌گردد و refresh در پس‌زمینه اجرا می‌شود. request هرگز روی
   * فراخوانی‌های کند (مثل scrape های خارجی) بلاک نمی‌شود.
   */
  swr?: boolean;
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
  const { key: baseKey, ttl, tags = [], swr = false } = options;

  for (const tag of tags) {
    if (!tagRegistry.has(tag)) tagRegistry.set(tag, new Set());
    tagRegistry.get(tag)?.add(baseKey);
  }

  return async (...args: TArgs): Promise<T> => {
    const now = performance.now();
    const fullKey = makeKey(baseKey, args);
    const cached = memoryStore.get(fullKey) as CacheEntry<T> | undefined;

    // 1) اگر cache تازه است → از cache برگردان (no DB call)
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    // 1.5) SWR: منقضی ولی مقدار قبلی موجود → فوراً stale برگردان و refresh
    // را در پس‌زمینه اجرا کن (single-flight). مسیر رندر (hero) دیگر هیچ‌وقت
    // منتظر scrape نمی‌ماند.
    if (swr && cached) {
      if (!inflightRefresh.has(fullKey)) {
        inflightRefresh.add(fullKey);
        const startedAt = performance.now();
        fn(...args)
          .then((value) => {
            // اگر در همین فاصله نوشتهٔ تازه‌تری آمده (مثلاً cron با safeSet)،
            // نتیجهٔ کندِ ما نباید آن را پاک کند — فقط وقتی بنویس که ورودی
            // فعلی قدیمی‌تر از شروعِ این refresh باشد.
            const current = memoryStore.get(fullKey) as CacheEntry<T> | undefined;
            if (!current || current.storedAt <= startedAt) {
              trackSet(fullKey, {
                value,
                expiresAt: performance.now() + ttl * 1000,
                storedAt: performance.now(),
              });
            }
          })
          .catch(() => {
            // stale را نگه دار؛ TTL را کمی تمدید کن تا زودتر دوباره تلاش شود
            cached.expiresAt = performance.now() + Math.min(ttl, 30) * 1000;
          })
          .finally(() => {
            inflightRefresh.delete(fullKey);
          });
      }
      return cached.value;
    }

    // 2) cache تازه نیست → fn را فراخوانی کن
    try {
      const value = await fn(...args);
      trackSet(fullKey, { value, expiresAt: now + ttl * 1000, storedAt: now });
      if (isDev && tags.length > 0) {
        // فقط برای dev observability
      }
      return value;
    } catch {
      // 3) خطا رخ داد:
      //    - اگر قبلاً value موفق داشتیم (stale) → آن را برگردان
      //    - در غیر این صورت → fallback
      if (cached) {
        // TTL را تمدید کن تا request بعدی دوباره امتحان کند
        cached.expiresAt = now + Math.min(ttl, 30) * 1000;
        return cached.value;
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
  const entry = memoryStore.get(key);
  if (entry) {
    totalBytes -= estimateBytes(entry.value);
    memoryStore.delete(key);
  }
}

/**
 * 2026-08-08: نوشتن مستقیم در cache — برای cron ها که داده را از قبل دارند
 * (مثل refresh-market-rates) تا کش صفحات بدون بلاکِ scrape تازه شود.
 * کلید باید همان fullKey باشد (برای safeCache بدون آرگومان = خود baseKey).
 */
export function safeSet<T>(key: string, value: T, ttlSeconds: number): void {
  const now = performance.now();
  trackSet(key, { value, expiresAt: now + ttlSeconds * 1000, storedAt: now });
}

/**
 * پاک کردن همه slot های in-memory که به این tag گوش می‌دهند.
 */
export function safeRevalidateTag(tag: string): void {
  const keys = tagRegistry.get(tag);
  if (!keys) return;
  for (const baseKey of [...keys]) {
    for (const fullKey of [...memoryStore.keys()]) {
      if (fullKey === baseKey || fullKey.startsWith(`${baseKey}${ARG_SEPARATOR}`)) {
        const entry = memoryStore.get(fullKey);
        if (entry) totalBytes -= estimateBytes(entry.value);
        memoryStore.delete(fullKey);
      }
    }
  }
}

/**
 * پاک کردن همه‌ی cache ها — برای debug.
 */
export function safeRevalidateAll(): void {
  memoryStore.clear();
  totalBytes = 0;
}

export default safeCache;
