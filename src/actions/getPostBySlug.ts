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
      // 2026-06-14: bound the comments fetch and drop the heavy
      // `replies: true` + `likes: true` (full records) — replaced by
      // _count + a small author projection. Saves an unbounded
      // recursive walk and 2 N+1s per post load.
      const post = await prisma.post.findUnique({
        where: { slug },
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          excerpt: true,
          featuredImage: true,
          galleryImages: true,
          postType: true,
          status: true,
          videoUrl: true,
          audioUrl: true,
          isFeatured: true,
          viewCount: true,
          readingTime: true,
          authorId: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
              profile: { select: { avatar: true, jobName: true, bio: true } },
            },
          },
          categories: { select: { id: true, name: true, slug: true, thumbnail: true } },
          tags: { select: { id: true, name: true, slug: true } },
          comments: {
            where: { approved: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
              id: true,
              content: true,
              approved: true,
              parentId: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                  profile: { select: { avatar: true, jobName: true } },
                },
              },
              _count: { select: { likes: true, replies: true } },
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
        data: post as unknown as PostWithRelations,
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
