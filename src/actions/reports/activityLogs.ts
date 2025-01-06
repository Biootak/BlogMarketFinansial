'use server';

import db from '@/lib/db';
import { checkReportAccess } from './auth';
import type { ActionResult, Activity } from './types';

export async function getActivityLogs(
  page = 1,
  limit = 20
): Promise<ActionResult<{ activities: Activity[]; total: number }>> {
  try {
    await checkReportAccess();

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      db.activityLog.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.activityLog.count(),
    ]);

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      userEmail: activity.user.email,
      action: activity.action,
      details: activity.details,
      createdAt: activity.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        activities: formattedActivities,
        total,
      },
    };
  } catch (error) {
    console.error('Error in getActivityLogs:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'خطا در دریافت گزارش فعالیت‌ها',
    };
  }
}
