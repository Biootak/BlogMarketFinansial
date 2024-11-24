'use server';

import { cache } from 'react';
import prisma from '@/lib/db';
import { generateColor } from '@/lib/utils';
import type { ActionResult, TaxonomyType, PostWithRelations } from '@/types/types';
import { getTopAuthors, type TopAuthor } from './getTopAuthors';

export const getRecentPosts = cache(async (limit: number): Promise<PostWithRelations[]> => {
  try {
    const recentPosts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: {
          include: { profile: true },
        },
        categories: true,
        tags: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            savedBy: true,
            tags: true,
          },
        },
      },
    });

    return recentPosts;
  } catch (error) {
    console.error('خطا در بازیابی پست‌های اخیر:', error);
    return [];
  }
});

export const getPopularTags = cache(async (limit: number): Promise<TaxonomyType[]> => {
  try {
    const popularTags = await prisma.tag.findMany({
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return popularTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      thumbnail: null,
      taxonomy: 'tag',
      color: generateColor(tag.id),
      count: tag._count.posts,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));
  } catch (error) {
    console.error('خطا در بازیابی تگ‌های محبوب:', error);
    return [];
  }
});

export const getPopularCategories = cache(async (limit: number): Promise<TaxonomyType[]> => {
  try {
    const popularCategories = await prisma.category.findMany({
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: { posts: true },
        },
        parentCategories: true,
      },
    });

    return popularCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      thumbnail: category.thumbnail,
      taxonomy: category.parentCategories.length > 0 ? 'subcategory' : 'category',
      color: generateColor(category.id),
      count: category._count.posts,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  } catch (error) {
    console.error('خطا در بازیابی دسته‌بندی‌های محبوب:', error);
    return [];
  }
});

export const getPopularAuthors = cache(async (limit: number): Promise<TopAuthor[]> => {
  try {
    return await getTopAuthors(limit);
  } catch (error) {
    console.error('خطا در بازیابی نویسندگان محبوب:', error);
    return [];
  }
});

export async function getSidebarData(
  options = { postsLimit: 5, tagsLimit: 10, categoriesLimit: 5, authorsLimit: 5 },
) {
  const [recentPosts, popularTags, popularCategories, popularAuthors] = await Promise.all([
    getRecentPosts(options.postsLimit),
    getPopularTags(options.tagsLimit),
    getPopularCategories(options.categoriesLimit),
    getPopularAuthors(options.authorsLimit),
  ]);

  return {
    recentPosts,
    popularTags,
    popularCategories,
    popularAuthors,
  };
}
