/**
 * GET /api/backup/download?filename=backup_...json
 * ─────────────────────────────────────────────────────────────
 * دانلود یک فایل backup به صورت JSON.
 * فقط super admin.
 *
 * امنیت:
 *  - filename در readBackup اعتبارسنجی می‌شود (path traversal blocked)
 *  - Content-Disposition: attachment → مرورگر را مجبور به دانلود می‌کند
 *  - X-Content-Type-Options: nosniff → sniffing مسدود
 */

import { jsonReplacer, readBackup } from '@/lib/backup';
import { requireSuperAdmin } from '@/lib/require-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  // auth
  const check = await requireSuperAdmin();
  if (!check.success) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
      { status: check.status },
    );
  }

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'filename الزامی است' } },
      { status: 400 },
    );
  }

  const envelope = await readBackup(filename);
  if (!envelope) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'فایل یافت نشد' } },
      { status: 404 },
    );
  }

  const body = JSON.stringify(envelope, jsonReplacer, 2);

  // RFC 5987: encode filename برای جلوگیری از مشکل کاراکترهای خاص
  const safeFilename = encodeURIComponent(filename);

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${safeFilename}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
