import { checkReportAccess } from '@/actions/reportActions';
import { auth } from '@/auth';
import db from '@/lib/db';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

async function ensureReportAccess(): Promise<NextResponse | null> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'احراز هویت الزامی است' } },
      { status: 401 },
    );
  }
  // M2-fix: SUPERADMIN هم مثل OWNER است — قبلاً 403 می‌گرفت چون نه ADMIN بود
  // نه OWNER. ADMIN/OWNER/SUPERADMIN همه مجازند.
  if (!role || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
      { status: 403 },
    );
  }
  return null;
}

interface MonthlyStats {
  month: string | Date;
  count: string | number;
}

interface SystemReport {
  userStats: {
    total: number;
    active: number;
    newThisMonth: number;
    roleDistribution: Array<{
      name: string;
      value: number;
    }>;
  };
  postStats: {
    total: number;
    published: number;
    monthlyPosts: Array<{
      month: string;
      count: number;
    }>;
  };
  viewStats: {
    total: number;
    monthly: Array<{
      month: string;
      count: number;
    }>;
    topPosts: Array<{
      title: string;
      views: number;
      viewsFormatted: string;
    }>;
  };
}

export async function GET(): Promise<NextResponse> {
  const guard = await ensureReportAccess();
  if (guard) return guard;

  try {
    await checkReportAccess();

    const systemReport = await db.$transaction(
      async (tx) => {
        // Transaction with increased timeout and maxWait settings
        // User Statistics
        const total = await tx.user.count();
        const active = await tx.user.count({
          where: { status: 'Active' },
        });

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const newThisMonth = await tx.user.count({
          where: {
            createdAt: {
              gte: firstDayOfMonth,
            },
          },
        });

        const roleDistribution = await tx.user.groupBy({
          by: ['role'],
          _count: true,
        });

        // Post Statistics
        const totalPosts = await tx.post.count();
        const publishedPosts = await tx.post.count({
          where: { status: 'PUBLISHED' },
        });

        const monthlyPosts = await tx.$queryRaw<MonthlyStats[]>`
        SELECT DATE_TRUNC('month', "createdAt") as month,
             COUNT(*) as count
        FROM "Post"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
        LIMIT 12
        `;

        // View Statistics
        const totalViews = await tx.post.aggregate({
          _sum: {
            viewCount: true,
          },
        });

        const monthlyViews = await tx.$queryRaw<MonthlyStats[]>`
        SELECT DATE_TRUNC('month', "createdAt") as month,
             SUM("viewCount") as count
        FROM "Post"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
        LIMIT 12
        `;

        const topPosts = await tx.post.findMany({
          where: { status: 'PUBLISHED' },
          select: {
            title: true,
            viewCount: true,
          },
          orderBy: {
            viewCount: 'desc',
          },
          take: 5,
        });

        const formatNumber = (num: number) => {
          return new Intl.NumberFormat('fa-IR').format(num);
        };

        const formatDate = (date: Date) => {
          return date.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
          });
        };

        const report: SystemReport = {
          userStats: {
            total,
            active,
            newThisMonth,
            roleDistribution: roleDistribution.map((item) => ({
              name: item.role === 'ADMIN' ? 'مدیر' : item.role === 'USER' ? 'کاربر' : item.role,
              value: item._count,
            })),
          },
          postStats: {
            total: totalPosts,
            published: publishedPosts,
            monthlyPosts: monthlyPosts.map((item) => ({
              month: formatDate(new Date(item.month)),
              count: Number(item.count),
            })),
          },
          viewStats: {
            total: totalViews._sum.viewCount || 0,
            monthly: monthlyViews.map((item) => ({
              month: formatDate(new Date(item.month)),
              count: Number(item.count),
            })),
            topPosts: topPosts.map((post) => ({
              title: post.title,
              views: post.viewCount,
              viewsFormatted: formatNumber(post.viewCount),
            })),
          },
        };

        return report;
      },
      {
        timeout: 10000, // 10 seconds timeout
        maxWait: 5000, // 5 seconds maximum wait time
      },
    );

    return NextResponse.json({ success: true, data: systemReport });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'خطای دیتابیس' } },
        { status: 500 },
      );
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'داده نامعتبر' } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطا در دریافت گزارش‌های سیستم' },
      },
      { status: 500 },
    );
  }
}
