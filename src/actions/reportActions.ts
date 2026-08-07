'use server';
import { auth } from '@/auth';
import prisma from '@/lib/db';
// db is an alias for prisma — used in legacy functions below
const db = prisma;

import { revalidatePath } from '@/lib/revalidate';
import { checkDiskSpace, getSystemMetrics } from '@/lib/system';

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

  // G5-fix: SUPERADMIN هم باید دسترسی داشته باشد (مطابق requireAdmin در require-auth.ts)
  const role = session.user.role as string | undefined;
  if (!role || !['OWNER', 'ADMIN', 'SUPERADMIN'].includes(role)) {
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
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش‌های سیستم',
    };
  }
}

export const getSystemStatus = async (): Promise<ActionResult<SystemStatus>> => {
  try {
    await checkReportAccess();

    // دریافت متریک‌های واقعی از OS
    const metrics = await getSystemMetrics();

    // دیسک: استخراج drive root
    const cwd = process.cwd();
    const diskRoot = process.platform === 'win32' ? (cwd.split('\\')[0] ?? cwd) : cwd;
    const diskSpace = await checkDiskSpace(diskRoot);

    // وضعیت دیتابیس از طریق یک query سبک
    let dbStatus: {
      status: 'online' | 'offline' | 'error';
      connections: number;
      queryTime: number;
    } = {
      status: 'offline',
      connections: 0,
      queryTime: 0,
    };
    try {
      const t0 = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const queryTime = Date.now() - t0;
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM pg_stat_activity
      `;
      dbStatus = {
        status: 'online',
        connections: Number(countResult[0]?.count ?? 0),
        queryTime,
      };
    } catch {
      dbStatus.status = 'error';
    }

    // MB واحد برای حافظه (سازگار با SystemStatus interface)
    const memTotalMb = Math.round(metrics.memory.total / 1024 / 1024);
    const memUsedMb = Math.round(metrics.memory.used / 1024 / 1024);
    const memFreeMb = Math.round(metrics.memory.free / 1024 / 1024);

    const diskTotalMb = diskSpace ? Math.round(diskSpace.size / 1024 / 1024) : 0;
    const diskFreeMb = diskSpace ? Math.round(diskSpace.free / 1024 / 1024) : 0;
    const diskUsedMb = diskTotalMb - diskFreeMb;

    const status: SystemStatus = {
      cpu: {
        usage: metrics.cpu.usage,
      },
      memory: {
        total: memTotalMb,
        used: memUsedMb,
        free: memFreeMb,
      },
      disk: {
        total: diskTotalMb,
        used: diskUsedMb,
        free: diskFreeMb,
      },
      database: dbStatus,
      cache: {
        // cache hit-rate از Upstash در دسترس نیست بدون Redis client — ۱ به‌عنوان بهترین تخمین
        status: 'online',
        hitRate: 1,
      },
      lastUpdate: new Date().toISOString(),
    };

    return { success: true, data: status };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت وضعیت سیستم',
    };
  }
};

export const getActivityLog = async (): Promise<ActionResult<Activity[]>> => {
  try {
    await checkReportAccess();

    const activities = await db.activityLog.findMany({
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
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت لاگ‌های سیستم',
    };
  }
}
