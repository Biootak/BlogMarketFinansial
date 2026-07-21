'use server';

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import type {
  ActionResult,
  CategoryWithPostCount,
  PostWithRelations,
  UserWithProfile,
} from '@/types/types';

// Cache search results for 60 seconds — safeCache prevents DB-failure crash
const getCachedPosts = safeCache(
  async (query: string) => {
    return prisma.post.findMany({
      where: {
        AND: [{ title: { contains: query, mode: 'insensitive' } }, { status: 'PUBLISHED' }],
      },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        postType: true,
        featuredImage: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { avatar: true } },
          },
        },
        categories: {
          select: { id: true, name: true, slug: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  [],
  { key: 'search-posts', ttl: 60, tags: ['search', 'posts'] },
);

const getCachedCategories = safeCache(
  async (query: string) => {
    return prisma.category.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { posts: true } },
      },
    });
  },
  [],
  { key: 'search-categories', ttl: 60, tags: ['search', 'categories'] },
);

const getCachedAuthors = safeCache(
  async (query: string) => {
    return prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        role: { in: ['ADMIN', 'AUTHOR'] },
      },
      take: 4,
      select: {
        id: true,
        name: true,
        image: true,
        profile: { select: { avatar: true } },
      },
    });
  },
  [],
  { key: 'search-authors', ttl: 60, tags: ['search'] },
);

export async function searchPosts(query: string): Promise<ActionResult<PostWithRelations[]>> {
  try {
    if (!query || query.length < 2) {
      return { success: true, message: '', data: [] };
    }
    const posts = await getCachedPosts(query);
    return {
      success: true,
      message: 'پست‌ها با موفقیت جستجو شدند.',
      data: posts as PostWithRelations[],
    };
  } catch {
    return {
      success: false,
      message: 'خطا در جستجوی پست‌ها.',
    };
  }
}

export async function searchCategories(
  query: string,
): Promise<ActionResult<CategoryWithPostCount[]>> {
  try {
    const categories = await getCachedCategories(query);
    return {
      success: true,
      message: 'دسته‌بندی‌ها با موفقیت جستجو شدند.',
      data: categories as CategoryWithPostCount[],
    };
  } catch {
    return {
      success: false,
      message: 'خطا در جستجوی دسته‌بندی‌ها.',
    };
  }
}

export async function searchAuthors(query: string): Promise<ActionResult<UserWithProfile[]>> {
  try {
    const authors = await getCachedAuthors(query);
    return {
      success: true,
      message: 'نویسندگان با موفقیت جستجو شدند.',
      data: authors as UserWithProfile[],
    };
  } catch {
    return {
      success: false,
      message: 'خطا در جستجوی نویسندگان.',
    };
  }
}

// Combined search for better performance - single request
export async function searchAll(query: string) {
  try {
    if (!query || query.length < 2) {
      return { success: true, data: { posts: [], categories: [], authors: [] } };
    }

    const [posts, categories, authors] = await Promise.all([
      getCachedPosts(query),
      getCachedCategories(query),
      getCachedAuthors(query),
    ]);

    return {
      success: true,
      data: { posts, categories, authors },
    };
  } catch {
    return {
      success: false,
      data: { posts: [], categories: [], authors: [] },
    };
  }
}
