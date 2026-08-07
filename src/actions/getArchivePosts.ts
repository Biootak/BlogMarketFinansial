'use server';

import prisma from '@/lib/db';
import { postCardInclude } from '@/lib/post-include';
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

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: whereCondition,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: postCardInclude,
      }),
      prisma.post.count({ where: whereCondition }),
    ]);

    return {
      success: true,
      message: 'پست‌ها با موفقیت بازیابی شدند.',
      data: {
        posts: posts as PostWithRelations[],
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch {
    return {
      success: false,
      message: 'خطا در بازیابی پست‌ها.',
    };
  }
}
