'use server';

import prisma from '@/lib/db';
import type { SearchActionResult } from '@/types/types';

export async function getSearchResults(
  searchQuery: string,
  activeTab: string,
  page: number,
): Promise<SearchActionResult> {
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  try {
    // SearchResultItem is a union type (Post | Category | Tag | User).
    // The actual queries return shaped subsets of each; we cast to SearchResultItem[]
    // at the return boundary where the shape is known to be compatible.
    // biome-ignore lint/suspicious/noExplicitAny: Prisma returns different shapes per tab; cast happens at return
    let posts: any[];
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
        [posts, total] = await Promise.all([
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
        ]);
        break;
      }
      case 'دسته‌بندی‌ها': {
        const where = { name: { contains: searchQuery, mode: 'insensitive' as const } };
        [posts, total] = await Promise.all([
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
        ]);
        break;
      }
      case 'برچسب‌ها': {
        const where = { name: { contains: searchQuery, mode: 'insensitive' as const } };
        [posts, total] = await Promise.all([
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
        ]);
        break;
      }
      case 'نویسندگان': {
        const where = { name: { contains: searchQuery, mode: 'insensitive' as const } };
        [posts, total] = await Promise.all([
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
        ]);
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
