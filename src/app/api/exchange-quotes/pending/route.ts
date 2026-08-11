/**
 * /api/exchange-quotes/pending
 * ----------------------------------------------------------------------------
 * quote های PENDING برای auto-refresh داشبورد ادمین.
 * نیاز به session دارد (admin check در server action).
 * ----------------------------------------------------------------------------
 */

import { getPendingQuotes } from '@/actions/exchange-quotes';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const quotes = await getPendingQuotes();
    return NextResponse.json({
      success: true,
      data: quotes.map((q) => ({
        ...q,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
        expiresAt: q.expiresAt?.toISOString() ?? null,
        approvedAt: q.approvedAt?.toISOString() ?? null,
      })),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: 'خطا در دریافت قیمت‌ها' } },
      { status: 500 },
    );
  }
}
