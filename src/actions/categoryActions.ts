'use server';

import { logActivity } from '@/lib/activity-logger';
import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache'; // 2026-06-21: جایگزین unstable_cache شد
import { generateColor, generateSlug, validateSlug } from '@/lib/utils';
import type {
  ActionResult,
  CreateCategoryInput,
  TaxonomyType,
  UpdateCategoryInput,
} from '@/types/types';
import { cache } from 'react';

export const getCategories = cache(
  async (
    options: { limit?: number; page?: number; search?: string } = {},
  ): Promise<ActionResult<{ categories: TaxonomyType[]; totalCount: number }>> => {
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
    } catch {
      return {
        success: false,
        message: 'خطا در بازیابی دسته‌بندی‌ها. لطفاً دوباره تلاش کنید.',
      };
    }
  },
);

export async function createCategory(
  data: CreateCategoryInput,
): Promise<ActionResult<TaxonomyType>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    const {
      name,
      slug: providedSlug,
      thumbnail,
      thumbnailWidth,
      thumbnailHeight,
      parentIds = [],
    } = data;

    if (!name) {
      return {
        success: false,
        message: 'نام دسته‌بندی الزامی است.',
      };
    }

    let slug = providedSlug || generateSlug(name);
    slug = generateSlug(slug);

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

    // 2026-06-14: replaced the N+1 while-loop (one findUnique per
    // candidate slug) with a single startsWith query. In the worst
    // case this was 1000 round-trips; now it's always 1.
    const existingSlugs = new Set(
      (
        await prisma.category.findMany({
          where: { slug: { startsWith: slug } },
          select: { slug: true },
        })
      ).map((c) => c.slug),
    );
    let uniqueSlug = slug;
    let slugCounter = 1;
    while (existingSlugs.has(uniqueSlug)) {
      uniqueSlug = `${slug}-${slugCounter}`;
      slugCounter++;
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        slug: uniqueSlug,
        thumbnail,
        thumbnailWidth: thumbnailWidth ?? null,
        thumbnailHeight: thumbnailHeight ?? null,
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

    // ثبت فعالیت
    await logActivity('ایجاد دسته‌بندی', `دسته‌بندی "${name}" ایجاد شد`);

    // 2026-06-19: bust category caches so the home page + archive pick
    // up the new category without waiting for the 60s TTL.
    revalidateTag('categories');

    return {
      success: true,
      message: 'دسته‌بندی با موفقیت ایجاد شد.',
      data: formattedCategory,
    };
  } catch {
    return {
      success: false,
      message: 'خطا در ایجاد دسته‌بندی. لطفاً دوباره تلاش کنید.',
    };
  }
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryInput,
): Promise<ActionResult<TaxonomyType>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    const {
      name,
      slug: providedSlug,
      thumbnail,
      thumbnailWidth,
      thumbnailHeight,
      parentIds = [],
    } = data;

    if (!name) {
      return {
        success: false,
        message: 'نام دسته‌بندی الزامی است.',
      };
    }

    let slug = providedSlug || generateSlug(name);
    slug = generateSlug(slug);

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
      // 2026-06-14: same N+1 → 1-shot as createCategory. One
      // startsWith query gives us the set of slugs that would
      // collide, then we pick the next free one in memory.
      const existingSlugs = new Set(
        (
          await prisma.category.findMany({
            where: { slug: { startsWith: slug }, NOT: { id } },
            select: { slug: true },
          })
        ).map((c) => c.slug),
      );
      let slugCounter = 1;
      while (existingSlugs.has(uniqueSlug)) {
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
        thumbnailWidth: thumbnailWidth ?? null,
        thumbnailHeight: thumbnailHeight ?? null,
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

    // ثبت فعالیت
    await logActivity('ویرایش دسته‌بندی', `دسته‌بندی "${name}" ویرایش شد`);

    revalidateTag('categories');

    return {
      success: true,
      message: 'دسته‌بندی با موفقیت به‌روزرسانی شد.',
      data: formattedCategory,
    };
  } catch {
    return {
      success: false,
      message: 'خطا در به‌روزرسانی دسته‌بندی. لطفاً دوباره تلاش کنید.',
    };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
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

    const categoryName = category.name;

    await prisma.category.delete({
      where: { id },
    });

    // ثبت فعالیت
    await logActivity('حذف دسته‌بندی', `دسته‌بندی "${categoryName}" حذف شد`);

    revalidateTag('categories');

    return {
      success: true,
      message: 'دسته‌بندی با موفقیت حذف شد.',
    };
  } catch {
    return {
      success: false,
      message: 'خطا در حذف دسته‌بندی. لطفاً دوباره تلاش کنید.',
    };
  }
}

export const getAllParentCategories = cache(async (): Promise<ActionResult<TaxonomyType[]>> => {
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
  } catch {
    return {
      success: false,
      message: 'خطا در بازیابی دسته‌بندی‌ها. لطفاً دوباره تلاش کنید.',
    };
  }
});

/**
 * 2026-06-19: previously wrapped only with `cache` (react.cache) which is
 * per-request dedupe — every new request re-hit the DB. On Neon (autosuspend
 * + cross-region RTT) that meant a fresh ~1.7s round-trip on every home-page
 * load. Wrapping with `unstable_cache` (60s, tag `categories`) eliminates
 * the round-trip on cache hits while the inner `cache` still dedupes
 * multiple consumers within one render. Mirrors the `getTopAuthors` pattern.
 */
async function fetchPopularCategoriesForHomeRaw(
  limit = 16,
): Promise<ActionResult<{ categories: TaxonomyType[] }>> {
  try {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
    const rows = await prisma.category.findMany({
      where: { parentCategories: { none: {} } },
      take: safeLimit,
      orderBy: { posts: { _count: 'desc' } },
      include: {
        _count: { select: { posts: true } },
        childCategories: {
          include: { _count: { select: { posts: true } } },
        },
      },
    });

    const categories: TaxonomyType[] = rows.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      thumbnail: category.thumbnail,
      taxonomy: 'category',
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
      parentCategories: [],
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    return {
      success: true,
      message: 'دسته‌بندی‌های محبوب با موفقیت بازیابی شدند.',
      data: { categories },
    };
  } catch {
    return {
      success: false,
      message: 'خطا در دریافت دسته‌بندی‌های محبوب. لطفاً دوباره تلاش کنید.',
    };
  }
}

// 2026-06-21: قبلاً unstable_cache بود. حالا safeCache که اگر DB
// قطع باشد stale value یا fallback برمی‌گرداند.
const FALLBACK_POPULAR_CATS: ActionResult<{ categories: TaxonomyType[] }> = {
  success: true,
  message: 'دسته‌بندی‌های محبوب (fallback)',
  data: { categories: [] },
};

const getCachedPopularCategoriesForHome = safeCache(
  fetchPopularCategoriesForHomeRaw,
  FALLBACK_POPULAR_CATS,
  {
    key: 'popular-categories-home',
    ttl: 60,
    tags: ['categories', 'popular-categories-home'],
  },
);

export const getPopularCategoriesForHome = cache(
  async (limit = 16): Promise<ActionResult<{ categories: TaxonomyType[] }>> => {
    return getCachedPopularCategoriesForHome(limit);
  },
);

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
