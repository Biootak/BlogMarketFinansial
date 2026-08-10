// actions/getTags.ts
'use server';

import prisma from '@/lib/db';
import { tieredCache } from '@/lib/tiered-cache';
import type { ActionResult, TaxonomyType } from '@/types/types';

// 2026-07-28: getTags previously called unstable_cache() inline inside an
// async function — the cache key included option values but the closure
// captured them from the outer scope, making key/body out-of-sync on re-use.
// Replaced with safeCache which handles per-arg keying correctly.

const FALLBACK: ActionResult<{ tags: TaxonomyType[]; totalCount: number }> = {
  success: true,
  message: 'تگ‌ها (fallback)',
  data: { tags: [], totalCount: 0 },
};

async function fetchTags(
  limit: number,
  page: number,
  search: string,
): Promise<ActionResult<{ tags: TaxonomyType[]; totalCount: number }>> {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }
    : {};

  const [tags, totalCount] = await Promise.all([
    prisma.tag.findMany({
      where,
      take: limit,
      skip,
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
    }),
    prisma.tag.count({ where }),
  ]);

  const formattedTags: TaxonomyType[] = tags.map((tag) => ({
    ...tag,
    taxonomy: 'tag',
    count: tag._count.posts,
    color: 'indigo',
  }));

  return {
    success: true,
    message: 'تگ‌ها با موفقیت بازیابی شدند.',
    data: { tags: formattedTags, totalCount },
  };
}

const getCachedTags = tieredCache(fetchTags, FALLBACK, {
  key: 'tags-list',
  l1Ttl: 300,
  l2Ttl: 3600,
  tags: ['tags'],
});

export async function getTags(
  options: { limit?: number; page?: number; search?: string } = {},
): Promise<ActionResult<{ tags: TaxonomyType[]; totalCount: number }>> {
  const { limit = 10, page = 1, search = '' } = options;
  return getCachedTags(limit, page, search);
}
