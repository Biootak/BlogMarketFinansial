import { checkReportAccess } from '@/actions/reportActions';
import { reportService } from '@/lib/reports/reportService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await checkReportAccess();

    reportService.clearCache();

    return NextResponse.json({
      success: true,
      message: 'کش گزارش‌ها با موفقیت پاک شد',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'خطا در پاک کردن کش',
      },
      { status: 500 },
    );
  }
}
