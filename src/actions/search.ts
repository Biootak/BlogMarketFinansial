'use server';

import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import type {
  ActionResult,
  PostWithRelations,
  CategoryWithPostCount,
  UserWithProfile,
} from '@/types/types';

export const searchPosts = cache(
  async (query: string): Promise<ActionResult<PostWithRelations[]>> => {
    try {
      const posts = await prisma.post.findMany({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } },
              ],
            },
            { status: 'PUBLISHED' },
          ],
        },
        take: 5,
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      revalidatePath('/search');
      return {
        success: true,
        message: 'پست‌ها با موفقیت جستجو شدند.',
        data: posts,
      };
    } catch (error) {
      console.error('خطا در جستجوی پست‌ها:', error);
      return {
        success: false,
        message: 'خطا در جستجوی پست‌ها. لطفاً دوباره تلاش کنید.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

export const searchCategories = cache(
  async (query: string): Promise<ActionResult<CategoryWithPostCount[]>> => {
    try {
      const categories = await prisma.category.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        take: 5,
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
        },
      });

      revalidatePath('/search');
      return {
        success: true,
        message: 'دسته‌بندی‌ها با موفقیت جستجو شدند.',
        data: categories,
      };
    } catch (error) {
      console.error('خطا در جستجوی دسته‌بندی‌ها:', error);
      return {
        success: false,
        message: 'خطا در جستجوی دسته‌بندی‌ها. لطفاً دوباره تلاش کنید.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);
export const searchAuthors = cache(
  async (query: string): Promise<ActionResult<UserWithProfile[]>> => {
    try {
      const authors = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
          role: { in: ['ADMIN', 'AUTHOR'] },
        },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          emailVerified: true,
          profile: {
            select: {
              bio: true,
              avatar: true,
              bgImage: true,
              jobName: true,
            },
          },
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      revalidatePath('/search');
      return {
        success: true,
        message: 'نویسندگان با موفقیت جستجو شدند.',
        data: authors,
      };
    } catch (error) {
      console.error('خطا در جستجوی نویسندگان:', error);
      return {
        success: false,
        message: 'خطا در جستجوی نویسندگان. لطفاً دوباره تلاش کنید.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);
