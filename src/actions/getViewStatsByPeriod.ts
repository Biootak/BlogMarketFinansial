'use server';

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

// 2026-07-28: migrated from unstable_cache → safeCache.
// getViewStatsByPeriod was crashing the dashboard chart on DB errors.
// safeCache returns stale data or the empty fallback instead.

export interface ViewStatsByPeriod {
  labels: string[];
  data: number[];
  totalViews: number;
  todayViews: number;
  periodDays: number;
}

export type PeriodId = '7d' | '30d' | '90d';

const PERIOD_DAYS: Record<PeriodId, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const PERSIAN_WEEKDAYS = ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه', 'یکشنبه'];

/**
 * Format a Date as a short Persian (Jalali) label.
 * Uses Intl with `persian` calendar — no external dependency needed.
 */
function formatJalaliShort(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    calendar: 'persian',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

const FALLBACK = {
  success: false as const,
  error: 'Failed to fetch view stats',
};

async function fetchViewStatsByPeriod(period: PeriodId): Promise<{
  success: boolean;
  data?: ViewStatsByPeriod;
  error?: string;
}> {
  const days = PERIOD_DAYS[period];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

  const [viewStats, todayViews, totalViews] = await Promise.all([
    prisma.pageView.groupBy({
      by: ['date'],
      where: { createdAt: { gte: since } },
      _sum: { views: true },
      orderBy: { date: 'asc' },
    }),
    prisma.pageView.aggregate({
      _sum: { views: true },
      where: { createdAt: { gte: startOfToday } },
    }),
    prisma.pageView.aggregate({ _sum: { views: true } }),
  ]);

  // Build one bucket per day, oldest → newest.
  const now = Date.now();
  const buckets = new Array(days).fill(0);
  const labels: string[] = [];

  for (let i = 0; i < days; i++) {
    const dayDate = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000);
    if (days <= 7) {
      // 7d: weekday names (same as getViewStats for backward compat).
      const jsDay = dayDate.getDay(); // 0=Sun..6=Sat
      const persianIndex = (jsDay + 1) % 7; // 0=Saturday..6=Friday
      labels.push(PERSIAN_WEEKDAYS[persianIndex]);
    } else {
      labels.push(formatJalaliShort(dayDate));
    }
  }

  for (const stat of viewStats) {
    const dayIndex = days - 1 - Math.floor((now - stat.date.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIndex >= 0 && dayIndex < days) {
      buckets[dayIndex] += stat._sum.views || 0;
    }
  }

  return {
    success: true,
    data: {
      labels,
      data: buckets,
      totalViews: totalViews._sum.views || 0,
      todayViews: todayViews._sum.views || 0,
      periodDays: days,
    },
  };
}

export const getViewStatsByPeriod = safeCache(fetchViewStatsByPeriod, FALLBACK, {
  key: 'view-stats-by-period',
  ttl: 120,
  tags: ['view-stats', 'pageview'],
});
