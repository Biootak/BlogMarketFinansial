'use server';

import prisma from '@/lib/db';
import type { SearchActionResult, SearchResultItem } from '@/types/types';

export async function getSearchResults(
  searchQuery: string,
  activeTab: string,
  page: number,
): Promise<SearchActionResult> {
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  try {
    // Prisma returns partial shapes per switch-case tab (Post | Category | Tag | User).
    // Each branch queries only the fields needed for display — the shapes are compatible
    // with SearchResultItem but TS cannot verify structural compatibility across union branches.
    // Narrowing to SearchResultItem[] via `as` at each assignment site makes the intent explicit.
    let posts: SearchResultItem[];
    let total: number;

    switch (activeTab) {
      case 'مقالات': {
        const where = {
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' as const } },
            { content: { contains: searchQuery, mode: 'insensitive' as const } },
          ],
          status: 'PUBLISHED' as const,
        };
        [posts, total] = (await Promise.all([
          prisma.post.findMany({
            where,
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              featuredImage: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  profile: { select: { avatar: true } },
                },
              },
              categories: { select: { id: true, name: true, slug: true } },
              tags: { select: { id: true, name: true, slug: true } },
              _count: { select: { comments: true, likes: true, savedBy: true } },
            },
            skip,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.post.count({ where }),
        ])) as unknown as [SearchResultItem[], number];
        break;
      }
      case 'دسته‌بندی‌ها': {
        const where = { name: { contains: searchQuery, mode: 'insensitive' as const } };
        [posts, total] = (await Promise.all([
          prisma.category.findMany({
            where,
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              _count: { select: { posts: true } },
            },
            skip,
            take: pageSize,
          }),
          prisma.category.count({ where }),
        ])) as unknown as [SearchResultItem[], number];
        break;
      }
      case 'برچسب‌ها': {
        const where = { name: { contains: searchQuery, mode: 'insensitive' as const } };
        [posts, total] = (await Promise.all([
          prisma.tag.findMany({
            where,
            select: {
              id: true,
              name: true,
              slug: true,
              _count: { select: { posts: true } },
            },
            skip,
            take: pageSize,
          }),
          prisma.tag.count({ where }),
        ])) as unknown as [SearchResultItem[], number];
        break;
      }
      case 'نویسندگان': {
        const where = { name: { contains: searchQuery, mode: 'insensitive' as const } };
        [posts, total] = (await Promise.all([
          prisma.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              image: true,
              profile: { select: { avatar: true, bio: true, jobName: true } },
              _count: { select: { posts: true } },
            },
            skip,
            take: pageSize,
          }),
          prisma.user.count({ where }),
        ])) as unknown as [SearchResultItem[], number];
        break;
      }
      default:
        return {
          success: false,
          message: 'تب نامعتبر است',
          error: 'Invalid tab',
        };
    }

    return {
      success: true,
      message: 'نتایج جستجو با موفقیت دریافت شد',
      data: { posts, total, pages: Math.ceil(total / pageSize) },
    };
  } catch {
    return {
      success: false,
      message: 'خطا در جستجو',
    };
  }
}
