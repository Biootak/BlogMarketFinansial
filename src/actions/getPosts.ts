'use server';

import prisma from '@/lib/db';
import type { PostWithRelations } from '@/types/types';

export async function getPosts(limit: number): Promise<PostWithRelations[]> {
  const posts = await prisma.post.findMany({
    take: limit,
    where: { status: 'PUBLISHED', postType: 'GALLERY' },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        include: { profile: true },
      },
      categories: true,
      tags: true,
      _count: {
        select: {
          comments: true,
          likes: true,
          savedBy: true,
          tags: true,
        },
      },
    },
  });

  return posts;
}
