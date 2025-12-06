'use server';

import prisma from '@/lib/db';
import type { ActionResult, PaginationParams, PostWithRelations } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';

interface GetPostsByAuthorParams extends PaginationParams {
  filter?: string;
}

// Internal fetch function
async function fetchPostsByAuthor(
  authorId: string,
  page: number,
  limit: number,
  filter: string,
): Promise<{ posts: PostWithRelations[]; total: number; pages: number }> {
  const skip = (page - 1) * limit;

  let orderBy: Prisma.PostOrderByWithRelationInput = { createdAt: 'desc' };
  switch (filter) {
    case 'قدیمی‌ترین':
      orderBy = { createdAt: 'asc' };
      break;
    case 'محبوب‌ترین':
      orderBy = { likes: { _count: 'desc' } };
      break;
    case 'پربحث‌ترین':
      orderBy = { comments: { _count: 'desc' } };
      break;
  }

  const where = { authorId, status: 'PUBLISHED' as const };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
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
      orderBy,
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    posts: posts as PostWithRelations[],
    total,
    pages: Math.ceil(total / limit),
  };
}

// Cached version
const getCachedPostsByAuthor = (
  authorId: string,
  page: number,
  limit: number,
  filter: string,
) =>
  unstable_cache(
    () => fetchPostsByAuthor(authorId, page, limit, filter),
    ['posts-by-author', authorId, String(page), String(limit), filter],
    {
      revalidate: 120, // 2 minutes
      tags: ['posts', 'author-posts', `author-${authorId}`],
    },
  )();

export async function getPostsByAuthor(
  authorId: string,
  params: GetPostsByAuthorParams = { page: 1, limit: 12 },
): Promise<ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }>> {
  const { page = 1, limit = 12, filter = 'جدیدترین' } = params;
  try {
    const data = await getCachedPostsByAuthor(authorId, page, limit, filter);

    return {
      success: true,
      message: 'پست‌های نویسنده با موفقیت دریافت شدند.',
      data,
    };
  } catch (error) {
    console.error('خطا در دریافت پست‌های نویسنده:', error);
    return {
      success: false,
      message: 'خطا در دریافت پست‌های نویسنده.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
