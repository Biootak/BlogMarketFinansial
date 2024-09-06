'use server';

import prisma from '@/lib/db';
import { generateColor, generateSlug, sanitizeSlug, validateSlug } from '@/lib/utils';
import type { ActionResult, TaxonomyType, CategoryWithPostCount } from '@/types/types';
import { revalidatePath, revalidateTag } from 'next/cache';

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
      color: generateColor(category.id),
      count: category._count.posts,
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
    let slug = data.get('slug') as string;

    if (!slug) {
      slug = generateSlug(name);
    } else {
      slug = sanitizeSlug(slug);
    }

    if (!validateSlug(slug)) {
      return {
        success: false,
        message: 'اسلاگ نامعتبر است. لطفاً فقط از حروف کوچک انگلیسی، اعداد و خط فاصله استفاده کنید.',
      };
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name,
      },
    });

    if (existingCategory) {
      return {
        success: false,
        message: 'دسته‌بندی با این نام قبلاً وجود دارد. لطفاً نام دیگری انتخاب کنید.',
      };
    }

    let slugExists = await prisma.category.findUnique({ where: { slug } });
    let slugAttempt = 1;
    while (slugExists) {
      slug = `${slug}-${slugAttempt}`;
      slugExists = await prisma.category.findUnique({ where: { slug } });
      slugAttempt++;
    }

    const thumbnail = data.get('thumbnail') as string | null;

    const newCategory = await prisma.category.create({
      data: {
        name,
        slug,
        thumbnail,
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

    // تازه‌سازی صفحات مرتبط
    revalidatePath('/categories');
    revalidatePath('/');
    revalidateTag('categories');

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
    let slug = data.get('slug') as string;

    if (!slug) {
      slug = generateSlug(name);
    } else {
      slug = sanitizeSlug(slug);
    }

    if (!validateSlug(slug)) {
      return {
        success: false,
        message: 'اسلاگ نامعتبر است. لطفاً فقط از حروف کوچک انگلیسی، اعداد و خط فاصله استفاده کنید.',
      };
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name,
        NOT: {
          id: id,
        },
      },
    });

    if (existingCategory) {
      return {
        success: false,
        message: 'دسته‌بندی با این نام قبلاً وجود دارد. لطفاً نام دیگری انتخاب کنید.',
      };
    }

    const currentCategory = await prisma.category.findUnique({ where: { id } });
    if (currentCategory && currentCategory.slug !== slug) {
      let slugExists = await prisma.category.findFirst({ where: { slug, NOT: { id } } });
      let slugAttempt = 1;
      while (slugExists) {
        slug = `${slug}-${slugAttempt}`;
        slugExists = await prisma.category.findFirst({ where: { slug, NOT: { id } } });
        slugAttempt++;
      }
    }

    const thumbnail = data.get('thumbnail') as string | null;

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        thumbnail,
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

    // تازه‌سازی صفحات مرتبط
    revalidatePath('/categories');
    revalidatePath(`/category/${slug}`);
    revalidatePath('/');
    revalidateTag('categories');

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
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return {
        success: false,
        message: 'دسته‌بندی مورد نظر یافت نشد.',
      };
    }

    await prisma.category.delete({
      where: { id },
    });

    // تازه‌سازی صفحات مرتبط
    revalidatePath('/categories');
    revalidatePath(`/category/${category.slug}`);
    revalidatePath('/');
    revalidateTag('categories');

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
