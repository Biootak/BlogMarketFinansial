'use server';

import prisma from '@/lib/db';
import { postCardInclude } from '@/lib/post-include';
import type { ActionResult, PaginationParams, PostWithRelations } from '@/types/types';
import type { Prisma } from '@prisma/client';

interface GetPostsByAuthorParams extends PaginationParams {
  filter?: string;
}

export async function getPostsByAuthor(
  authorId: string,
  { page = 1, limit = 12, filter = 'جدیدترین' }: GetPostsByAuthorParams,
): Promise<ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }>> {
  try {
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
        include: postCardInclude,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      success: true,
      message: 'پست‌های نویسنده با موفقیت دریافت شدند.',
      data: {
        posts: posts as PostWithRelations[],
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch {
    return {
      success: false,
      message: 'خطا در دریافت پست‌های نویسنده.',
    };
  }
}
