'use server';

import db from '@/lib/db';
import { checkReportAccess } from './auth';

export type ActivityLog = {
  id: string;
  userId: string | null;
  action: string;
  details: string;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  } | null;
};

export async function getActivityLog(page = 1, limit = 10) {
  try {
    await checkReportAccess();
    const skip = (page - 1) * limit;

    // فیلتر مشترک برای هم query و هم count — تا total دقیق باشد
    // as const حذف شد چون Prisma types readonly arrays را نمی‌پذیرند
    const where = {
      user: {
        AND: [{ name: { not: '' } }, { email: { not: '' } }],
      },
    };

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
        where,
      }),
      db.activityLog.count({ where }),
    ]);

    // revalidatePath در Server Action اشتباه است — این تابع فقط read است
    // و نیاز به invalidation ندارد. حذف شد.

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
  } catch {
    return {
      success: false,
      message: 'خطا در دریافت لاگ‌های فعالیت',
    };
  }
}
