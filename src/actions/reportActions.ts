'use server';

import { auth } from '@/auth';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { PostStatus, Role } from '@prisma/client';

interface UserStats {
  total: number;
  active: number;
  newThisMonth: number;
  roleDistribution: Array<{ name: string; value: number }>;
}

interface PostStats {
  total: number;
  published: number;
  draft: number;
  monthlyPosts: Array<{ month: string; count: number }>;
}

interface CommentStats {
  total: number;
  recent: number;
  monthly: Array<{ month: string; count: number }>;
}

interface ViewStats {
  total: number;
  monthly: Array<{ month: string; count: number }>;
  topPosts: Array<{ title: string; views: number }>;
}

interface SystemReport {
  userStats: UserStats;
  postStats: PostStats;
  commentStats: CommentStats;
  viewStats: ViewStats;
}

interface SystemStatus {
  cpu?: {
    usage: number;
    temperature?: number;
  };
  memory?: {
    total: number;
    used: number;
    free: number;
  };
  disk?: {
    total: number;
    used: number;
    free: number;
  };
  database?: {
    status: 'online' | 'offline' | 'error';
    connections: number;
    queryTime: number;
  };
  cache?: {
    status: 'online' | 'offline';
    hitRate: number;
  };
  lastUpdate?: string;
}

interface Activity {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  message?: string;
}

export async function checkReportAccess() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
    throw new Error('شما دسترسی لازم برای مشاهده گزارش‌ها را ندارید');
  }
}

export async function getSystemReports(): Promise<ActionResult<SystemReport>> {
  try {
    await checkReportAccess();

    // آمار کاربران
    const userStats = await db.$transaction(async (tx) => {
      const total = await tx.user.count();
      const active = await tx.user.count({
        where: { updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
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
          name: item.role === Role.SUPER_ADMIN ? 'مدیر کل' :
                item.role === Role.ADMIN ? 'مدیر' :
                item.role === Role.AUTHOR ? 'نویسنده' : 'کاربر',
          value: item._count
        }))
      };
    });

    // آمار مطالب
    const postStats = await db.$transaction(async (tx) => {
      const total = await tx.post.count();
      const published = await tx.post.count({ where: { status: PostStatus.PUBLISHED } });
      const draft = await tx.post.count({ where: { status: PostStatus.DRAFT } });
      
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

      return {
        total,
        published,
        draft,
        monthlyPosts: (monthlyPosts as any[]).map(item => ({
          month: new Date(item.month).toLocaleDateString('fa-IR', { month: 'short' }),
          count: Number(item.count)
        }))
      };
    });

    // آمار نظرات
    const commentStats = await db.$transaction(async (tx) => {
      const total = await tx.comment.count();
      const recent = await tx.comment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });
      
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
        recent,
        monthly: (monthly as any[]).map(item => ({
          month: new Date(item.month).toLocaleDateString('fa-IR', { month: 'short' }),
          count: Number(item.count)
        }))
      };
    });

    // آمار بازدیدها
    const viewStats = await db.$transaction(async (tx) => {
      const total = await tx.post.aggregate({
        _sum: {
          viewCount: true
        }
      });
      
      const monthly = await tx.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month,
               SUM("viewCount") as count
        FROM "Post"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
        LIMIT 12
      `;

      const topPosts = await tx.post.findMany({
        where: { status: PostStatus.PUBLISHED },
        select: {
          title: true,
          viewCount: true
        },
        orderBy: {
          viewCount: 'desc'
        },
        take: 5
      });

      return {
        total: total._sum.viewCount || 0,
        monthly: (monthly as any[]).map(item => ({
          month: new Date(item.month).toLocaleDateString('fa-IR', { month: 'short' }),
          count: Number(item.count)
        })),
        topPosts: topPosts.map(post => ({
          title: post.title,
          views: post.viewCount
        }))
      };
    });

    const data: SystemReport = {
      userStats,
      postStats,
      commentStats,
      viewStats
    };

    revalidatePath('/dashboard/reports');
    return { success: true, data };
  } catch (error) {
    console.error('Error in getSystemReports:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش‌های سیستم' 
    };
  }
}

export async function getSystemStatus(): Promise<ActionResult<SystemStatus>> {
  try {
    const response = await fetch('/api/system-status', {
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch system status');
    }

    revalidatePath('/dashboard/status');
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error in getSystemStatus:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'خطا در دریافت وضعیت سیستم' 
    };
  }
}

export async function getActivityLog(): Promise<ActionResult<Activity[]>> {
  try {
    await checkReportAccess();
    const data: Activity[] = [
      {
        id: '1',
        userEmail: 'admin@example.com',
        action: 'ورود',
        details: 'ورود موفق به سیستم',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        userEmail: 'writer@example.com',
        action: 'ایجاد مطلب',
        details: 'ایجاد مطلب جدید: راهنمای سرمایه‌گذاری',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        userEmail: 'editor@example.com',
        action: 'ویرایش',
        details: 'ویرایش مطلب: تحلیل تکنیکال',
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    revalidatePath('/dashboard/activity');
    return { success: true, data };
  } catch (error) {
    console.error('Error in getActivityLog:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش فعالیت‌ها' 
    };
  }
}
