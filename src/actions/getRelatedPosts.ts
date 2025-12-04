'use server';

import { cache } from 'react';
import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';

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
        message: 'پست‌های مرتبط با موفقیت بازیابی شدند.',
        data: relatedPosts as PostWithRelations[],
      };
    } catch (error) {
      console.error('Error retrieving related posts:', error);
      return {
        success: false,
        message: 'خطا در بازیابی پست‌های مرتبط.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);
