'use server';

import prisma from '@/lib/db';
import type { ActionResult, TaxonomyType } from '@/types/types';

export async function getTags(
  limit = 10,
): Promise<ActionResult<{ tags: TaxonomyType[]; totalCount: number }>> {
  try {
    const [tags, totalCount] = await Promise.all([
      prisma.tag.findMany({
        take: limit,
        include: {
          _count: {
            select: { posts: true },
          },
        },
        orderBy: {
          posts: {
            _count: 'desc',
          },
        },
      }),
      prisma.tag.count(),
    ]);

    const formattedTags: TaxonomyType[] = tags.map((tag) => ({
      ...tag,
      taxonomy: 'tag',
      count: tag._count.posts,
      color: 'indigo',
    }));

    return {
      success: true,
      message: 'تگ‌ها با موفقیت بازیابی شدند.',
      data: {
        tags: formattedTags,
        totalCount,
      },
    };
  } catch (error) {
    console.error('خطا در بازیابی تگ‌ها:', error);
    return {
      success: false,
      message: 'خطا در بازیابی تگ‌ها. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
