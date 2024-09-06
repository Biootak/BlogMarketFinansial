'use server';

import prisma from '@/lib/db';
import { checkRole } from '@/lib/utils';
import type { ActionResult } from '@/types/types';

export async function getPopularPosts(): Promise<
  ActionResult<
    Array<{
      id: string;
      title: string;
      views: number;
      publishDate: string;
      author: string;
      slug: string;
    }>
  >
> {
  await checkRole(['ADMIN', 'AUTHOR']);

  try {
    const popularPosts = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: {
        viewCount: 'desc',
      },
      take: 5,
      select: {
        id: true,
        title: true,
        viewCount: true,
        createdAt: true,
        slug: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });

    const formattedPosts = popularPosts.map((post) => ({
      id: post.id,
      title: post.title,
      views: post.viewCount,
      publishDate: post.createdAt.toLocaleDateString('fa-IR'),
      author: post.author.name || 'ناشناس',
      slug: post.slug,
    }));

    return {
      success: true,
      message: 'پست‌های محبوب با موفقیت بازیابی شدند.',
      data: formattedPosts,
    };
  } catch (error) {
    console.error('خطا در بازیابی پست‌های محبوب:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌های محبوب. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
