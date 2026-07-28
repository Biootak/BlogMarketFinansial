import { getSystemHealthSnapshot } from '@/actions/liveOpsActions';

/**
 * GET /api/system-health
 * ─────────────────────────────────────────────────────────────
 *  Endpoint سریع برای polling از سمت کلاینت (مثلاً هر ۳۰ ثانیه).
 *  مصرف در LiveOpsPulse یا هر ابزار monitoring.
 *  بدون auth — این endpoint فقط وضعیت سرویس‌ها را برمی‌گرداند.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const snapshot = await getSystemHealthSnapshot();
    return Response.json(snapshot, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        ts: new Date().toISOString(),
        services: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
