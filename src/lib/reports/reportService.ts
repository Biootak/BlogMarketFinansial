/**
 * Advanced Report Service
 * سرویس گزارش‌دهی با بهینه‌سازی و کش
 */

import db from '@/lib/db';
import { cache } from '@/lib/cache';

export interface DetailedSystemReport {
  timestamp: string;
  performance: {
    queryTime: number;
    cacheHit: boolean;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    byRole: Array<{ role: string; count: number; percentage: number }>;
    growthRate: number;
  };
  posts: {
    total: number;
    published: number;
    draft: number;
    pendingReview: number;
    byType: Array<{ type: string; count: number }>;
    avgViewsPerPost: number;
    topAuthors: Array<{ name: string; postCount: number; totalViews: number }>;
    recentActivity: Array<{ date: string; count: number }>;
  };
  comments: {
    total: number;
    approved: number;
    pending: number;
    todayCount: number;
    avgPerPost: number;
  };
  views: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    topPosts: Array<{ title: string; slug: string; views: number }>;
    trend: Array<{ date: string; views: number }>;
  };
  engagement: {
    totalLikes: number;
    totalSaves: number;
    avgEngagementRate: number;
  };
  system: {
    database: {
      size: string;
      tables: number;
    };
    cache: {
      size: number;
      keys: string[];
    };
  };
}

class ReportService {
  private readonly CACHE_TTL = 300; // 5 دقیقه
  private readonly CACHE_KEY_PREFIX = 'report:';

  /**
   * دریافت گزارش کامل سیستم
   */
  async getDetailedReport(): Promise<DetailedSystemReport> {
    const startTime = Date.now();
    const cacheKey = `${this.CACHE_KEY_PREFIX}detailed`;

    // بررسی کش
    const cached = cache.get<DetailedSystemReport>(cacheKey);
    if (cached) {
      cached.performance.cacheHit = true;
      return cached;
    }

    // محاسبه تاریخ‌ها
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // اجرای کوئری‌ها به صورت موازی
    const [
      userStats,
      postStats,
      commentStats,
      viewStats,
      engagementStats,
    ] = await Promise.all([
      this.getUserStats(today, weekAgo, monthAgo),
      this.getPostStats(),
      this.getCommentStats(today),
      this.getViewStats(today, weekAgo, monthAgo),
      this.getEngagementStats(),
    ]);

    const queryTime = Date.now() - startTime;

    const report: DetailedSystemReport = {
      timestamp: new Date().toISOString(),
      performance: {
        queryTime,
        cacheHit: false,
      },
      users: userStats,
      posts: postStats,
      comments: commentStats,
      views: viewStats,
      engagement: engagementStats,
      system: {
        database: {
          size: 'N/A',
          tables: 0,
        },
        cache: cache.getStats(),
      },
    };

    // ذخیره در کش
    cache.set(cacheKey, report, this.CACHE_TTL);

    return report;
  }

  /**
   * آمار کاربران
   */
  private async getUserStats(today: Date, weekAgo: Date, monthAgo: Date) {
    const [total, active, newToday, newThisWeek, newThisMonth, roleDistribution] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { status: 'Active' } }),
        db.user.count({ where: { createdAt: { gte: today } } }),
        db.user.count({ where: { createdAt: { gte: weekAgo } } }),
        db.user.count({ where: { createdAt: { gte: monthAgo } } }),
        db.user.groupBy({
          by: ['role'],
          _count: true,
        }),
      ]);

    const inactive = total - active;
    const growthRate = total > 0 ? (newThisMonth / total) * 100 : 0;

    return {
      total,
      active,
      inactive,
      newToday,
      newThisWeek,
      newThisMonth,
      byRole: roleDistribution.map((item) => ({
        role: item.role,
        count: item._count,
        percentage: (item._count / total) * 100,
      })),
      growthRate: Number(growthRate.toFixed(2)),
    };
  }

  /**
   * آمار پست‌ها
   */
  private async getPostStats() {
    const [total, statusCounts, typeCounts, topAuthors, recentPosts, totalViews] =
      await Promise.all([
        db.post.count(),
        db.post.groupBy({
          by: ['status'],
          _count: true,
        }),
        db.post.groupBy({
          by: ['postType'],
          _count: true,
        }),
        db.post.groupBy({
          by: ['authorId'],
          _count: true,
          _sum: { viewCount: true },
          orderBy: { _count: { authorId: 'desc' } },
          take: 5,
        }),
        db.post.findMany({
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        db.post.aggregate({
          _sum: { viewCount: true },
        }),
      ]);

    const published = statusCounts.find((s) => s.status === 'PUBLISHED')?._count || 0;
    const draft = statusCounts.find((s) => s.status === 'DRAFT')?._count || 0;
    const pendingReview = statusCounts.find((s) => s.status === 'PENDING_REVIEW')?._count || 0;

    // محاسبه فعالیت اخیر (گروه‌بندی بر اساس روز)
    const activityMap = new Map<string, number>();
    recentPosts.forEach((post) => {
      const date = post.createdAt.toISOString().split('T')[0];
      activityMap.set(date, (activityMap.get(date) || 0) + 1);
    });

    const recentActivity = Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    // دریافت اطلاعات نویسندگان برتر
    const authorIds = topAuthors.map((a) => a.authorId);
    const authors = await db.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });

    const topAuthorsWithNames = topAuthors.map((author) => ({
      name: authors.find((a) => a.id === author.authorId)?.name || 'نامشخص',
      postCount: author._count,
      totalViews: author._sum.viewCount || 0,
    }));

    return {
      total,
      published,
      draft,
      pendingReview,
      byType: typeCounts.map((item) => ({
        type: item.postType,
        count: item._count,
      })),
      avgViewsPerPost: total > 0 ? (totalViews._sum.viewCount || 0) / total : 0,
      topAuthors: topAuthorsWithNames,
      recentActivity,
    };
  }

  /**
   * آمار نظرات
   */
  private async getCommentStats(today: Date) {
    const [total, approved, todayCount] = await Promise.all([
      db.comment.count(),
      db.comment.count({ where: { approved: true } }),
      db.comment.count({ where: { createdAt: { gte: today } } }),
    ]);

    const pending = total - approved;
    const postCount = await db.post.count();
    const avgPerPost = postCount > 0 ? total / postCount : 0;

    return {
      total,
      approved,
      pending,
      todayCount,
      avgPerPost: Number(avgPerPost.toFixed(2)),
    };
  }

  /**
   * آمار بازدیدها
   */
  private async getViewStats(today: Date, weekAgo: Date, monthAgo: Date) {
    const [totalViews, todayViews, weekViews, monthViews, topPosts, dailyViews] =
      await Promise.all([
        db.post.aggregate({ _sum: { viewCount: true } }),
        db.view.count({ where: { createdAt: { gte: today } } }),
        db.view.count({ where: { createdAt: { gte: weekAgo } } }),
        db.view.count({ where: { createdAt: { gte: monthAgo } } }),
        db.post.findMany({
          where: { status: 'PUBLISHED' },
          select: { title: true, slug: true, viewCount: true },
          orderBy: { viewCount: 'desc' },
          take: 10,
        }),
        db.view.groupBy({
          by: ['createdAt'],
          _count: true,
          where: { createdAt: { gte: monthAgo } },
        }),
      ]);

    // گروه‌بندی بازدیدها بر اساس روز
    const viewsByDay = new Map<string, number>();
    dailyViews.forEach((view) => {
      const date = view.createdAt.toISOString().split('T')[0];
      viewsByDay.set(date, (viewsByDay.get(date) || 0) + view._count);
    });

    const trend = Array.from(viewsByDay.entries())
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: totalViews._sum.viewCount || 0,
      today: todayViews,
      thisWeek: weekViews,
      thisMonth: monthViews,
      topPosts: topPosts.map((post) => ({
        title: post.title,
        slug: post.slug,
        views: post.viewCount,
      })),
      trend,
    };
  }

  /**
   * آمار تعامل
   */
  private async getEngagementStats() {
    const [totalLikes, totalSaves, postCount] = await Promise.all([
      db.like.count(),
      db.savedPost.count(),
      db.post.count({ where: { status: 'PUBLISHED' } }),
    ]);

    const avgEngagementRate =
      postCount > 0 ? ((totalLikes + totalSaves) / postCount) * 100 : 0;

    return {
      totalLikes,
      totalSaves,
      avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
    };
  }

  /**
   * پاک کردن کش گزارش‌ها
   */
  clearCache(): void {
    cache.deletePattern(this.CACHE_KEY_PREFIX);
  }
}

export const reportService = new ReportService();
