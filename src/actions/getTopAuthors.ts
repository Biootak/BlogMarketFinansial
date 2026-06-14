'use server';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { Role, type User, type Profile } from '@prisma/client';
import prisma from '@/lib/db';

export type TopAuthor = Pick<User, 'id' | 'name' | 'image'> & {
  profile: Pick<Profile, 'avatar' | 'bio' | 'jobName'> | null;
  _count: {
    posts: number;
  };
};

// 2026-06-14: previously this used only `react.cache` which is
// per-request only. The result of "top 5 authors" is stable across
// requests until a post is published, so wrap with `unstable_cache`
// too. The inner `cache` is preserved so the same request
// (multiple consumers in one page) still dedupes.
const fetchTopAuthorsRaw = async (limit: number): Promise<TopAuthor[]> => {
  try {
    return await prisma.user.findMany({
      where: {
        OR: [{ role: Role.AUTHOR }, { role: Role.ADMIN }, { role: Role.SUPER_ADMIN }],
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
      },
    });
  } catch (error) {
    console.error('Failed to fetch top authors:', error);
    return [];
  }
};

const getCachedTopAuthors = unstable_cache(
  fetchTopAuthorsRaw,
  ['top-authors', 'v1-2026-06-14'],
  {
    revalidate: 600,
    tags: ['top-authors', 'posts'],
  },
);

export const getTopAuthors = cache(async (limit: number): Promise<TopAuthor[]> => {
  return getCachedTopAuthors(limit);
});

export async function fetchTopAuthors(
  limit: number,
): Promise<{ data: TopAuthor[] | null; error: string | null }> {
  try {
    const authors = await getTopAuthors(limit);
    return { data: authors, error: null };
  } catch (error) {
    console.error('Error in fetchTopAuthors:', error);
    return { data: null, error: 'خطا در دریافت نویسندگان برتر' };
  }
}
