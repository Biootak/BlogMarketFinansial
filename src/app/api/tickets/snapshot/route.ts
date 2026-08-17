import { getTicketMessages, getTicketSnapshot } from '@/lib/tickets';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 2026-08-17: پیام‌های تیکت دادهٔ خصوصی کاربر است — کش CDN ممنوع (Cloudflare
// Cache Rule همهٔ GETها را به‌جز /api/auth کش می‌کند).
const PRIVATE_HEADERS = { 'Cache-Control': 'no-store, private' };
export async function GET(request: Request) {
  try {
    const ticketId = new URL(request.url).searchParams.get('ticketId');
    if (ticketId) {
      const result = await getTicketMessages(ticketId);
      if (!result.success)
        return Response.json(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: result.message ?? 'دسترسی ندارید' },
          },
          { status: 401 },
        );
      return Response.json({ success: true, data: result.data }, { headers: PRIVATE_HEADERS });
    }
    const result = await getTicketSnapshot();
    if (!result.success)
      return Response.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: result.message ?? 'دسترسی ندارید' },
        },
        { status: 401 },
      );
    return Response.json({ success: true, data: result.data }, { headers: PRIVATE_HEADERS });
  } catch {
    return Response.json(
      { success: false, error: { code: 'INTERNAL', message: 'خطای داخلی سرور' } },
      { status: 500 },
    );
  }
}
