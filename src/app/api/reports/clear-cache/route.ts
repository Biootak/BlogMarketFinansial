import { checkReportAccess } from '@/actions/reportActions';
import { reportCache } from '@/lib/reportCache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await checkReportAccess();

    // Clear all report cache
    reportCache.clear();

    return NextResponse.json({
      success: true,
      message: 'کش گزارش‌ها پاک شد',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'خطا در پاک کردن کش',
      },
      { status: 500 },
    );
  }
}
