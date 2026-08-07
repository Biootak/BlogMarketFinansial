import { getTicketMessages, getTicketSnapshot } from '@/lib/tickets';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
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
      return Response.json({ success: true, data: result.data });
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
    return Response.json({ success: true, data: result.data });
  } catch {
    return Response.json(
      { success: false, error: { code: 'INTERNAL', message: 'خطای داخلی سرور' } },
      { status: 500 },
    );
  }
}
