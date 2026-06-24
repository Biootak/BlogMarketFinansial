import { checkReportAccess } from '@/actions/reportActions';
import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';


interface MonthlyStats {
  month: Date;
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

export async function GET(): Promise<NextResponse<SystemReport | { error: string }>> {
  try {
    await checkReportAccess();

    const systemReport = await db.$transaction(async (tx) => {
      // Transaction with increased timeout and maxWait settings
      // User Statistics
      const total = await tx.user.count();
      const active = await tx.user.count({
        where: { status: 'Active' }
      });

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const newThisMonth = await tx.user.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth
          }
        }
      });

      const roleDistribution = await tx.user.groupBy({
        by: ['role'],
        _count: true
      });

      // Post Statistics
      const totalPosts = await tx.post.count();
      const publishedPosts = await tx.post.count({
        where: { status: 'PUBLISHED' }
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
          viewCount: true
        }
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
          viewCount: true
        },
        orderBy: {
          viewCount: 'desc'
        },
        take: 5
        });

        const formatNumber = (num: number) => {
        return new Intl.NumberFormat('fa-IR').format(num);
        };

        const formatDate = (date: Date) => {
        return date.toLocaleDateString('fa-IR', {
          year: 'numeric',
          month: 'long'
        });
        };

        const report: SystemReport = {
        userStats: {
          total,
          active,
          newThisMonth,
          roleDistribution: roleDistribution.map(item => ({
          name: item.role === 'ADMIN' ? 'مدیر' : 
              item.role === 'USER' ? 'کاربر' : item.role,
          value: item._count
          }))
        },
        postStats: {
          total: totalPosts,
          published: publishedPosts,
          monthlyPosts: monthlyPosts.map(item => ({
          month: formatDate(new Date(item.month)),
          count: Number(item.count)
          }))
        },
        viewStats: {
          total: totalViews._sum.viewCount || 0,
          monthly: monthlyViews.map(item => ({
          month: formatDate(new Date(item.month)),
          count: Number(item.count)
          })),
          topPosts: topPosts.map(post => ({
          title: post.title,
          views: post.viewCount,
          viewsFormatted: formatNumber(post.viewCount)
          }))
        }
      };

        return report;
      }, {
        timeout: 10000, // 10 seconds timeout
        maxWait: 5000,  // 5 seconds maximum wait time
      });

    return NextResponse.json(systemReport);
  } catch (error) {
    console.error('System reports error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors
      return NextResponse.json(
      { error: 'Database operation failed', code: error.code },
      { status: 500 }
      );
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      // Handle validation errors
      return NextResponse.json(
      { error: 'Invalid data provided to database' },
      { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت گزارش‌های سیستم' },
      { status: 500 }
    );
  }
}
