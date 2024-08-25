'use server';

import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';
import type { Prisma } from '@prisma/client';

export async function getArchivePosts(
  page = 1,
  limit = 12,
  categorySlug?: string,
  tagSlug?: string,
): Promise<ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }>> {
  try {
    const skip = (page - 1) * limit;
    const whereCondition: Prisma.PostWhereInput = { status: 'PUBLISHED' };

    if (categorySlug) {
      whereCondition.categories = { some: { slug: categorySlug } };
    }

    if (tagSlug) {
      whereCondition.tags = { some: { slug: tagSlug } };
    }

    const [posts, total] = await prisma.$transaction([
      prisma.post.findMany({
        where: whereCondition,
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            include: {
              profile: true,
            },
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
      }),
      prisma.post.count({ where: whereCondition }),
    ]);

    return {
      success: true,
      message: 'پست‌ها با موفقیت بازیابی شدند.',
      data: {
        posts,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('خطا در بازیابی پست‌ها:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌ها. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
