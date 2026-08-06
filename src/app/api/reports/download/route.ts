import { getSystemReports } from '@/actions/reportActions';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const MAX_REPORT_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    const userRole = session.user.role ?? '';
    if (!['ADMIN', 'OWNER', 'SUPERADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { from, to } = body as { from?: unknown; to?: unknown };
    const fromDate = typeof from === 'string' ? new Date(from) : null;
    const toDate = typeof to === 'string' ? new Date(to) : null;
    if (
      !fromDate ||
      !toDate ||
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime())
    ) {
      return NextResponse.json({ error: 'تاریخ نامعتبر است' }, { status: 400 });
    }
    if (fromDate > toDate || toDate.getTime() - fromDate.getTime() > MAX_REPORT_RANGE_MS) {
      return NextResponse.json(
        { error: 'بازه گزارش نامعتبر یا بیش از یک سال است' },
        { status: 400 },
      );
    }

    const result = await getSystemReports(fromDate, toDate);
    if (!result.success) return NextResponse.json({ error: result.message }, { status: 400 });
    if (!result.data) return NextResponse.json({ error: 'داده‌ای یافت نشد' }, { status: 404 });

    const { data } = result;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['آمار کاربران'],
        ['تعداد کل', data.userStats.total],
        ['کاربران جدید این ماه', data.userStats.newThisMonth],
      ]),
      'آمار کاربران',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['آمار مطالب'],
        ['تعداد کل', data.postStats.total],
        ['منتشر شده', data.postStats.published],
      ]),
      'آمار مطالب',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['آمار نظرات'],
        ['تعداد کل', data.commentStats.total],
        ['در انتظار تایید', data.commentStats.pending],
      ]),
      'آمار نظرات',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['آمار بازدید'],
        ['تعداد کل', data.viewStats.total],
        ['امروز', data.viewStats.today],
      ]),
      'آمار بازدید',
    );

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `system-report-${fromDate.toISOString().slice(0, 10)}-to-${toDate.toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دانلود گزارش' }, { status: 500 });
  }
}
