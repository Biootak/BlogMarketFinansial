import { getSystemReports } from '@/actions/reportActions';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
  try {
    // چک احراز هویت - فقط ادمین‌ها
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!['ADMIN', 'OWNER'].includes(userRole ?? '')) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { from, to } = body as { from?: unknown; to?: unknown };
    // 2026-07-08: validate dates — `new Date('garbage')` produced Invalid Date
    // and an uncaught 500 (cheap DoS). Also sanitize the filename to block
    // header/CRLF injection (H10).
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

    const result = await getSystemReports(fromDate, toDate);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    const { data } = result;

    if (!data) {
      return NextResponse.json({ error: 'داده‌ای یافت نشد' }, { status: 404 });
    }

    // تبدیل داده‌ها به فرمت مناسب برای اکسل
    const workbook = XLSX.utils.book_new();

    // صفحه آمار کاربران
    const userStats = [
      ['آمار کاربران'],
      ['تعداد کل', data.userStats.total],
      ['کاربران جدید این ماه', data.userStats.newThisMonth],
    ];
    const userSheet = XLSX.utils.aoa_to_sheet(userStats);
    XLSX.utils.book_append_sheet(workbook, userSheet, 'آمار کاربران');

    // صفحه آمار مطالب
    const postStats = [
      ['آمار مطالب'],
      ['تعداد کل', data.postStats.total],
      ['منتشر شده', data.postStats.published],
    ];
    const postSheet = XLSX.utils.aoa_to_sheet(postStats);
    XLSX.utils.book_append_sheet(workbook, postSheet, 'آمار مطالب');

    // صفحه آمار نظرات
    const commentStats = [
      ['آمار نظرات'],
      ['تعداد کل', data.commentStats.total],
      ['در انتظار تایید', data.commentStats.pending],
    ];
    const commentSheet = XLSX.utils.aoa_to_sheet(commentStats);
    XLSX.utils.book_append_sheet(workbook, commentSheet, 'آمار نظرات');

    // صفحه آمار بازدید
    const viewStats = [
      ['آمار بازدید'],
      ['تعداد کل', data.viewStats.total],
      ['امروز', data.viewStats.today],
    ];
    const viewSheet = XLSX.utils.aoa_to_sheet(viewStats);
    XLSX.utils.book_append_sheet(workbook, viewSheet, 'آمار بازدید');

    // تبدیل به باینری
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="system-report-${encodeURIComponent(String(from))}-to-${encodeURIComponent(String(to))}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error in download reports:', error);
    return NextResponse.json({ error: 'خطا در دانلود گزارش' }, { status: 500 });
  }
}
