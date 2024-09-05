import { auth } from '@/auth';
import prisma from '@/lib/db';
import { Role, type User, type Profile } from '@prisma/client';
import { cache } from 'react';

export type TopAuthor = User & {
  profile: Profile | null;
  _count: {
    posts: number;
  };
};

export const getTopAuthors = cache(async (limit: number): Promise<TopAuthor[]> => {
  const session = await auth();

  if (!session) {
    throw new Error('Unauthorized');
  }

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
    throw new Error('Failed to fetch top authors');
  }
});
