/**
 * POST /api/jobs/[id]/retry
 * بازنشانی یک job ناموفق و قرار دادن آن در صف.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { retryJob } from '@/lib/jobs';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'احراز هویت نشده‌اید' } },
      { status: 401 }
    );
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی ندارید' } },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'شناسه job الزامی است' } },
      { status: 400 }
    );
  }

  const result = await retryJob(id);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER', message: result.message ?? 'خطای سرور' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
