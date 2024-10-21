'use server';

import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';

export async function getPostBySlug(slug: string): Promise<ActionResult<PostWithRelations>> {
  if (!slug) {
    return {
      success: false,
      message: 'اسلاگ نامعتبر است.',
      error: 'اسلاگ نمی‌تواند خالی باشد.',
    };
  }

  try {

    const post = await prisma.post.findUnique({
      where: { slug: slug },
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
      data: post,
    };
  } catch (error) {

    return {
      success: false,
      message: 'خطا در بازیابی پست. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
