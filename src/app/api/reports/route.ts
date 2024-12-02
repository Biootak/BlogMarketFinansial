import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // آمار کاربران
    const userStats = await db.$transaction(async (tx) => {
      const total = await tx.user.count();
      const active = await tx.user.count({
        where: { lastLogin: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      });
      const newThisMonth = await tx.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      });
      const roleDistribution = await tx.user.groupBy({
        by: ['role'],
        _count: true
      });

      return {
        total,
        active,
        newThisMonth,
        roleDistribution: roleDistribution.map(item => ({
          name: item.role === 'SUPER_ADMIN' ? 'مدیر کل' :
                item.role === 'ADMIN' ? 'مدیر' :
                item.role === 'AUTHOR' ? 'نویسنده' : 'کاربر',
          value: item._count
        }))
      };
    });

    // آمار مطالب
    const postStats = await db.$transaction(async (tx) => {
      const total = await tx.post.count();
      const published = await tx.post.count({ where: { published: true } });
      const draft = await tx.post.count({ where: { published: false } });
      
      // آمار ماهانه
      const monthlyPosts = await tx.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month,
               COUNT(*) as count
        FROM "Post"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
        LIMIT 12
      `;

      // توزیع دسته‌بندی
      const categoryDistribution = await tx.post.groupBy({
        by: ['categoryId'],
        _count: true,
        where: { published: true }
      });

      const categories = await tx.category.findMany();
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      return {
        total,
        published,
        draft,
        monthlyPosts: monthlyPosts.map((item: any) => ({
          month: new Date(item.month).toLocaleDateString('fa-IR', { month: 'short' }),
          count: Number(item.count)
        })),
        categoryDistribution: categoryDistribution.map(item => ({
          name: categoryMap.get(item.categoryId) || 'نامشخص',
          value: item._count
        }))
      };
    });

    // آمار نظرات
    const commentStats = await db.$transaction(async (tx) => {
      const total = await tx.comment.count();
      const approved = await tx.comment.count({ where: { approved: true } });
      const pending = await tx.comment.count({ where: { approved: false } });
      
      const monthly = await tx.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month,
               COUNT(*) as count
        FROM "Comment"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
        LIMIT 12
      `;

      return {
        total,
        approved,
        pending,
        monthly: (monthly as any[]).map(item => ({
          month: new Date(item.month).toLocaleDateString('fa-IR', { month: 'short' }),
          count: Number(item.count)
        }))
      };
    });

    // آمار بازدیدها
    const viewStats = await db.$transaction(async (tx) => {
      const total = await tx.view.count();
      
      const monthly = await tx.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month,
               COUNT(*) as count
        FROM "View"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
        LIMIT 12
      `;

      const topPosts = await tx.post.findMany({
        where: { published: true },
        select: {
          title: true,
          _count: {
            select: { views: true }
          }
        },
        orderBy: {
          views: {
            _count: 'desc'
          }
        },
        take: 5
      });

      return {
        total,
        monthly: (monthly as any[]).map(item => ({
          month: new Date(item.month).toLocaleDateString('fa-IR', { month: 'short' }),
          count: Number(item.count)
        })),
        topPosts: topPosts.map(post => ({
          title: post.title,
          views: post._count.views
        }))
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        userStats,
        postStats,
        commentStats,
        viewStats
      }
    });

  } catch (error) {
    console.error('[REPORTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
