'use server';

import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';

export async function getPostBySlug(slug: string): Promise<ActionResult<PostWithRelations>> {
  console.log('getPostBySlug: Called with slug:', slug);
  if (!slug) {
    console.log('getPostBySlug: Invalid slug');
    return {
      success: false,
      message: 'اسلاگ نامعتبر است.',
      error: 'اسلاگ نمی‌تواند خالی باشد.',
    };
  }

  try {
    console.log('getPostBySlug: Querying database for post');
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
      console.log('getPostBySlug: No post found with slug:', slug);
      return { success: false, message: 'پست یافت نشد.', error: 'پست یافت نشد.' };
    }

    console.log('getPostBySlug: Post found:', post.slug);
    return {
      success: true,
      message: 'پست با موفقیت بازیابی شد.',
      data: post,
    };
  } catch (error) {
    console.error('getPostBySlug: Error retrieving post:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
