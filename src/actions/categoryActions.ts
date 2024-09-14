'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { generateColor, generateSlug, sanitizeSlug, validateSlug } from '@/lib/utils';
import type {
  ActionResult,
  TaxonomyType,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/types/types';

export async function getCategories(
  options: { limit?: number; page?: number; search?: string } = {},
): Promise<ActionResult<{ categories: TaxonomyType[]; totalCount: number }>> {
  const { limit = 10, page = 1, search = '' } = options;
  const skip = (page - 1) * limit;

  try {
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
          childCategories: {
            include: {
              _count: {
                select: { posts: true },
              },
            },
          },
          parentCategories: true,
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
      id: category.id,
      name: category.name,
      slug: category.slug,
      thumbnail: category.thumbnail,
      taxonomy: category.parentCategories.length > 0 ? 'subcategory' : 'category',
      color: generateColor(category.id),
      count: category._count.posts,
      childCategories: category.childCategories.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        thumbnail: child.thumbnail,
        taxonomy: 'subcategory',
        color: generateColor(child.id),
        count: child._count.posts,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
      })),
      parentCategories: category.parentCategories.map((parent) => ({
        id: parent.id,
        name: parent.name,
        slug: parent.slug,
        thumbnail: parent.thumbnail,
        taxonomy: 'category',
        color: generateColor(parent.id),
        count: 0,
        createdAt: parent.createdAt,
        updatedAt: parent.updatedAt,
      })),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
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
    const { name, slug: providedSlug, thumbnail, parentIds = [] } = data;

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

    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }],
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
        parentCategories: {
          connect: Array.isArray(parentIds) ? parentIds.map((id) => ({ id })) : [],
        },
      },
      include: {
        _count: {
          select: { posts: true },
        },
        parentCategories: true,
        childCategories: true,
      },
    });

    const formattedCategory: TaxonomyType = {
      ...newCategory,
      taxonomy: newCategory.parentCategories.length > 0 ? 'subcategory' : 'category',
      color: generateColor(newCategory.id),
      count: 0,
      childCategories: [],
      parentCategories: newCategory.parentCategories.map((parent) => ({
        id: parent.id,
        name: parent.name,
        slug: parent.slug,
        thumbnail: parent.thumbnail,
        taxonomy: 'category',
        color: generateColor(parent.id),
        count: 0,
        createdAt: parent.createdAt,
        updatedAt: parent.updatedAt,
      })),
    };

    revalidatePath('/categories');

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
    const { name, slug: providedSlug, thumbnail, parentIds = [] } = data;

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

    const currentCategory = await prisma.category.findUnique({ where: { id } });
    let uniqueSlug = slug;
    if (currentCategory && currentCategory.slug !== slug) {
      let slugCounter = 1;
      while (await prisma.category.findFirst({ where: { slug: uniqueSlug, NOT: { id } } })) {
        uniqueSlug = `${slug}-${slugCounter}`;
        slugCounter++;
      }
    }

    const isCircular = await checkCircularReference(id, parentIds);
    if (isCircular) {
      return {
        success: false,
        message: 'نمی‌توانید یک دسته‌بندی را به زیرمجموعه خودش تبدیل کنید.',
      };
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug: uniqueSlug,
        thumbnail,
        parentCategories: {
          set: Array.isArray(parentIds) ? parentIds.map((id) => ({ id })) : [],
        },
      },
      include: {
        _count: {
          select: { posts: true },
        },
        childCategories: {
          include: {
            _count: {
              select: { posts: true },
            },
          },
        },
        parentCategories: true,
      },
    });

    const formattedCategory: TaxonomyType = {
      ...updatedCategory,
      taxonomy: updatedCategory.parentCategories.length > 0 ? 'subcategory' : 'category',
      color: generateColor(updatedCategory.id),
      count: updatedCategory._count.posts,
      childCategories: updatedCategory.childCategories.map((subCategory) => ({
        id: subCategory.id,
        name: subCategory.name,
        slug: subCategory.slug,
        thumbnail: subCategory.thumbnail,
        taxonomy: 'subcategory',
        color: generateColor(subCategory.id),
        count: subCategory._count.posts,
        createdAt: subCategory.createdAt,
        updatedAt: subCategory.updatedAt,
      })),
      parentCategories: updatedCategory.parentCategories.map((parent) => ({
        id: parent.id,
        name: parent.name,
        slug: parent.slug,
        thumbnail: parent.thumbnail,
        taxonomy: 'category',
        color: generateColor(parent.id),
        count: 0,
        createdAt: parent.createdAt,
        updatedAt: parent.updatedAt,
      })),
    };

    revalidatePath('/categories');

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
      include: { childCategories: true },
    });

    if (!category) {
      return {
        success: false,
        message: 'دسته‌بندی مورد نظر یافت نشد.',
      };
    }

    if (category.childCategories.length > 0) {
      return {
        success: false,
        message: 'این دسته‌بندی دارای زیردسته‌بندی است و نمی‌تواند حذف شود.',
      };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath('/categories');

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
    const allCategories = await prisma.category.findMany({
      include: {
        _count: {
          select: { posts: true, childCategories: true },
        },
        parentCategories: true,
        childCategories: {
          include: {
            _count: {
              select: { posts: true },
            },
          },
        },
      },
    });

    const formattedCategories: TaxonomyType[] = allCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      thumbnail: category.thumbnail,
      taxonomy: category.parentCategories.length > 0 ? 'subcategory' : 'category',
      color: generateColor(category.id),
      count: category._count.posts,
      childCategories: category.childCategories.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        thumbnail: child.thumbnail,
        taxonomy: 'subcategory',
        color: generateColor(child.id),
        count: child._count.posts,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
      })),
      parentCategories: category.parentCategories.map((parent) => ({
        id: parent.id,
        name: parent.name,
        slug: parent.slug,
        thumbnail: parent.thumbnail,
        taxonomy: 'category',
        color: generateColor(parent.id),
        count: 0,
        createdAt: parent.createdAt,
        updatedAt: parent.updatedAt,
      })),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    return {
      success: true,
      message: 'تمام دسته‌بندی‌ها با موفقیت بازیابی شدند.',
      data: formattedCategories,
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

async function checkCircularReference(categoryId: string, parentIds: string[]): Promise<boolean> {
  const queue = [...parentIds];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === categoryId) {
      return true; // حلقه پیدا شد
    }

    if (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const parent = await prisma.category.findUnique({
        where: { id: currentId },
        include: { parentCategories: true },
      });
      if (parent) {
        queue.push(...parent.parentCategories.map((p) => p.id));
      }
    }
  }

  return false; // حلقه‌ای پیدا نشد
}
