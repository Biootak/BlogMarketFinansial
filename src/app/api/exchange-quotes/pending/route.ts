/**
 * /api/exchange-quotes/pending
 * ----------------------------------------------------------------------------
 * quote های PENDING برای auto-refresh داشبورد ادمین.
 * B-PENDING-ROUTE fix: auth guard در سطح route اضافه شد.
 * قبلاً فقط به requireAdmin داخل getPendingQuotes تکیه می‌شد و route
 * خودش هیچ چکی نداشت — اگر action به اشتباه guard را حذف می‌کرد، route
 * باز می‌ماند. Defense-in-depth: هر دو لایه باید چک کنند.
 * ----------------------------------------------------------------------------
 */

import { getPendingQuotes } from '@/actions/exchange-quotes';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const PRIVATE_HEADERS = { 'Cache-Control': 'no-store, private' };

export async function GET() {
  // B-PENDING-ROUTE: auth guard در سطح route — defense-in-depth
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(role ?? '')) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
      { status: 403, headers: PRIVATE_HEADERS },
    );
  }

  try {
    const quotes = await getPendingQuotes();
    return NextResponse.json(
      {
        success: true,
        data: quotes.map((q) => ({
          ...q,
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
          expiresAt: q.expiresAt?.toISOString() ?? null,
          approvedAt: q.approvedAt?.toISOString() ?? null,
        })),
      },
      { headers: PRIVATE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: 'خطا در دریافت قیمت‌ها' } },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
