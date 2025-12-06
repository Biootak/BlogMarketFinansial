'use server';

import db from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { checkReportAccess } from './auth';
import type { ActionResult, SystemLog } from './types';

export type SystemLogFilters = {
  level?: string;
  source?: string;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export async function getSystemLogs(
  page = 1,
  limit = 10,
  filters?: SystemLogFilters,
): Promise<ActionResult<{ logs: SystemLog[]; total: number }>> {
  try {
    await checkReportAccess();

    const skip = (page - 1) * limit;
    const whereCondition: Prisma.SystemLogWhereInput = {};

    // فیلتر سطح (Level)
    if (filters?.level && filters.level !== 'all') {
      whereCondition.level = filters.level;
    }

    // فیلتر منبع (Source)
    if (filters?.source && filters.source !== 'all') {
      whereCondition.source = filters.source;
    }

    // فیلتر جستجو
    if (filters?.searchQuery) {
      whereCondition.OR = [
        {
          message: {
            contains: filters.searchQuery,
            mode: 'insensitive',
          },
        },
        {
          source: {
            contains: filters.searchQuery,
            mode: 'insensitive',
          },
        },
      ];
    }

    // فیلتر بازه زمانی
    if (filters?.dateFrom || filters?.dateTo) {
      whereCondition.timestamp = {};
      if (filters.dateFrom) {
        whereCondition.timestamp.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereCondition.timestamp.lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      db.systemLog.findMany({
        where: whereCondition,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip,
      }),
      db.systemLog.count({ where: whereCondition }),
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

// دریافت لیست منابع (Sources) برای فیلتر
export async function getSystemLogSources(): Promise<ActionResult<string[]>> {
  try {
    await checkReportAccess();

    const sources = await db.systemLog.findMany({
      select: {
        source: true,
      },
      distinct: ['source'],
      orderBy: {
        source: 'asc',
      },
    });

    return {
      success: true,
      data: sources.map((s) => s.source),
    };
  } catch (error) {
    console.error('Error fetching system log sources:', error);
    return {
      success: false,
      message: 'خطا در دریافت لیست منابع',
    };
  }
}

// دریافت آمار خلاصه
export async function getSystemLogStats(filters?: SystemLogFilters): Promise<
  ActionResult<{
    totalLogs: number;
    last24Hours: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  }>
> {
  try {
    await checkReportAccess();

    const whereCondition: Prisma.SystemLogWhereInput = {};

    // اعمال فیلترها
    if (filters?.dateFrom || filters?.dateTo) {
      whereCondition.timestamp = {};
      if (filters.dateFrom) {
        whereCondition.timestamp.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereCondition.timestamp.lte = endDate;
      }
    }

    // آمار 24 ساعت گذشته
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const [totalLogs, last24HoursCount, errorCount, warningCount, infoCount] = await Promise.all([
      db.systemLog.count({ where: whereCondition }),
      db.systemLog.count({
        where: {
          ...whereCondition,
          timestamp: {
            gte: last24Hours,
          },
        },
      }),
      db.systemLog.count({
        where: {
          ...whereCondition,
          level: 'ERROR',
        },
      }),
      db.systemLog.count({
        where: {
          ...whereCondition,
          level: 'WARNING',
        },
      }),
      db.systemLog.count({
        where: {
          ...whereCondition,
          level: 'INFO',
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalLogs,
        last24Hours: last24HoursCount,
        errorCount,
        warningCount,
        infoCount,
      },
    };
  } catch (error) {
    console.error('Error fetching system log stats:', error);
    return {
      success: false,
      message: 'خطا در دریافت آمار لاگ‌ها',
    };
  }
}
