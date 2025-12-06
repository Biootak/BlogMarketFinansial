'use server';

import db from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  details: string;
  createdAt: Date;
  user: {
    name: string;
    email: string;
  };
};

export type ActivityFilters = {
  actionType?: string;
  userId?: string;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export async function getActivityLog(page = 1, limit = 10, filters?: ActivityFilters) {
  try {
    const skip = (page - 1) * limit;

    // ساخت شرط‌های فیلتر
    const whereCondition: Prisma.ActivityLogWhereInput = {
      user: {
        AND: [{ name: { not: '' } }, { email: { not: '' } }],
      },
    };

    // فیلتر نوع عملیات
    if (filters?.actionType && filters.actionType !== 'all') {
      whereCondition.action = {
        contains: filters.actionType,
        mode: 'insensitive',
      };
    }

    // فیلتر کاربر
    if (filters?.userId && filters.userId !== 'all') {
      whereCondition.userId = filters.userId;
    }

    // فیلتر جستجو
    if (filters?.searchQuery) {
      whereCondition.OR = [
        {
          action: {
            contains: filters.searchQuery,
            mode: 'insensitive',
          },
        },
        {
          details: {
            contains: filters.searchQuery,
            mode: 'insensitive',
          },
        },
        {
          user: {
            OR: [
              {
                name: {
                  contains: filters.searchQuery,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: filters.searchQuery,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      ];
    }

    // فیلتر بازه زمانی
    if (filters?.dateFrom || filters?.dateTo) {
      whereCondition.createdAt = {};
      if (filters.dateFrom) {
        whereCondition.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        // اضافه کردن 23:59:59 به تاریخ پایان
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereCondition.createdAt.lte = endDate;
      }
    }

    const [activities, total] = await Promise.all([
      db.activityLog.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        where: whereCondition,
      }),
      db.activityLog.count({ where: whereCondition }),
    ]);

    revalidatePath('/dashboard/activity');

    return {
      success: true,
      data: {
        activities: activities.map((activity) => ({
          ...activity,
          createdAt: activity.createdAt.toISOString(),
        })),
        total,
      },
    };
  } catch (error) {
    console.error('خطا در دریافت لاگ‌های فعالیت:', error);
    return {
      success: false,
      message: 'خطا در دریافت لاگ‌های فعالیت',
    };
  }
}

// دریافت لیست کاربران برای فیلتر
export async function getActivityUsers() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      where: {
        activities: {
          some: {},
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: users,
    };
  } catch (error) {
    console.error('خطا در دریافت لیست کاربران:', error);
    return {
      success: false,
      message: 'خطا در دریافت لیست کاربران',
    };
  }
}

// دریافت آمار خلاصه
export async function getActivityStats(filters?: ActivityFilters) {
  try {
    const whereCondition: Prisma.ActivityLogWhereInput = {};

    // اعمال فیلترها
    if (filters?.actionType && filters.actionType !== 'all') {
      whereCondition.action = {
        contains: filters.actionType,
        mode: 'insensitive',
      };
    }

    if (filters?.dateFrom || filters?.dateTo) {
      whereCondition.createdAt = {};
      if (filters.dateFrom) {
        whereCondition.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereCondition.createdAt.lte = endDate;
      }
    }

    // آمار 24 ساعت گذشته
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const [totalActivities, last24HoursCount, actionGroups] = await Promise.all([
      db.activityLog.count({ where: whereCondition }),
      db.activityLog.count({
        where: {
          ...whereCondition,
          createdAt: {
            gte: last24Hours,
          },
        },
      }),
      db.activityLog.groupBy({
        by: ['action'],
        _count: true,
        where: whereCondition,
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    return {
      success: true,
      data: {
        totalActivities,
        last24HoursCount,
        topActions: actionGroups.map((group) => ({
          action: group.action,
          count: group._count,
        })),
      },
    };
  } catch (error) {
    console.error('خطا در دریافت آمار فعالیت‌ها:', error);
    return {
      success: false,
      message: 'خطا در دریافت آمار فعالیت‌ها',
    };
  }
}
