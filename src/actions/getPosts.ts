'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import type { PostWithRelations } from '@/types/types';

export const getPosts = unstable_cache(
  async (limit: number): Promise<PostWithRelations[]> => {
    const posts = await prisma.post.findMany({
    take: limit,
    where: { status: 'PUBLISHED', postType: 'GALLERY' },
    orderBy: { createdAt: 'desc' },
    omit: { content: true },
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

    return posts as PostWithRelations[];
  },
  ['gallery-posts'],
  {
    revalidate: 60, // 1 minute
    tags: ['posts', 'gallery-posts'],
  }
);
