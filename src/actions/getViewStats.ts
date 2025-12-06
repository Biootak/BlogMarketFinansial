'use server';

import prisma from '@/lib/db';

export async function getViewStats() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // استفاده از View model برای آمار دقیق‌تر
    const viewStats = await prisma.view.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const labels = ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه', 'یکشنبه'];
    const data = new Array(7).fill(0);

    // گروه‌بندی بازدیدها بر اساس روز
    viewStats.forEach((stat) => {
      const statDate = new Date(stat.createdAt);
      statDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - statDate.getTime()) / (24 * 60 * 60 * 1000));
      const dayIndex = 6 - daysDiff;

      if (dayIndex >= 0 && dayIndex < 7) {
        data[dayIndex] += stat._count.id;
      }
    });

    // بازدیدهای امروز
    const todayViews = await prisma.view.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    // کل بازدیدها از Post.viewCount
    const totalViewsResult = await prisma.post.aggregate({
      _sum: {
        viewCount: true,
      },
      where: {
        status: 'PUBLISHED',
      },
    });

    return {
      success: true,
      data: {
        labels,
        data,
        totalViews: totalViewsResult._sum.viewCount || 0,
        todayViews,
      },
    };
  } catch (error) {
    console.error('Error fetching view stats:', error);
    return { success: false, error: 'Failed to fetch view stats' };
  }
}
