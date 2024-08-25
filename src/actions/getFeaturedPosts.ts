'use server';

import { PostStatus } from '@prisma/client';
import prisma from '@/lib/db';
import type { ActionResult, PostWithRelations } from '@/types/types';

export async function getFeaturedPosts(limit = 3): Promise<ActionResult<PostWithRelations[]>> {
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
          include: { profile: true },
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
      message: 'پست‌های ویژه با موفقیت بازیابی شدند.',
      data: posts,
    };
  } catch (error) {
    console.error('خطا در بازیابی پست‌های ویژه:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌های ویژه. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}