import { auth } from '@/auth';
import { deleteCampaign, updateCampaignStatus } from '@/lib/communication';
/**
 * PATCH  /api/communication/campaigns/[id]    — تغییر وضعیت کمپین (pause/resume/send)
 * DELETE /api/communication/campaigns/[id]    — حذف کمپین
 */
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PatchSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'paused']),
});

async function guard() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, status: 401, msg: 'احراز هویت نشده‌اید' };
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    return { ok: false as const, status: 403, msg: 'دسترسی ندارید' };
  }
  return { ok: true as const };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) {
    return NextResponse.json(
      {
        success: false,
        error: { code: g.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: g.msg },
      },
      { status: g.status },
    );
  }
  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_BODY', message: 'بدنه نامعتبر' } },
      { status: 400 },
    );
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION', message: 'وضعیت نامعتبر' } },
      { status: 400 },
    );
  }
  const result = await updateCampaignStatus(id, parsed.data.status);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER', message: result.message ?? 'خطای سرور' } },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) {
    return NextResponse.json(
      {
        success: false,
        error: { code: g.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: g.msg },
      },
      { status: g.status },
    );
  }
  const { id } = await params;
  const result = await deleteCampaign(id);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER', message: result.message ?? 'خطای سرور' } },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}
