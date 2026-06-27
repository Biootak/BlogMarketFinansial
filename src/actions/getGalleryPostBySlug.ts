'use server';

import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';
import { PostType, PostStatus } from '@prisma/client';

export async function getGalleryPostBySlug(
  slug: string,
): Promise<ActionResult<PostWithRelations | null>> {
  try {
    // 2026-06-14: drop the recursive comments/likes/savedBy includes.
    // The gallery page renders the post body + first 10 comments and
    // shows counters. Counters come from _count; the rest was N+1.
    const post = await prisma.post.findUnique({
      where: {
        slug: slug,
        postType: PostType.GALLERY,
        status: PostStatus.PUBLISHED,
      },
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
        _count: {
          select: { comments: true, likes: true, savedBy: true },
        },
      },
    });

    if (!post) {
      return {
        success: false,
        message: 'پست مورد نظر یافت نشد.',
        data: null,
      };
    }

    return {
      success: true,
      message: 'پست گالری با موفقیت بازیابی شد.',
      data: post as unknown as PostWithRelations,
    };
  } catch (error) {
    console.error('خطا در بازیابی پست گالری:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست گالری. لطفاً دوباره تلاش کنید.',
    };
  }
}
