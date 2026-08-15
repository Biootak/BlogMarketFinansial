import { createUpstashRequester } from '@/lib/upstash-requester';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { LRUCache } from 'lru-cache';

// اگه Redis تنظیم نشده، از in-memory استفاده کن
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis(
      createUpstashRequester({
        url: process.env.UPSTASH_REDIS_REST_URL,
        // biome-ignore lint/style/noNonNullAssertion: UPSTASH_REDIS_REST_TOKEN is guaranteed present when UPSTASH_REDIS_REST_URL is set
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        // 2026-08-12 — داک رسمی Upstash (Request Timeout): سقف هر فراخوانی در
        // سطح کلاینت؛ روی شبکه‌های پر-latency هر pipeline ۰.۵ تا ۵+ ثانیه طول
        // می‌کشید و اکشن‌های auth/صرافی/صفحه‌بینی بدون سقف آویزان می‌ماندند.
        // در timeout، @upstash/ratelimit به‌صورت TimeoutError reject می‌کند و
        // catch پایین همان سیاست موجود را اعمال می‌کند (auth فیل-کلوز، بقیه
        // in-memory). توجه: از آپشن `timeout` خود Ratelimit استفاده نمی‌کنیم
        // چون طبق داک رسمی (features → Timeout) آن آپشن روی timeout درخواست را
        // ALLOW می‌کند (fail-open) که با سیاست fail-closed این پروژه برای auth
        // ناسازگار است.
        timeoutMs: 4000,
      }),
      // automaticDeserialization پیش‌فرض (true) — Ratelimit به parse نیاز دارد.
    )
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

  // Auth: 10 تلاش در 3 دقیقه (برای جلوگیری از brute force)
  // 2026-08-13: قبلاً 15 دقیقه بود — کاربر از قفل طولانی‌مدت ورود ناراضی
  // بود؛ 3 دقیقه هنوز برای ضد brute-force کافی است ولی تجربهٔ کاربر را
  // خراب نمی‌کند.
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '3 m'),
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

  // نرخ ارز عمومی: 60 درخواست در دقیقه
  'exchange-rates': redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: 'ratelimit:exchange-rates',
      })
    : null,

  // پیگیری معامله: 20 درخواست در دقیقه (per IP)
  'deal-track': redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        analytics: true,
        prefix: 'ratelimit:deal-track',
      })
    : null,

  // T1-P1: جستجوی گیرنده Transfer — ضد phone-number enumeration
  // ۱۰ درخواست در دقیقه (per user). چون auth لازم است، user.id کلید است.
  'transfer-find': redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:transfer-find',
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
  auth: { max: 10, windowMs: 3 * 60 * 1000 },
  pageview: { max: 200, windowMs: 60 * 1000 },
  'exchange-rates': { max: 60, windowMs: 60 * 1000 },
  'deal-track': { max: 20, windowMs: 60 * 1000 },
  'transfer-find': { max: 10, windowMs: 60 * 1000 },
};

export async function checkRateLimit(
  identifier: string,
  type: keyof typeof rateLimiters = 'api',
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiter = rateLimiters[type];

  // اگه Redis داریم، از Upstash استفاده کن. هر فراخوانی با signal کلاینت
  // (بالا) بعد از 2 ثانیه TimeoutError می‌دهد — همان مسیر catch پایین.
  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch {
      // 2026-08-13 (UX-fix): قبلاً برای auth فیل-کلوز بود — وقتی Upstash
      // (eu-west-1) از ۲ ثانیه دیرتر جواب می‌داد، «هر» درخواست ورود رد می‌شد
      // و cooldown مدام تازه می‌ماند؛ کاربر با ۲-۳ تلاش واقعی برای همیشه
      // قفل می‌شد. حالا برای auth هم fallback به in-memory می‌شویم:
      // همان سقف (۱۰/۳دقیقه) per-process اجرا می‌شود و در single-instance
      // دقیقاً معادل است. fail-closed صرفاً auth را برای همه DoS می‌کرد.
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

/**
 * ریست شمارندهٔ rate-limit برای یک identifier.
 *
 * UX-fix (2026-08-13): قبلاً `checkRateLimit` روی ورود/تأیید قبل از بررسی
 * رمز صدا زده می‌شد و هر submit — حتی با رمز درست — یک تلاش مصرف می‌کرد.
 * در نتیجه بعد از چند ورود موفق یا کلیک‌های تکراری، کاربر بی‌دلیل با
 * «تلاش بیش از حد» بلاک می‌شد. حالا بعد از هر ورود/تأیید موفق، شمارنده
 * ریست می‌شود تا فقط تلاش‌های ناموفق (brute-force) شمارش شوند.
 */
export async function resetRateLimit(
  identifier: string,
  type: keyof typeof rateLimiters = 'api',
): Promise<void> {
  const limiter = rateLimiters[type];
  if (limiter && redis) {
    try {
      // Upstash slidingWindow کلیدها را به شکل `<prefix>:<identifier>:<bucket>`
      // ذخیره می‌کند (bucket = پنجرهٔ زمانی). همهٔ bucket های همان identifier
      // را با SCAN پیدا و DEL می‌کنیم.
      const prefix = rateLimiters[type] ? `ratelimit:${type}:${identifier}:` : null;
      if (prefix) {
        await scanDeleteKeys(prefix);
      }
    } catch {
      // fail-open: ریست نکردن فقط یعنی کاربر ممکن است کمی زودتر بلاک شود —
      // خطای بحرانی نیست.
    }
  }
  inMemoryStore.delete(`${type}:${identifier}`);
}

/** SCAN + DEL همهٔ کلیدهای دارای یک پیشوند (برای ریست rate-limit). */
async function scanDeleteKeys(prefix: string): Promise<void> {
  if (!redis) return;
  let cursor = '0';
  do {
    const result: [string, string[]] = await redis.scan(cursor, {
      match: `${prefix}*`,
      count: 200,
    });
    for (const key of result[1]) {
      await redis.del(key);
    }
    cursor = result[0];
  } while (cursor !== '0');
}

// M10: هشدار Serverless — در Vercel Edge deployment، هر lambda in-memory خودش را دارد.
// مهاجم با ارسال درخواست از ۵۰ IP مختلف می‌تواند ۵۰×۱۰۰ = ۵۰۰۰ درخواست بزند
// تا اینکه یک lambda به حد خود برسد. اینجا فیل کلوز (fail closed) برای نوع auth
// امنیت را بالا می‌برد چون بدون Redis همه درخواست‌های auth ریجکت می‌شوند.
// برای production حتماً UPSTASH_REDIS_REST_URL تنظیم شود.
//
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
    5 * 60 * 1000,
  ); // هر 5 دقیقه - نه 1 دقیقه (کمتر overhead)
}
