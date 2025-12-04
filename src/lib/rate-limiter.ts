import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

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

// Fallback in-memory rate limiter
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof rateLimiters = 'api'
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiter = rateLimiters[type];

  // اگه Redis داریم، از Upstash استفاده کن
  if (limiter) {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  // Fallback به in-memory
  const limits: Record<string, { max: number; windowMs: number }> = {
    api: { max: 100, windowMs: 60 * 1000 },
    upload: { max: 30, windowMs: 60 * 1000 },
    auth: { max: 10, windowMs: 15 * 60 * 1000 },
    pageview: { max: 200, windowMs: 60 * 1000 },
  };

  const { max, windowMs } = limits[type];
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

// پاکسازی حافظه (برای in-memory)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (now > value.resetTime) {
      inMemoryStore.delete(key);
    }
  }
}, 60 * 1000); // هر دقیقه
