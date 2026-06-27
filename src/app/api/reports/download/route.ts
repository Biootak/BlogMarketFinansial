import { NextResponse } from 'next/server';
import { getSystemReports } from '@/actions/reportActions';
import { auth } from '@/auth';
import * as XLSX from 'xlsx';

export async function POST(req: Request) {
  try {
    // چک احراز هویت - فقط ادمین‌ها
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { from, to } = await req.json();
    
    const result = await getSystemReports(new Date(from), new Date(to));
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    const { data } = result;
    
    if (!data) {
      return NextResponse.json({ error: "داده‌ای یافت نشد" }, { status: 404 });
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
        'Content-Disposition': `attachment; filename=system-report-${from}-to-${to}.xlsx`,
      },
    });
  } catch (error) {
    console.error('Error in download reports:', error);
    return NextResponse.json(
      { error: 'خطا در دانلود گزارش' },
      { status: 500 }
    );
  }
}
