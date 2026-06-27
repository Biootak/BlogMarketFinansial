'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { checkReportAccess } from './auth';

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

export async function getActivityLog(page = 1, limit = 10) {
  try {
    await checkReportAccess();
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      db.activityLog.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        where: {
          user: {
            AND: [
              { name: { not: '' } },
              { email: { not: '' } }
            ]
          }
        }
      }),
      db.activityLog.count()
    ]);

    revalidatePath('/dashboard/activity');

    return {
      success: true,
      data: {
        activities: activities.map(activity => ({
          ...activity,
          createdAt: activity.createdAt.toISOString()
        })),
        total
      }
    };
  } catch (error) {
    console.error('خطا در دریافت لاگ‌های فعالیت:', error);
    return {
      success: false,
      message: 'خطا در دریافت لاگ‌های فعالیت'
    };
  }
}
