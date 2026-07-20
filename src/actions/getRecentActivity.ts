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
import type { ActionResult } from '@/types/types';
import { unstable_cache } from 'next/cache';

export interface ActivityEntry {
  id: string;
  action: string;
  details: string;
  /** ISO string for serialization (unstable_cache JSON-serializes) */
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
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
    user: {
      id: r.user.id,
      name: r.user.name,
      image: r.user.image,
    },
  }));
};

const cached = (userId: string, role: string, limit: number) =>
  unstable_cache(
    () => fetchRecentActivityRaw(userId, role, limit),
    ['recent-activity', 'v1-2026-06-22', userId, role, String(limit)],
    {
      revalidate: 30,
      tags: ['recent-activity', 'activity-log'],
    },
  )();

export async function getRecentActivity(limit = 8): Promise<ActionResult<ActivityEntry[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'لطفاً وارد حساب کاربری خود شوید.' };
    }
    const rows = await cached(session.user.id, session.user.role ?? 'USER', limit);
    return { success: true, message: 'فعالیت‌های اخیر', data: rows };
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    return {
      success: false,
      message: 'خطا در دریافت فعالیت‌های اخیر',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
