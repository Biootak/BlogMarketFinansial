'use server';

import prisma from '@/lib/db';
import { tieredCache } from '@/lib/tiered-cache';
import { type Profile, Role, type User } from '@prisma/client';
import { cache } from 'react';

export type TopAuthor = Pick<User, 'id' | 'name' | 'image'> & {
  profile: Pick<Profile, 'avatar' | 'bio' | 'jobName'> | null;
  _count: {
    posts: number;
  };
  avgViewsPerPost: number;
};

// 2026-06-14: previously this used only `react.cache` which is
// per-request only. The result of "top 5 authors" is stable across
// requests until a post is published, so wrap with `unstable_cache`
// too. The inner `cache` is preserved so the same request
// (multiple consumers in one page) still dedupes.
const fetchTopAuthorsRaw = async (limit: number): Promise<TopAuthor[]> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [{ role: Role.AUTHOR }, { role: Role.ADMIN }, { role: Role.OWNER }],
      },
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        profile: {
          select: {
            avatar: true,
            bio: true,
            jobName: true,
          },
        },
        _count: {
          select: { posts: true },
        },
        posts: {
          select: { viewCount: true },
        },
      },
    });

    return users.map((u) => {
      const totalViews = u.posts.reduce((sum, p) => sum + p.viewCount, 0);
      const avgViewsPerPost = u._count.posts > 0 ? Math.round(totalViews / u._count.posts) : 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { posts: _posts, ...rest } = u;
      return { ...rest, avgViewsPerPost };
    });
  } catch {
    return [];
  }
};

const getCachedTopAuthors = tieredCache(fetchTopAuthorsRaw, [], {
  key: 'top-authors',
  l1Ttl: 120,
  l2Ttl: 600,
  tags: ['top-authors', 'posts'],
});

export const getTopAuthors = cache(async (limit: number): Promise<TopAuthor[]> => {
  return getCachedTopAuthors(limit);
});

export async function fetchTopAuthors(
  limit: number,
): Promise<{ data: TopAuthor[] | null; error: string | null }> {
  try {
    const authors = await getTopAuthors(limit);
    return { data: authors, error: null };
  } catch {
    return { data: null, error: 'خطا در دریافت نویسندگان برتر' };
  }
}
