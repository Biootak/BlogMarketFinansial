'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';

export const getViewStats = unstable_cache(
  async () => {
    try {
      // 2026-06-14: 3 sequential reads collapsed into one Promise.all.
      // Was 3 round-trips wall-clock serial; now they overlap.
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

      const [viewStats, todayViews, totalViews] = await Promise.all([
        prisma.pageView.groupBy({
          by: ['date'],
          where: { createdAt: { gte: sevenDaysAgo } },
          _sum: { views: true },
          orderBy: { date: 'asc' },
        }),
        prisma.pageView.aggregate({
          _sum: { views: true },
          where: { createdAt: { gte: startOfToday } },
        }),
        prisma.pageView.aggregate({ _sum: { views: true } }),
      ]);

      const labels = ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه', 'یکشنبه'];
      const data = new Array(7).fill(0);

      viewStats.forEach((stat) => {
        const dayIndex = 6 - Math.floor((Date.now() - stat.date.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < 7) {
          data[dayIndex] += stat._sum.views || 0;
        }
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
  },
  ['view-stats', 'v1-2026-06-14'],
  {
    // 2 minutes is enough for a dashboard widget.
    revalidate: 120,
    tags: ['view-stats', 'pageview'],
  },
);
