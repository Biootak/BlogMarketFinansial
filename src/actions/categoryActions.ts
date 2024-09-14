'use server';

import prisma from '@/lib/db';
import { generateColor, generateSlug, sanitizeSlug, validateSlug } from '@/lib/utils';
import type {
  ActionResult,
  TaxonomyType,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryWithParent,
} from '@/types/types';
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
          subCategories: {
            include: {
              _count: {
                select: { posts: true },
              },
            },
          },
          parentCategory: true,
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
      taxonomy: category.parentCategory ? 'subcategory' : 'category',
      color: generateColor(category.id),
      count: category._count.posts,
      subCategories: category.subCategories.map((subCategory) => ({
        ...subCategory,
        taxonomy: 'subcategory',
        color: generateColor(subCategory.id),
        count: subCategory._count.posts,
      })),
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

export async function createCategory(
  data: CreateCategoryInput,
): Promise<ActionResult<TaxonomyType>> {
  try {
    const { name, slug: providedSlug, thumbnail, parentId } = data;

    if (!name) {
      return {
        success: false,
        message: 'نام دسته‌بندی الزامی است.',
      };
    }

    let slug = providedSlug || generateSlug(name);
    slug = sanitizeSlug(slug);

    if (!validateSlug(slug)) {
      return {
        success: false,
        message: 'اسلاگ نامعتبر است. لطفاً فقط از حروف کوچک انگلیسی، اعداد و خط فاصله استفاده کنید.',
      };
    }

    // بررسی وجود دسته‌بندی با نام یا اسلاگ مشابه
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }],
        parentId,
      },
    });

    if (existingCategory) {
      return {
        success: false,
        message:
          existingCategory.name === name
            ? 'دسته‌بندی با این نام قبلاً وجود دارد. لطفاً نام دیگری انتخاب کنید.'
            : 'دسته‌بندی با این اسلاگ قبلاً وجود دارد. لطفاً اسلاگ دیگری انتخاب کنید.',
      };
    }

    // اگر اسلاگ تکراری باشد، یک اسلاگ جدید ایجاد می‌کنیم
    let uniqueSlug = slug;
    let slugCounter = 1;
    while (await prisma.category.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${slugCounter}`;
      slugCounter++;
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        slug: uniqueSlug,
        thumbnail,
        parentId: parentId === 'none' ? null : parentId,
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    const formattedCategory: TaxonomyType = {
      ...newCategory,
      taxonomy: parentId ? 'subcategory' : 'category',
      color: generateColor(newCategory.id),
      count: 0,
      subCategories: [],
    };

    revalidatePath('/admin/categories');
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
  data: UpdateCategoryInput,
): Promise<ActionResult<TaxonomyType>> {
  try {
    if (!data) {
      return {
        success: false,
        message: 'داده‌های به‌روزرسانی نامعتبر است.',
      };
    }

    const { name, slug: providedSlug, thumbnail, parentId } = data;

    if (!name) {
      return {
        success: false,
        message: 'نام دسته‌بندی الزامی است.',
      };
    }

    let slug = providedSlug || generateSlug(name);
    slug = sanitizeSlug(slug);

    if (!validateSlug(slug)) {
      return {
        success: false,
        message: 'اسلاگ نامعتبر است. لطفاً فقط از حروف کوچک انگلیسی، اعداد و خط فاصله استفاده کنید.',
      };
    }

    // بررسی وجود دسته‌بندی با نام یا اسلاگ مشابه (به جز دسته‌بندی فعلی)
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }],
        NOT: { id },
      },
    });

    if (existingCategory) {
      return {
        success: false,
        message:
          existingCategory.name === name
            ? 'دسته‌بندی با این نام قبلاً وجود دارد. لطفاً نام دیگری انتخاب کنید.'
            : 'دسته‌بندی با این اسلاگ قبلاً وجود دارد. لطفاً اسلاگ دیگری انتخاب کنید.',
      };
    }

    // اگر اسلاگ تغییر کرده و تکراری باشد، یک اسلاگ جدید ایجاد می‌کنیم
    const currentCategory = await prisma.category.findUnique({ where: { id } });
    let uniqueSlug = slug;
    if (currentCategory && currentCategory.slug !== slug) {
      let slugCounter = 1;
      while (await prisma.category.findFirst({ where: { slug: uniqueSlug, NOT: { id } } })) {
        uniqueSlug = `${slug}-${slugCounter}`;
        slugCounter++;
      }
    }

    // بررسی حلقه در ساختار درختی
    if (parentId && parentId !== 'none') {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        include: { parentCategory: true },
      });
      if (parent) {
        let currentParent: CategoryWithParent | null = parent as CategoryWithParent;
        while (currentParent) {
          if (currentParent.id === id) {
            return {
              success: false,
              message: 'نمی‌توانید یک دسته‌بندی را به زیرمجموعه خودش تبدیل کنید.',
              
            };
          }
          currentParent = currentParent.parentCategory;
        }
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug: uniqueSlug,
        thumbnail,
        parentId: parentId === 'none' ? null : parentId,
      },
      include: {
        _count: {
          select: { posts: true },
        },
        subCategories: {
          include: {
            _count: {
              select: { posts: true },
            },
          },
        },
      },
    });

    const formattedCategory: TaxonomyType = {
      ...updatedCategory,
      taxonomy: updatedCategory.parentId ? 'subcategory' : 'category',
      color: generateColor(updatedCategory.id),
      count: updatedCategory._count.posts,
      subCategories: updatedCategory.subCategories.map((subCategory) => ({
        ...subCategory,
        taxonomy: 'subcategory',
        color: generateColor(subCategory.id),
        count: subCategory._count.posts,
      })),
    };

    revalidatePath('/admin/categories');
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
    const category = await prisma.category.findUnique({
      where: { id },
      include: { subCategories: true },
    });

    if (!category) {
      return {
        success: false,
        message: 'دسته‌بندی مورد نظر یافت نشد.',
      };
    }

    if (category.subCategories.length > 0) {
      return {
        success: false,
        message: 'این دسته‌بندی دارای زیردسته‌بندی است و نمی‌تواند حذف شود.',
      };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath('/admin/categories');
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

export async function getAllParentCategories(): Promise<ActionResult<TaxonomyType[]>> {
  try {
    const parentCategories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        _count: {
          select: { posts: true, subCategories: true },
        },
      },
    });

    const formattedCategories: TaxonomyType[] = parentCategories.map((category) => ({
      ...category,
      taxonomy: 'category',
      color: generateColor(category.id),
      count: category._count.posts,
      subCategoriesCount: category._count.subCategories,
    }));

    return {
      success: true,
      message: 'دسته‌بندی‌های والد با موفقیت بازیابی شدند.',
      data: formattedCategories,
    };
  } catch (error) {
    console.error('خطا در بازیابی دسته‌بندی‌های والد:', error);
    return {
      success: false,
      message: 'خطا در بازیابی دسته‌بندی‌های والد. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
