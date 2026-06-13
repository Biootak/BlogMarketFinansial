'use server';

/**
 * getLatestPostCategories — لیست دسته‌بندی‌هایی که مقاله‌ی منتشرشده دارن
 *
 * - فقط parent categories (نه child/زیردسته) — تا تب‌ها تخت و قابل پیمایش باشن
 * - فقط دسته‌هایی که حداقل یک Post با status=PUBLISHED دارن
 * - مرتب‌سازی بر اساس تعداد مقالات منتشرشده (نزولی) + نام برای tie-break
 * - کش ۶۰ ثانیه با تگ `latest-post-categories` (با revalidatePostCache قابل invalidate)
 *
 * چرا این اکشن جدا نوشته شد:
 *   1. `getCategories` همه‌ی دسته‌ها (حتی خالی) رو برمی‌گردونه و order by
 *      relation-count که شامل child categories هم می‌شه. ما فقط parent های فعال
 *      می‌خوایم.
 *   2. `getCategories` ترتیب فارسی الفبایی نداره — برای تب بهتره به ترتیب تعداد
 *      مقالات باشه.
 *   3. نوع خروجی `Category` ساده هست (نه TaxonomyType با child/parent) تا کامپوننت
 *      ClientSidePosts لازم نباشه در مورد ساختار درختی فکر کنه.
 */

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { PostStatus } from '@prisma/client';

export interface LatestPostCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

async function loadLatestPostCategories(): Promise<LatestPostCategory[]> {
  try {
    /* فقط parent categories (parentCategories.length === 0) که حداقل یک مقاله‌ی
     * منتشرشده دارن. این query به Prisma می‌گه فقط parent ها رو برگردون (نه child)
     * چون اگه parent داشته باشن، join نکنه. */
    const categories = await prisma.category.findMany({
      where: {
        parentCategories: { none: {} },
        posts: {
          some: {
            status: PostStatus.PUBLISHED,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            posts: {
              where: {
                status: PostStatus.PUBLISHED,
              },
            },
          },
        },
      },
      orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      take: 20, // safety cap
    });

    return categories
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        slug: c.slug,
        postCount: c._count.posts,
      }))
      .filter((c) => c.name.length > 0);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getLatestPostCategories] error:', err);
    }
    return [];
  }
}

export const getLatestPostCategories = unstable_cache(
  loadLatestPostCategories,
  ['latest-post-categories-v1'],
  {
    revalidate: 60,
    tags: ['latest-post-categories', 'posts', 'categories'],
  },
);
