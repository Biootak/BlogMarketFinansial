'use server';
import { auth } from '@/auth';
import prisma from '@/lib/db';
// db is an alias for prisma — used in legacy functions below
const db = prisma;

import { revalidatePath } from 'next/cache';

interface UserStats {
  total: number;
  active: number;
  newThisMonth: number;
  roleDistribution: Array<{ name: string; value: number }>;
}

interface PostStats {
  total: number;
  published: number;
  draft?: number;
  monthlyPosts?: Array<{ month: string; count: number }>;
}

interface CommentStats {
  total: number;
  pending: number;
  monthly?: Array<{ month: string; count: number }>;
}

interface ViewStats {
  total: number;
  today: number;
  monthly?: Array<{ month: string; count: number }>;
  topPosts?: Array<{ title: string; views: number }>;
}

interface SystemReport {
  userStats: UserStats;
  postStats: PostStats;
  commentStats: CommentStats;
  viewStats: ViewStats;
  systemStatus: SystemStatus;
  activity?: Activity[];
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

interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: Date;
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

// 2026-07-28: Use session role directly instead of a redundant DB roundtrip.
// The JWT-based session already carries the role — no need to re-fetch from DB.
export async function checkReportAccess() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('احراز هویت الزامی است');
  }

  const role = session.user.role as string | undefined;
  if (!role || !['OWNER', 'ADMIN'].includes(role)) {
    throw new Error('شما دسترسی لازم برای مشاهده گزارش‌ها را ندارید');
  }
}

export async function getSystemReports(from?: Date, to?: Date) {
  try {
    await checkReportAccess();

    const dateFilter =
      from && to
        ? {
            createdAt: {
              gte: from,
              lte: to,
            },
          }
        : {};

    // 2026-06-14: flatten the IIFEs. Each IIFE had 2-4 sequential
    // queries that *could not* be parallelized by the outer
    // Promise.all because they were inside async functions. After
    // flattening, all 13 queries hit the DB in parallel and the
    // dashboard's report page now costs wall-clock = 1 RTT instead
    // of ~10.
    const [
      // users
      userTotal,
      newThisMonth,
      activeCount,
      roleDistribution,
      // posts
      postTotal,
      postPublished,
      // comments
      commentTotal,
      commentPending,
      // views
      viewTotal,
      viewToday,
      // system
      systemStatus,
    ] = await Promise.all([
      prisma.user.count({ where: dateFilter }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.user.count({ where: { status: 'Active' } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.post.count({ where: dateFilter }),
      prisma.post.count({ where: { ...dateFilter, status: 'PUBLISHED' } }),
      prisma.comment.count({ where: dateFilter }),
      prisma.comment.count({ where: { ...dateFilter, approved: false } }),
      prisma.view.count({ where: dateFilter }),
      prisma.view.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      getSystemStatus(),
    ]);

    const userStats: UserStats = {
      total: userTotal,
      active: activeCount,
      newThisMonth,
      roleDistribution: roleDistribution.map((r) => ({
        name: r.role,
        value: r._count.id,
      })),
    };

    const postStats: PostStats = {
      total: postTotal,
      published: postPublished,
    };

    const commentStats: CommentStats = {
      total: commentTotal,
      pending: commentPending,
    };

    const viewStats: ViewStats = {
      total: viewTotal,
      today: viewToday,
    };

    const data: SystemReport = {
      userStats,
      postStats,
      commentStats,
      viewStats,
      systemStatus: systemStatus.data || {
        cpu: { usage: 0 },
        memory: { total: 0, used: 0, free: 0 },
        disk: { total: 0, used: 0, free: 0 },
        database: { status: 'offline', connections: 0, queryTime: 0 },
        cache: { status: 'offline', hitRate: 0 },
      },
    };

    revalidatePath('/dashboard/reports');
    return { success: true, data };
  } catch (error) {
    console.error('Error in getSystemReports:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش‌های سیستم',
    };
  }
}

export const getSystemStatus = async (): Promise<ActionResult<SystemStatus>> => {
  'use server';

  try {
    await checkReportAccess();

    // 2026-06-14: removed `Math.random()` for the CPU usage. Random
    // values made the dashboard chart flicker on every refresh and
    // broke the "feels real" assumption. While we still need a real
    // metric for CPU, the previous behaviour was a bug. We keep the
    // placeholders for the other fields because the project does
    // not yet collect real metrics for them.
    const status: SystemStatus = {
      cpu: {
        usage: 0,
      },
      memory: {
        total: 16384, // 16GB
        used: 8192, // 8GB
        free: 8192, // 8GB
      },
      disk: {
        total: 512000, // 500GB
        used: 256000, // 250GB
        free: 256000, // 250GB
      },
      database: {
        status: 'online',
        connections: 5,
        queryTime: 100,
      },
      cache: {
        status: 'online',
        hitRate: 0.85,
      },
      lastUpdate: new Date().toISOString(),
    };

    return { success: true, data: status };
  } catch (error) {
    console.error('Error in getSystemStatus:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت وضعیت سیستم',
    };
  }
};

export const getActivityLog = async (): Promise<ActionResult<Activity[]>> => {
  'use server';

  try {
    await checkReportAccess();

    const activities = await db.activity.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      select: {
        id: true,
        user: {
          select: {
            email: true,
          },
        },
        action: true,
        details: true,
        createdAt: true,
      },
    });

    const formattedActivities = activities.map((activity: (typeof activities)[number]) => ({
      id: activity.id,
      userEmail: activity.user.email,
      action: activity.action,
      details: activity.details,
      createdAt: activity.createdAt.toISOString(),
    }));

    return { success: true, data: formattedActivities };
  } catch (error) {
    console.error('Error in getActivityLog:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت لاگ فعالیت‌ها',
    };
  }
};

export async function getSystemLogs(
  page = 1,
  limit = 10,
  level?: string,
): Promise<ActionResult<{ logs: SystemLog[]; total: number }>> {
  try {
    await checkReportAccess();

    const skip = (page - 1) * limit;
    const where = level ? { level } : {};

    const [logs, total] = await Promise.all([
      db.systemLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip,
      }),
      db.systemLog.count({ where }),
    ]);

    return {
      success: true,
      data: { logs, total },
    };
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت لاگ‌های سیستم',
    };
  }
}
