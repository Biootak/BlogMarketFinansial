'use server';

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import type { ActionResult, PostWithRelations } from '@/types/types';
import { PostStatus } from '@prisma/client';

// Internal fetch function
async function fetchFeaturedPosts(limit: number): Promise<ActionResult<PostWithRelations[]>> {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        isFeatured: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      omit: { content: true },
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
    });

    return {
      success: true,
      message: 'پست‌های ویژه با موفقیت بازیابی شدند.',
      data: posts as PostWithRelations[],
    };
  } catch {
    return {
      success: false,
      message: 'خطا در بازیابی پست‌های ویژه.',
    };
  }
}

const EMPTY_FEATURED: ActionResult<PostWithRelations[]> = {
  success: true,
  message: 'پست‌های ویژه (fallback)',
  data: [],
};

const getCachedFeaturedPosts = safeCache(fetchFeaturedPosts, EMPTY_FEATURED, {
  key: 'featured-posts',
  ttl: 60,
  tags: ['posts', 'featured-posts'],
});

// Public API
export async function getFeaturedPosts(limit = 3): Promise<ActionResult<PostWithRelations[]>> {
  return getCachedFeaturedPosts(limit);
}
