'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import type { ActionResult } from '@/types/types';

type RecentDraftRow = {
  id: string;
  title: string;
  date: string;
  author: string;
};

// 2026-06-14: per-user cache key. safeCache uses JSON.stringify(args) as the
// compound key suffix, so (userId, role) pairs are stored separately and
// avoid cross-user data leaks that the static-key unstable_cache pattern had.
const fetchRecentDraftsRaw = async (userId: string, role: string): Promise<RecentDraftRow[]> => {
  const drafts = await prisma.post.findMany({
    where: {
      status: 'DRAFT',
      ...(role === 'AUTHOR' ? { authorId: userId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      author: { select: { name: true } },
    },
  });

  return drafts.map((draft) => ({
    id: draft.id,
    title: draft.title,
    // safeCache returns plain JSON so Dates arrive as ISO strings on cache hits.
    date: new Date(draft.updatedAt).toLocaleDateString('fa-IR'),
    author: draft.author?.name || 'ناشناس',
  }));
};

const getCachedRecentDrafts = safeCache(fetchRecentDraftsRaw, [], {
  key: 'recent-drafts',
  ttl: 30,
  tags: ['recent-drafts', 'posts'],
});

export async function getRecentDrafts(): Promise<ActionResult<RecentDraftRow[]>> {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return {
      success: false,
      message: 'لطفاً وارد حساب کاربری خود شوید.',
    };
  }

  try {
    const formattedDrafts = await getCachedRecentDrafts(user.id ?? 'no-id', user.role ?? 'unknown');

    return {
      success: true,
      message: 'پیش‌نویس‌های اخیر با موفقیت بازیابی شدند.',
      data: formattedDrafts,
    };
  } catch {
    return {
      success: false,
      message: 'خطا در بازیابی پیش‌نویس‌های اخیر. لطفاً دوباره تلاش کنید.',
    };
  }
}
