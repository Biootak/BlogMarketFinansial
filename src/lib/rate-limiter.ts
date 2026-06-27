import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { LRUCache } from 'lru-cache';

// اگه Redis تنظیم نشده، از in-memory استفاده کن
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Rate limiters مختلف برای کاربردهای مختلف
export const rateLimiters = {
  // API عمومی: 100 درخواست در دقیقه
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
        prefix: 'ratelimit:api',
      })
    : null,

  // آپلود: 30 درخواست در دقیقه
  upload: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        analytics: true,
        prefix: 'ratelimit:upload',
      })
    : null,

  // Auth: 10 تلاش در 15 دقیقه (برای جلوگیری از brute force)
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '15 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
      })
    : null,

  // Pageview: 200 درخواست در دقیقه
  pageview: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(200, '1 m'),
        analytics: true,
        prefix: 'ratelimit:pageview',
      })
    : null,
};

// Fallback in-memory rate limiter با LRU bounded cache
// جایگزین Map بی‌نهایت قبلی - خودکار entryهای منقضی/کم‌استفاده را حذف می‌کند
const inMemoryStore = new LRUCache<string, { count: number; resetTime: number }>({
  // حداکثر تعداد identifierهای منحصر به فرد در حافظه
  // کافی برای workload واقعی؛ اگه بیشتر بشه، LRU قدیمی‌ها رو حذف می‌کنه
  max: 50_000,
  // TTL پیش‌فرض - هر entry بعد این مدت منقضی می‌شه
  // هر نوع rate limit حداکثر window‌اش 15m هست، پس 20m کافیه
  ttl: 20 * 60 * 1000,
  ttlAutopurge: true,
});

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  api: { max: 100, windowMs: 60 * 1000 },
  upload: { max: 30, windowMs: 60 * 1000 },
  auth: { max: 10, windowMs: 15 * 60 * 1000 },
  pageview: { max: 200, windowMs: 60 * 1000 },
};

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof rateLimiters = 'api'
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiter = rateLimiters[type];

  // اگه Redis داریم، از Upstash استفاده کن
  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      // اگه Upstash fail شد (timeout, network)، fail-open و از in-memory استفاده کن
      console.warn(`[rate-limiter] Upstash failed for ${type}, falling back to in-memory:`, error);
    }
  }

  // Fallback به in-memory
  const { max, windowMs } = LIMITS[type] ?? LIMITS.api;
  const now = Date.now();
  const key = `${type}:${identifier}`;
  const record = inMemoryStore.get(key);

  if (!record || now > record.resetTime) {
    inMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: max - 1, reset: now + windowMs };
  }

  if (record.count >= max) {
    return { success: false, remaining: 0, reset: record.resetTime };
  }

  record.count++;
  return { success: true, remaining: max - record.count, reset: record.resetTime };
}

// پاکسازی حافظه (برای in-memory) - فقط در Node.js runtime و فقط یکبار
// LRU cache خودش TTL داره، پس نیازی به interval manual نیست
// این فقط برای cleanup entries منقضی شده در window‌های طولانی‌تر هست
// در Edge runtime این کد اجرا نمیشه (process.env.NEXT_RUNTIME === 'edge')
if (
  typeof globalThis.setInterval !== 'undefined' &&
  typeof process !== 'undefined' &&
  process.env.NEXT_RUNTIME !== 'edge' &&
  // جلوگیری از اجرای چندباره در dev با HMR
  !(globalThis as { __bmf_rate_limiter_cleanup__?: boolean }).__bmf_rate_limiter_cleanup__
) {
  (globalThis as { __bmf_rate_limiter_cleanup__?: boolean }).__bmf_rate_limiter_cleanup__ = true;
  setInterval(
    () => {
      // LRU ttlAutopurge: true خودش cleanup می‌کنه
      // این فقط به‌عنوان backup هست
      const now = Date.now();
      for (const [key, value] of inMemoryStore.entries()) {
        if (now > value.resetTime) {
          inMemoryStore.delete(key);
        }
      }
    },
    5 * 60 * 1000
  ); // هر 5 دقیقه - نه 1 دقیقه (کمتر overhead)
}
