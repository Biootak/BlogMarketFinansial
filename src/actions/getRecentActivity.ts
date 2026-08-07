'use server';

/**
 * getRecentActivity — fetches the most recent ActivityLog rows for the
 * dashboard "activity timeline" widget. Roles: OWNER / ADMIN see
 * everyone's events; AUTHOR sees only their own.
 *
 * Cached for 30 s with tag `recent-activity`. The log writer
 * (`logActivity` in `lib/activity-logger.ts`) only inserts, so revalidate
 * is enough — no explicit invalidation hook is required.
 */

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import type { ActionResult } from '@/types/types';

export interface ActivityEntry {
  id: string;
  action: string;
  details: string;
  /** ISO string for serialization */
  createdAt: string;
  /** کاربر حذف‌شده → null (onDelete: SetNull در schema) */
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

const fetchRecentActivityRaw = async (
  userId: string,
  role: string,
  limit: number,
): Promise<ActivityEntry[]> => {
  const where = role === 'AUTHOR' ? { userId } : {};
  const rows = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    details: r.details,
    createdAt: r.createdAt.toISOString(),
    user: r.user
      ? {
          id: r.user.id,
          name: r.user.name,
          image: r.user.image,
        }
      : null,
  }));
};

// safeCache with per-user args key (userId, role, limit) — DB-failure resilient
const getCachedActivity = safeCache(fetchRecentActivityRaw, [], {
  key: 'recent-activity',
  ttl: 30,
  tags: ['recent-activity', 'activity-log'],
});

export async function getRecentActivity(limit = 8): Promise<ActionResult<ActivityEntry[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'لطفاً وارد حساب کاربری خود شوید.' };
    }
    const rows = await getCachedActivity(session.user.id, session.user.role ?? 'USER', limit);
    return { success: true, message: 'فعالیت‌های اخیر', data: rows };
  } catch {
    return {
      success: false,
      message: 'خطا در دریافت فعالیت‌های اخیر',
    };
  }
}
