'use server';

import prisma from '@/lib/db';
import { postCardInclude } from '@/lib/post-include';
import type { ActionResult, PostWithRelations } from '@/types/types';
import { cache } from 'react';

export const getMoreFromAuthor = cache(
  async (authorId: string | null, postId: string): Promise<ActionResult<PostWithRelations[]>> => {
    try {
      // پست بدون نویسنده (authorId null) → هیچ پست مرتبطی ندارد
      if (!authorId) {
        return { success: true, message: 'پست‌های بیشتر از این نویسنده', data: [] };
      }
      const moreFromAuthor = await prisma.post.findMany({
        where: {
          authorId,
          status: 'PUBLISHED',
          id: { not: postId },
        },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: postCardInclude,
      });

      return {
        success: true,
        message: 'پست‌های بیشتر از این نویسنده با موفقیت بازیابی شدند.',
        data: moreFromAuthor as PostWithRelations[],
      };
    } catch {
      return {
        success: false,
        message: 'خطا در بازیابی پست‌های بیشتر از این نویسنده.',
      };
    }
  },
);
