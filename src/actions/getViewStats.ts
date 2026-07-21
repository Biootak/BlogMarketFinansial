'use server';

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

type ViewStatsResult =
  | {
      success: true;
      data: { labels: string[]; data: number[]; totalViews: number; todayViews: number };
    }
  | { success: false; error: string };

const FALLBACK: ViewStatsResult = {
  success: false,
  error: 'Failed to fetch view stats',
};

async function fetchViewStats(): Promise<ViewStatsResult> {
  // 2026-07-28: migrated from unstable_cache → safeCache for DB-resilience.
  // unstable_cache re-throws DB errors through the cache boundary, crashing
  // the dashboard. safeCache returns the stale value (or fallback) instead.
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

  for (const stat of viewStats) {
    const dayIndex = 6 - Math.floor((Date.now() - stat.date.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIndex >= 0 && dayIndex < 7) {
      data[dayIndex] += stat._sum.views || 0;
    }
  }

  return {
    success: true as const,
    data: {
      labels,
      data,
      totalViews: totalViews._sum.views || 0,
      todayViews: todayViews._sum.views || 0,
    },
  };
}

export const getViewStats = safeCache(fetchViewStats, FALLBACK, {
  key: 'view-stats',
  ttl: 120,
  tags: ['view-stats', 'pageview'],
});
