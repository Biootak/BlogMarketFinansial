'use server';

import { cache } from 'react';
import { PostStatus } from '@prisma/client';
import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';

export const getFeaturedPosts = cache(
  async (limit = 3): Promise<ActionResult<PostWithRelations[]>> => {
    try {
      const posts = await prisma.post.findMany({
        where: {
          status: PostStatus.PUBLISHED,
          isFeatured: true,
        },
        take: limit,
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
        message: 'پست‌های ویژه با موفقیت بازیابی شدند.',
        data: posts as PostWithRelations[],
      };
    } catch (error) {
      console.error('خطا در بازیابی پست‌های ویژه:', error);
      return {
        success: false,
        message: 'خطا در بازیابی پست‌های ویژه.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);
