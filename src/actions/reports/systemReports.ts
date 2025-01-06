'use server';

import db from '@/lib/db';
import { checkReportAccess } from './auth';
import type { ActionResult, SystemReport } from './types';


export async function getSystemReports(): Promise<ActionResult<SystemReport>> {
  try {
    await checkReportAccess();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // Get user statistics
    const [totalUsers, activeUsers, newUsers, roleStats] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: 'Active' } }),
      db.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.user.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    // Get post statistics
    const [totalPosts, publishedPosts, draftPosts, monthlyPosts] = await Promise.all([
      db.post.count(),
      db.post.count({ where: { status: 'PUBLISHED' } }),
      db.post.count({ where: { status: 'DRAFT' } }),
      db.post.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: lastYear } },
        _count: true,
      }),
    ]);

    // Get comment statistics
    const [totalComments, recentComments, monthlyComments] = await Promise.all([
      db.comment.count(),
      db.comment.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.comment.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: lastYear } },
        _count: true,
      }),
    ]);

    // Get view statistics
    const [totalViews, monthlyViews, topPosts] = await Promise.all([
      db.pageView.aggregate({ _sum: { views: true } }),
      db.pageView.groupBy({
        by: ['date'],
        where: { date: { gte: lastYear } },
        _sum: { views: true },
      }),
      db.post.findMany({
        select: { title: true, viewCount: true },
        orderBy: { viewCount: 'desc' },
        take: 5,
      }),
    ]);

    return {
      success: true,
      data: {
        userStats: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsers,
          roleDistribution: roleStats.map(stat => ({
            name: stat.role,
            value: stat._count,
          })),
        },
        postStats: {
          total: totalPosts,
          published: publishedPosts,
          draft: draftPosts,
          monthlyPosts: monthlyPosts.map(stat => ({
            month: stat.createdAt.toISOString().slice(0, 7),
            count: stat._count,
          })),
        },
        commentStats: {
          total: totalComments,
          recent: recentComments,
          monthly: monthlyComments.map(stat => ({
            month: stat.createdAt.toISOString().slice(0, 7),
            count: stat._count,
          })),
        },
        viewStats: {
          total: totalViews._sum.views || 0,
          monthly: monthlyViews.map(stat => ({
            month: stat.date.toISOString().slice(0, 7),
            count: stat._sum.views || 0,
          })),
          topPosts: topPosts.map(post => ({
            title: post.title,
            views: post.viewCount,
          })),
        },
      },
    };
  } catch (error) {
    console.error('Error in getSystemReports:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش‌های سیستم',
    };
  }
}
