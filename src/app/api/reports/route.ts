import { getSystemReports } from '@/actions/reportActions';
import { auth } from '@/auth';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // بررسی دسترسی کاربر
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    // 2026-07-08: system reports expose aggregate user/post data — restrict
    // to ADMIN/OWNER (H9). The download route already enforces this.
    const role = (session.user as { role?: string }).role;
    if (role !== 'ADMIN' && role !== 'OWNER' && role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, message: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    // دریافت و تبدیل تاریخ‌ها
    const body = await req.json();
    const fromDate = body.from ? new Date(body.from) : undefined;
    const toDate = body.to ? new Date(body.to) : undefined;

    // دریافت گزارش‌ها
    const result = await getSystemReports(fromDate, toDate);

    // بازگرداندن نتیجه
    if (result.success) {
      const systemData = result.data;
      return NextResponse.json({
        success: true,
        data: {
          users: systemData?.userStats?.total || 0,
          activeUsers: systemData?.userStats?.active || 0,
          newUsers: systemData?.userStats?.newThisMonth || 0,
          posts: systemData?.postStats?.total || 0,
          publishedPosts: systemData?.postStats?.published || 0,
          comments: systemData?.commentStats?.total || 0,
          pendingComments: systemData?.commentStats?.pending || 0,
          views: systemData?.viewStats?.total || 0,
          todayViews: systemData?.viewStats?.today || 0,
        },
      });
    }
    return NextResponse.json(
      { success: false, message: result.message || 'خطا در دریافت گزارش‌ها' },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'خطا در دریافت گزارش‌ها',
      },
      { status: 500 },
    );
  }
}
