/**
 * GET  /api/backup   → لیست backup ها
 * DELETE /api/backup?filename=... → حذف یک backup
 * ─────────────────────────────────────────────────────────────
 *  فقط super admin.
 */

import { NextResponse } from 'next/server';
import { deleteBackup, getBackupStatus } from '@/actions/settingsActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const res = await getBackupStatus();
  if (!res.success) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: res.error ?? 'دسترسی غیرمجاز' } },
      { status: 403 },
    );
  }
  return NextResponse.json({ success: true, data: res.data });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');
  if (!filename) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'filename الزامی است' } },
      { status: 400 },
    );
  }
  const res = await deleteBackup(filename);
  if (!res.success) {
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_FAILED', message: res.error ?? 'خطا در حذف' } },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}
