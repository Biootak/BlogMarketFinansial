import {
  type ObservabilityFailure,
  getObservabilitySnapshot,
} from '@/lib/observability';

/**
 * GET /api/observability/metrics
 * ─────────────────────────────────────────────────────────────
 *  Endpoint سریع برای polling از سمت کلاینت (هر ۳۰ ثانیه).
 *  محافظت دولایه: middleware (نقش‌های ارشد) + گاردِ داخل
 *  `getObservabilitySnapshot`.
 *
 *  ۲۰۲۶-۰۸-۰۷ — اصلاح کدهای وضعیت.
 *  نسخهٔ قبلی هر شکستی را ۴۰۱ می‌داد. کلاینت هم ۴۰۱ را «نشست منقضی شده»
 *  تفسیر می‌کند و polling را برای همیشه می‌بندد. نتیجه: یک قطعی موقتِ
 *  دیتابیس صفحه را تا reload کامل مرده می‌گذاشت.
 *
 *    401 → نشست نداریم        (کلاینت باید polling را قطع کند)
 *    403 → نقش کافی نیست      (کلاینت باید polling را قطع کند)
 *    503 → داده خوانده نشد    (کلاینت باید تلاش را ادامه دهد)
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
} as const;

const STATUS_BY_CODE: Record<ObservabilityFailure, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  DEGRADED: 503,
};

export async function GET() {
  try {
    const result = await getObservabilitySnapshot();

    if (!result.success) {
      const code: ObservabilityFailure = result.code ?? 'DEGRADED';
      return Response.json(
        {
          success: false,
          // در حالت degraded خودِ snapshot را هم می‌فرستیم تا UI بتواند
          // «آخرین ساختار» را با برچسب بی‌اعتبار نشان دهد.
          data: code === 'DEGRADED' ? result.data : undefined,
          error: { code, message: result.message ?? 'خواندن داده ممکن نشد' },
        },
        { status: STATUS_BY_CODE[code], headers: NO_STORE },
      );
    }

    return Response.json({ success: true, data: result.data }, { status: 200, headers: NO_STORE });
  } catch {
    // پیام خطای داخلی هرگز به کلاینت نشت نمی‌کند.
    return Response.json(
      { success: false, error: { code: 'INTERNAL', message: 'خطای داخلی سرور' } },
      { status: 500, headers: NO_STORE },
    );
  }
}
