import { getObservabilitySnapshot } from '@/lib/observability';

/**
 * GET /api/observability/metrics
 * ─────────────────────────────────────────────────────────────
 *  Endpoint سریع برای polling از سمت کلاینت (مثلاً هر ۳۰ ثانیه).
 *  در حالت عادی توسط SessionGuard و requireAuth محافظت می‌شود
 *  چون داخل /dashboard/* است.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const result = await getObservabilitySnapshot();
    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: result.message ?? 'دسترسی ندارید' },
        },
        { status: 401 },
      );
    }
    return Response.json(
      { success: true, data: result.data },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    );
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: {
          code: 'INTERNAL',
          message: err instanceof Error ? err.message : 'خطای ناشناخته',
        },
      },
      { status: 500 },
    );
  }
}
