'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';

import type { ActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';

// Internal fetch function for popular posts
async function fetchPopularPosts(
  userId: string | undefined,
  userRole: string | undefined,
): Promise<
  Array<{
    id: string;
    title: string;
    views: number;
    publishDate: string;
    author: string;
    slug: string;
  }>
> {
  const where: Prisma.PostWhereInput = {
    status: 'PUBLISHED',
  };

  // اگر نویسنده است، فقط پست‌های خودش را ببیند
  if (userRole === 'AUTHOR' && userId) {
    where.authorId = userId;
  }

  const popularPosts = await prisma.post.findMany({
    where,
    orderBy: {
      viewCount: 'desc',
    },
    take: 5,
    select: {
      id: true,
      title: true,
      viewCount: true,
      createdAt: true,
      slug: true,
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  return popularPosts.map((post) => ({
    id: post.id,
    title: post.title,
    views: post.viewCount,
    publishDate: post.createdAt.toLocaleDateString('fa-IR'),
    author: post.author.name || 'ناشناس',
    slug: post.slug,
  }));
}

// Cached version - cache per user role and ID
const getCachedPopularPosts = (userId: string | undefined, userRole: string | undefined) =>
  unstable_cache(
    () => fetchPopularPosts(userId, userRole),
    ['popular-posts', userId || 'public', userRole || 'guest'],
    {
      revalidate: 300, // 5 minutes - longer since view counts change less frequently
      tags: ['posts', 'popular-posts', `user-${userId}`],
    },
  )();

export async function getPopularPosts(): Promise<
  ActionResult<
    Array<{
      id: string;
      title: string;
      views: number;
      publishDate: string;
      author: string;
      slug: string;
    }>
  >
> {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return {
      success: false,
      message: 'لطفاً وارد حساب کاربری خود شوید.',
    };
  }

  try {
    const data = await getCachedPopularPosts(user.id, user.role);

    return {
      success: true,
      message: 'پست‌های محبوب با موفقیت بازیابی شدند.',
      data,
    };
  } catch (error) {
    console.error('خطا در بازیابی پست‌های محبوب:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پست‌های محبوب. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
