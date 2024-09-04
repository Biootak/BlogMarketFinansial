'use server';

import prisma from '@/lib/db';
import { generateColor } from '@/lib/utils';
import type { ActionResult, TaxonomyType } from '@/types/types';

export async function getCategories(
  options: { limit?: number; page?: number; search?: string } = {},
): Promise<ActionResult<{ categories: TaxonomyType[]; totalCount: number }>> {
  try {
    const { limit = 10, page = 1, search = '' } = options;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const [categories, totalCount] = await Promise.all([
      prisma.category.findMany({
        where,
        take: limit,
        skip: skip,
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
      prisma.category.count({ where }),
    ]);

    const formattedCategories: TaxonomyType[] = categories.map((category) => ({
      ...category,
      taxonomy: 'category',
      count: category._count.posts,
      color: generateColor(category.id),
    }));

    return {
      success: true,
      message: 'دسته‌بندی‌ها با موفقیت بازیابی شدند.',
      data: {
        categories: formattedCategories,
        totalCount,
      },
    };
  } catch (error) {
    console.error('خطا در بازیابی دسته‌بندی‌ها:', error);
    return {
      success: false,
      message: 'خطا در بازیابی دسته‌بندی‌ها. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
