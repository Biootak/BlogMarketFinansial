'use server';

import { cache } from 'react';
import { Role, type User, type Profile } from '@prisma/client';
import prisma from '@/lib/db';

export type TopAuthor = User & {
  profile: Profile | null;
  _count: {
    posts: number;
  };
};

export const getTopAuthors = cache(async (limit: number): Promise<TopAuthor[]> => {
  try {
    const topAuthors = await prisma.user.findMany({
      where: {
        OR: [{ role: Role.AUTHOR }, { role: Role.ADMIN }],
      },
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      include: {
        profile: true,
        _count: {
          select: { posts: true },
        },
      },
    });

    return topAuthors;
  } catch (error) {
    console.error('Failed to fetch top authors:', error);
    return [];
  }
});

export async function fetchTopAuthors(
  limit: number,
): Promise<{ data: TopAuthor[] | null; error: string | null }> {
  try {
    const authors = await getTopAuthors(limit);
    return { data: authors, error: null };
  } catch (error) {
    console.error('Error in fetchTopAuthors:', error);
    return { data: null, error: 'Unable to fetch top authors. Please try again later.' };
  }
}
