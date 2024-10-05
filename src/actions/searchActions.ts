'use server';

import prisma from '@/lib/db';
import type { ActionResult, SearchActionResult } from '@/types/types';

export async function getSearchResults(
  searchQuery: string,
  activeTab: string,
  page: number,
): Promise<SearchActionResult> {
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  try {
    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let posts;
    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let total;

    switch (activeTab) {
      case 'مقالات':
        [posts, total] = await Promise.all([
          prisma.post.findMany({
            where: {
              OR: [{ title: { contains: searchQuery } }, { content: { contains: searchQuery } }],
              status: 'PUBLISHED',
            },
            include: {
              author: { include: { profile: true } },
              categories: true,
              tags: true,
              _count: {
                select: { comments: true, likes: true, savedBy: true },
              },
            },
            skip,
            take: pageSize,
          }),
          prisma.post.count({
            where: {
              OR: [{ title: { contains: searchQuery } }, { content: { contains: searchQuery } }],
              status: 'PUBLISHED',
            },
          }),
        ]);
        break;
      case 'دسته‌بندی‌ها':
        [posts, total] = await Promise.all([
          prisma.category.findMany({
            where: { name: { contains: searchQuery } },
            include: {
              _count: { select: { posts: true } },
            },
            skip,
            take: pageSize,
          }),
          prisma.category.count({
            where: { name: { contains: searchQuery } },
          }),
        ]);
        break;
      case 'برچسب‌ها':
        [posts, total] = await Promise.all([
          prisma.tag.findMany({
            where: { name: { contains: searchQuery } },
            include: {
              _count: { select: { posts: true } },
            },
            skip,
            take: pageSize,
          }),
          prisma.tag.count({
            where: { name: { contains: searchQuery } },
          }),
        ]);
        break;
      case 'نویسندگان':
        [posts, total] = await Promise.all([
          prisma.user.findMany({
            where: { name: { contains: searchQuery } },
            include: {
              profile: true,
              _count: { select: { posts: true } },
            },
            skip,
            take: pageSize,
          }),
          prisma.user.count({
            where: { name: { contains: searchQuery } },
          }),
        ]);
        break;
      default:
        throw new Error('Invalid tab');
    }

    const pages = Math.ceil(total / pageSize);

    return {
      success: true,
      message: 'Search results fetched successfully',
      data: { posts, total, pages },
    };
  } catch (error) {
    console.error('Error in getSearchResults:', error);
    return {
      success: false,
      message: 'Failed to fetch search results',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
