'use server';

import prisma from '@/lib/db';
import { galleryPostCardInclude } from '@/lib/post-include';
import { safeCache } from '@/lib/safe-cache';
import type { PostWithRelations } from '@/types/types';

// 2026-07-28: migrated from unstable_cache → safeCache.
// unstable_cache has no error handling — a DB error crashes the gallery page.
// safeCache returns stale data or the empty fallback instead.
async function fetchPosts(limit: number): Promise<PostWithRelations[]> {
  // 2026-08-perf: select فقط فیلدهای لازم — RSC payload کوچک‌تر
  // قبلاً: author.profile همه فیلدها، categories همه، tags همه
  const posts = await prisma.post.findMany({
    take: limit,
    where: { status: 'PUBLISHED', postType: 'GALLERY' },
    orderBy: { createdAt: 'desc' },
    omit: { content: true },
    include: galleryPostCardInclude,
  });

  return posts as PostWithRelations[];
}

export const getPosts = safeCache(fetchPosts, [] as PostWithRelations[], {
  key: 'gallery-posts',
  ttl: 60,
  tags: ['posts', 'gallery-posts'],
});
