'use server';

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import type { PostWithRelations } from '@/types/types';

// 2026-07-28: migrated from unstable_cache → safeCache.
// unstable_cache has no error handling — a DB error crashes the gallery page.
// safeCache returns stale data or the empty fallback instead.
async function fetchPosts(limit: number): Promise<PostWithRelations[]> {
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
}

export const getPosts = safeCache(fetchPosts, [] as PostWithRelations[], {
  key: 'gallery-posts',
  ttl: 60,
  tags: ['posts', 'gallery-posts'],
});
