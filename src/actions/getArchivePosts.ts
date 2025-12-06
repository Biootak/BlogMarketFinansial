'use server';

import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';

// Internal fetch function
async function fetchArchivePosts(
  page: number,
  limit: number,
  categorySlug: string | undefined,
  tagSlug: string | undefined,
): Promise<{ posts: PostWithRelations[]; total: number; pages: number }> {
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.PostWhereInput = { status: 'PUBLISHED' };

  if (categorySlug) {
    whereCondition.categories = { some: { slug: categorySlug } };
  }

  if (tagSlug) {
    whereCondition.tags = { some: { slug: tagSlug } };
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: whereCondition,
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: {
                avatar: true,
                jobName: true,
              },
            },
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
            savedBy: true,
          },
        },
      },
    }),
    prisma.post.count({ where: whereCondition }),
  ]);

  return {
    posts: posts as PostWithRelations[],
    total,
    pages: Math.ceil(total / limit),
  };
}

// Cached version
const getCachedArchivePosts = (
  page: number,
  limit: number,
  categorySlug: string | undefined,
  tagSlug: string | undefined,
) =>
  unstable_cache(
    () => fetchArchivePosts(page, limit, categorySlug, tagSlug),
    [
      'archive-posts',
      String(page),
      String(limit),
      categorySlug || 'all',
      tagSlug || 'all',
    ],
    {
      revalidate: 120, // 2 minutes
      tags: [
        'posts',
        'archive-posts',
        categorySlug ? `category-${categorySlug}` : 'all-categories',
        tagSlug ? `tag-${tagSlug}` : 'all-tags',
      ],
    },
  )();

export async function getArchivePosts(
  page = 1,
  limit = 12,
  categorySlug?: string,
  tagSlug?: string,
): Promise<ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }>> {
  try {
    const data = await getCachedArchivePosts(page, limit, categorySlug, tagSlug);

    return {
      success: true,
      message: 'پست‌ها با موفقیت بازیابی شدند.',
      data,
    };
  } catch (error) {
    console.error('خطا در بازیابی پست‌ها:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌ها.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
