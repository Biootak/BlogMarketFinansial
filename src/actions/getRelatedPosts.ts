'use server';

import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';

export async function getRelatedPosts(
  postId: string,
  categoryIds: string[],
): Promise<ActionResult<PostWithRelations[]>> {
  try {
    const relatedPosts = await prisma.post.findMany({
      where: {
        id: { not: postId },
        categories: {
          some: {
            id: { in: categoryIds },
          },
        },
      },
      take: 4,
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        categories: true,
        tags: true,
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

    return {
      success: true,
      message: 'پست‌های مرتبط با موفقیت بازیابی شدند.',
      data: relatedPosts,
    };
  } catch (error) {
    console.error('Error retrieving related posts:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌های مرتبط. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
