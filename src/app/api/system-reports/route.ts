import { checkReportAccess } from '@/actions/reportActions';
import { reportService } from '@/lib/reports/reportService';
import { NextResponse } from 'next/server';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidate every 5 minutes

export async function GET() {
  try {
    await checkReportAccess();

    // استفاده از سرویس بهینه شده
    const report = await reportService.getDetailedReport();

    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('System reports error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'خطا در دریافت گزارش‌های سیستم',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}


