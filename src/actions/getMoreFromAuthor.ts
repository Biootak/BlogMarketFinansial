'use server';

import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';
import { cache } from 'react';

export const getMoreFromAuthor = cache(
  async (authorId: string, postId: string): Promise<ActionResult<PostWithRelations[]>> => {
    try {
      const moreFromAuthor = await prisma.post.findMany({
        where: {
          authorId,
          status: 'PUBLISHED',
          id: { not: postId },
        },
        take: 4,
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
