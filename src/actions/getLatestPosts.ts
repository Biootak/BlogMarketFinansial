'use server';

import { cache } from 'react';
import prisma from '@/lib/db';
import { PostStatus } from '@prisma/client';
import type { PostWithRelations } from '@/types/types';
import { revalidatePath } from 'next/cache';

interface GetLatestPostsParams {
  count?: number;
  skip?: number;
  category?: string;
}

export const getLatestPosts = cache(
  async ({
    count = 6,
    skip = 0,
    category,
  }: GetLatestPostsParams = {}): Promise<PostWithRelations[]> => {
    try {
      const whereClause = {
        status: PostStatus.PUBLISHED,
        ...(category && category !== 'همه'
          ? {
              categories: {
                some: {
                  name: category,
                },
              },
            }
          : {}),
      };

      const posts = await prisma.post.findMany({
        where: whereClause,
        take: count,
        skip: skip,
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

      return posts as PostWithRelations[];
    } catch (error) {
      // لاگ فقط در development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching posts:', error);
      }
      // برگرداندن آرایه خالی به جای throw کردن
      return [];
    }
  },
);

export const invalidatePostsCache = async () => {
  revalidatePath('/posts');
};
