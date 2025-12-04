'use server';

import { cache } from 'react';
import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';

export const getPostBySlug = cache(
  async (slug: string): Promise<ActionResult<PostWithRelations>> => {
    if (!slug) {
      return {
        success: false,
        message: 'اسلاگ نامعتبر است.',
        error: 'اسلاگ نمی‌تواند خالی باشد.',
      };
    }

    try {
      const post = await prisma.post.findUnique({
        where: { slug },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              profile: {
                select: {
                  avatar: true,
                  bio: true,
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
          comments: {
            where: { approved: true },
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  profile: {
                    select: { avatar: true },
                  },
                },
              },
              replies: {
                include: {
                  author: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                    },
                  },
                },
              },
              _count: {
                select: { likes: true },
              },
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

      if (!post) {
        return { success: false, message: 'پست یافت نشد.', error: 'پست یافت نشد.' };
      }

      return {
        success: true,
        message: 'پست با موفقیت بازیابی شد.',
        data: post as PostWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        message: 'خطا در بازیابی پست.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);
