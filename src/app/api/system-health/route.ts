import { getSystemHealthSnapshot } from '@/actions/liveOpsActions';
import { auth } from '@/auth';
import { checkRateLimit } from '@/lib/rate-limiter';

/**
 * GET /api/system-health
 * ─────────────────────────────────────────────────────────────
 *  وضعیت سرویس‌ها برای polling داشبورد.
 *
 *  ۲۰۲۶-۰۸-۰۷ — این endpoint سه مشکل داشت:
 *   1. **بدون auth.** کامنت قبلی می‌گفت «بدون auth — فقط وضعیت سرویس‌ها را
 *      برمی‌گرداند»، ولی خروجی نقشهٔ زیرساخت و تأخیر داخلی است و خودِ
 *      handler به دیتابیس می‌زند. چون middleware هم روی `/api` فعال نبود،
 *      عملاً یک درِ باز به دیتابیس از اینترنت بود.
 *   2. **بدون rate limit.** هر درخواست یک round-trip دیتابیس — DoS ارزان.
 *   3. **نشت پیام.** بلاک catch عیناً `err.message` را برمی‌گرداند.
 *
 *  لایهٔ اول دفاع در middleware است (ADMIN_API_PREFIXES)؛ این گارد لایهٔ دوم
 *  است تا اگر matcher دوباره باریک شد، مسیر بی‌دفاع نماند.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);

const HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
} as const;

const deny = (status: number, code: string, message: string) =>
  Response.json(
    { ok: false, ts: new Date().toISOString(), services: [], error: { code, message } },
    { status, headers: HEADERS },
  );

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return deny(401, 'UNAUTHENTICATED', 'احراز هویت نشده‌اید');
  if (!ALLOWED_ROLES.has(session.user.role ?? '')) return deny(403, 'FORBIDDEN', 'دسترسی ندارید');

  // کلید محدودیت، شناسهٔ کاربر است نه IP: مسیر احراز هویت‌شده است و کلیدِ
  // کاربر با NAT و پروکسی اشتباه نمی‌شود.
  const limit = await checkRateLimit(`system-health:${session.user.id}`, 'api');
  if (!limit.success) {
    return deny(429, 'RATE_LIMITED', 'تعداد درخواست بیش از حد مجاز است');
  }

  try {
    const snapshot = await getSystemHealthSnapshot();
    return Response.json(snapshot, { status: 200, headers: HEADERS });
  } catch {
    // پیام خطای داخلی هرگز بیرون نمی‌رود.
    return deny(503, 'UNAVAILABLE', 'خواندن وضعیت سامانه ممکن نشد');
  }
}
