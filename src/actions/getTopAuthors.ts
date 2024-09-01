import { auth } from '@/auth';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';

export async function getTopAuthors(limit = 5) {
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
}
