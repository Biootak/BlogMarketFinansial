import { getApprovalSnapshot } from '@/lib/approvals';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 2026-08-17: دادهٔ خصوصی ادمین — کش CDN ممنوع (Cloudflare Cache Rule همهٔ
// GETها را به‌جز /api/auth کش می‌کند).
const PRIVATE_HEADERS = { 'Cache-Control': 'no-store, private' };

export async function GET() {
  try {
    const result = await getApprovalSnapshot();
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
      { status: 200, headers: PRIVATE_HEADERS },
    );
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: { code: 'INTERNAL', message: err instanceof Error ? err.message : 'خطای ناشناخته' },
      },
      { status: 500 },
    );
  }
}
