'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { unstable_cache } from 'next/cache';

import type { ActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';

export async function getRecentDrafts(): Promise<
  ActionResult<
    Array<{
      id: string;
      title: string;
      date: string;
      author: string;
    }>
  >
> {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return {
      success: false,
      message: 'لطفاً وارد حساب کاربری خود شوید.',
    };
  }

  const where: Prisma.PostWhereInput = { status: 'DRAFT' };
  if (user.role === 'AUTHOR') {
    where.authorId = user.id;
  }

  try {
    // 2026-06-14: per-user cache key. `unstable_cache` keys on
    // `[name, ...args]`, so passing the user id here scopes the
    // cache correctly while still sharing the 30s TTL globally
    // for the same user.
    // `unstable_cache` keys ONLY on `keyParts` (string args), NOT on the
    // closure's function args — so the previous static key leaked one user's
    // drafts to another for 30s. Scopes the cache by userId/role here.
    const scopeKey =
      user.role === 'AUTHOR' ? (user.id ?? 'no-id') : `role:${user.role ?? 'unknown'}`;
    const fetcher = unstable_cache(
      async () => {
        return prisma.post.findMany({
          where: {
            status: 'DRAFT',
            ...(user.role === 'AUTHOR' ? { authorId: user.id } : {}),
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
      },
      ['recent-drafts', 'v1-2026-06-14', scopeKey],
      {
        revalidate: 30,
        tags: ['recent-drafts', 'posts'],
      },
    );

    const recentDrafts = await fetcher();

    const formattedDrafts = recentDrafts.map((draft) => ({
      id: draft.id,
      title: draft.title,
      // 2026-06-19: unstable_cache JSON-serializes the return value, so
      // Prisma's Date becomes an ISO string on cache hits. Wrap with
      // new Date() which accepts both Date and string.
      date: new Date(draft.updatedAt).toLocaleDateString('fa-IR'),
      author: draft.author.name || 'ناشناس',
    }));

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
