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

export async function createCategory(data: FormData): Promise<ActionResult<TaxonomyType>> {
  try {
    const name = data.get('name') as string;
    const thumbnail = data.get('thumbnail') as string | null;

    const newCategory = await prisma.category.create({
      data: {
        name,
        thumbnail,
        slug: name.toLowerCase().replace(/ /g, '-'),
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    const formattedCategory: TaxonomyType = {
      ...newCategory,
      taxonomy: 'category',
      color: generateColor(newCategory.id),
    };

    return {
      success: true,
      message: 'دسته‌بندی با موفقیت ایجاد شد.',
      data: formattedCategory,
    };
  } catch (error) {
    console.error('خطا در ایجاد دسته‌بندی:', error);
    return {
      success: false,
      message: 'خطا در ایجاد دسته‌بندی. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateCategory(
  id: string,
  data: FormData,
): Promise<ActionResult<TaxonomyType>> {
  try {
    const name = data.get('name') as string;
    const thumbnail = data.get('thumbnail') as string | null;

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        thumbnail,
        slug: name.toLowerCase().replace(/ /g, '-'),
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    const formattedCategory: TaxonomyType = {
      ...updatedCategory,
      taxonomy: 'category',
      color: generateColor(updatedCategory.id), 
    };

    return {
      success: true,
      message: 'دسته‌بندی با موفقیت به‌روزرسانی شد.',
      data: formattedCategory,
    };
  } catch (error) {
    console.error('خطا در به‌روزرسانی دسته‌بندی:', error);
    return {
      success: false,
      message: 'خطا در به‌روزرسانی دسته‌بندی. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await prisma.category.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'دسته‌بندی با موفقیت حذف شد.',
    };
  } catch (error) {
    console.error('خطا در حذف دسته‌بندی:', error);
    return {
      success: false,
      message: 'خطا در حذف دسته‌بندی. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
