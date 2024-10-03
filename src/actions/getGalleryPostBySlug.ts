'use server';

import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';
import { PostType, PostStatus } from '@prisma/client';

export async function getGalleryPostBySlug(
  slug: string,
): Promise<ActionResult<PostWithRelations | null>> {
  try {
    const post = await prisma.post.findUnique({
      where: {
        slug: slug,
        postType: PostType.GALLERY,
        status: PostStatus.PUBLISHED,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        categories: true,
        comments: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
            post: true,
            replies: {
              include: {
                author: true,
              },
            },
            likes: {
              include: {
                user: true,
              },
            },
            _count: true,
          },
        },
        tags: true,
        likes: true,
        savedBy: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            savedBy: true,
            tags: true,
            categories: true,
          },
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
      data: post,
    };
  } catch (error) {
    console.error('خطا در بازیابی پست گالری:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست گالری. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
