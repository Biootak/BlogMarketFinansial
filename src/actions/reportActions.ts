'use server';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import db from '@/lib/db';

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

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export async function checkReportAccess() {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error('No user email found');
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    throw new Error('شما دسترسی لازم برای مشاهده گزارش‌ها را ندارید');
  }
}

export async function getSystemReports(from?: Date, to?: Date) {
  try {
    await checkReportAccess();

    const dateFilter = from && to ? {
      createdAt: {
        gte: from,
        lte: to
      }
    } : {};

    const [
      userStats,
      postStats,
      commentStats,
      viewStats
    ] = await Promise.all([
      // آمار کاربران
      prisma.user.aggregate({
        where: dateFilter,
        _count: {
          id: true
        }
      }).then(async (result) => {
        const newThisMonth = await prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        });
        const active = await prisma.user.count({ where: { status: "Active" } });
        const roleDistribution = await prisma.user.groupBy({
          by: ['role'],
          _count: { id: true }
        }).then(roles => roles.map(r => ({
          name: r.role,
          value: r._count.id
        })));
        return {
          total: result._count.id,
          newThisMonth,
          active,
          roleDistribution
        };
      }),

      // آمار پست‌ها
      prisma.post.aggregate({
        where: dateFilter,
        _count: {
          id: true
        }
      }).then(async (result) => {
        const published = await prisma.post.count({
          where: {
            ...dateFilter,
            status: "PUBLISHED"
          }
        });
        return {
          total: result._count.id,
          published,
          draft: result._count.id - published
        };
      }),

      // آمار نظرات
      prisma.comment.aggregate({
        where: dateFilter,
        _count: {
          id: true
        }
      }).then(async (result) => {
        const pending = await prisma.comment.count({
          where: {
            ...dateFilter,
            approved: false
          }
        });
        return {
          total: result._count.id,
          pending,
          monthly: []
        };
      }),

      // آمار بازدید
      prisma.pageView.aggregate({
        where: dateFilter,
        _count: {
          id: true
        }
      }).then(async (result) => {
        const today = await prisma.pageView.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        });
        return {
          total: result._count.id,
          today,
          monthly: [],
          topPosts: []
        };
      })
    ]);

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
};

export const getSystemStatus = async (): Promise<ActionResult<SystemStatus>> => {
  'use server';

  try {
    await checkReportAccess();

    const status: SystemStatus = {
      cpu: {
        usage: Math.random() * 100, // این مقدار باید از سیستم واقعی خوانده شود
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

    const formattedActivities = activities.map((activity) => ({
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
  page: number = 1,
  limit: number = 10,
  level?: string
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
