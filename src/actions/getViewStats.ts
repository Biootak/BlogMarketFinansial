'use server';

import prisma from '@/lib/db';

export async function getViewStats() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const viewStats = await prisma.pageView.groupBy({
      by: ['date'],
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      _sum: {
        views: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const labels = ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه', 'یکشنبه'];
    const data = new Array(7).fill(0);

    viewStats.forEach((stat) => {
      const dayIndex = 6 - Math.floor((Date.now() - stat.date.getTime()) / (24 * 60 * 60 * 1000));
      if (dayIndex >= 0 && dayIndex < 7) {
        data[dayIndex] += stat._sum.views || 0;
      }
    });

    const todayViews = await prisma.pageView.aggregate({
      _sum: {
        views: true,
      },
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const totalViews = await prisma.pageView.aggregate({
      _sum: {
        views: true,
      },
    });

    return {
      success: true,
      data: {
        labels,
        data,
        totalViews: totalViews._sum.views || 0,
        todayViews: todayViews._sum.views || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching view stats:', error);
    return { success: false, error: 'Failed to fetch view stats' };
  }
}
