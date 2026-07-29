/**
 * GET /api/settings/api-keys
 * ─────────────────────────────────────────────────────────────
 *  لیست کلیدهای API — فقط metadata، بدون secret.
 *  فقط super admin.
 *
 *  این route از server action استفاده نمی‌کند چون باید از fetch سمت
 *  client لود شود (برای شمارش در sidebar).
 */

import { NextResponse } from 'next/server';
import { listApiKeys } from '@/actions/settingsActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const res = await listApiKeys();
  if (!res.success) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: res.error ?? 'دسترسی غیرمجاز' } },
      { status: 403 },
    );
  }
  return NextResponse.json({ success: true, data: res.data ?? [] });
}
