import { serverLog } from '@/lib/server-logger';
import { Redis } from '@upstash/redis';

/**
 * session-denylist — باطل‌سازی فوری توکن JWT هنگام خروج
 *
 * مشکل (WorkOS «Stateless JWTs have a logout problem»، 2026-08؛ jsonic.io
 * «JWT Revocation Strategies»، 2026-05): با strategy='jwt' کوکیِ کپی‌شده تا
 * انقضا معتبر می‌ماند. راه‌حل استاندارد: denylist در Redis با TTL برابر عمر
 * باقی‌ماندهٔ توکن — خود-پاک‌شونده و با یک GET ارزان.
 *
 * دانه‌بندی: هر توکن یک jti تصادفی دارد (در jwt callback هنگام sign-in ساخته
 * می‌شود) → خروجِ تک‌دستگاه فقط همان توکن (و کپی‌هایش) را می‌کُشد؛ سایر
 * دستگاه‌ها سالم می‌مانند. «خروج از همه‌جا» همان مکانیزم موجود tokenVersion /
 * passwordVersion را دارد.
 *
 * سیاست خطا: fail-open — اگر Redis در دسترس نباشد کاربر عادی نباید قفل شود؛
 * لایه‌های tokenVersion/passwordVersion/بن همچنان سمت DB فعال‌اند.
 */

const SESSION_MAX_AGE_SECONDS = 3 * 24 * 60 * 60; // آینهٔ session.maxAge در src/auth.ts

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/** نام کوکی سشن — آینهٔ منطق Auth.js (پیشوند __Secure- روی HTTPS) */
export function resolveSessionCookieName(): string {
  const httpsBase = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? '').startsWith('https://');
  const useSecureCookies = process.env.NODE_ENV === 'production' || httpsBase;
  return useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token';
}

export async function revokeSessionJti(jti: string): Promise<boolean> {
  if (!redis || !jti) return false;
  try {
    await redis.set(`jwt-deny:${jti}`, '1', { ex: SESSION_MAX_AGE_SECONDS });
    return true;
  } catch (error) {
    serverLog.warn('session-denylist', 'revoke-failed', error);
    return false;
  }
}

export async function isSessionRevoked(jti: string): Promise<boolean> {
  if (!redis || !jti) return false;
  try {
    return (await redis.get<string>(`jwt-deny:${jti}`)) === '1';
  } catch (error) {
    // fail-open — در دسترس‌نبودن Redis نباید همهٔ کاربران را بیرون بیندازد
    serverLog.warn('session-denylist', 'check-failed', error);
    return false;
  }
}
