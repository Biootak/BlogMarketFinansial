import { getJobById } from '@/lib/jobs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/jobs/[id]
 * — Job detail برای Inspector (timeline, payload, result, error)
 * — Server-side، requireAdmin دارد. هیچ اطلاعات حساس بدون احراز هویت برنمی‌گردد.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getJobById(id);
  if (!result.success) {
    const status = result.message === 'job یافت نشد' ? 404 : 400;
    return Response.json(
      { success: false, error: { code: 'JOB_FETCH_FAILED', message: result.message } },
      { status },
    );
  }
  return Response.json(
    { success: true, data: result.data },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}
