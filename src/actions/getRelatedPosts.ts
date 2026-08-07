'use server';

import prisma from '@/lib/db';
import { postCardInclude } from '@/lib/post-include';
import type { ActionResult, PostWithRelations } from '@/types/types';
import { cache } from 'react';

export const getRelatedPosts = cache(
  async (postId: string, categoryIds: string[]): Promise<ActionResult<PostWithRelations[]>> => {
    try {
      const relatedPosts = await prisma.post.findMany({
        where: {
          id: { not: postId },
          status: 'PUBLISHED',
          categories: {
            some: {
              id: { in: categoryIds },
            },
          },
        },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: postCardInclude,
      });

      return {
        success: true,
        message: 'پست‌های مرتبط با موفقیت بازیابی شدند.',
        data: relatedPosts as PostWithRelations[],
      };
    } catch {
      return {
        success: false,
        message: 'خطا در بازیابی پست‌های مرتبط.',
      };
    }
  },
);
