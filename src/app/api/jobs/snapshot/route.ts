import { getJobSnapshot } from '@/lib/jobs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const result = await getJobSnapshot();
    if (!result.success) {
      return Response.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: result.message ?? 'دسترسی ندارید' } },
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
