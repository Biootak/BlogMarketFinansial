import { auth } from '@/auth';
import { publishAnnouncement } from '@/lib/communication';
/**
 * POST /api/communication/announcements/[id]/publish
 * انتشار فوری اعلان.
 */
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'احراز هویت نشده‌اید' } },
      { status: 401 },
    );
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی ندارید' } },
      { status: 403 },
    );
  }

  const result = await publishAnnouncement(id);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER', message: result.message ?? 'خطای سرور' } },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}
