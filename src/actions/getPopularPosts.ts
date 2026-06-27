'use server';

import { unstable_cache } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/db';

import type { ActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';

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

  const where: Prisma.PostWhereInput = { status: 'PUBLISHED' };
  if (user.role === 'AUTHOR') {
    where.authorId = user.id;
  }

  try {
    // 2026-06-14: 2-minute cache. The view count delta is small
    // enough that a 2-minute staleness is invisible in the UI, but
    // the dashboard widget no longer hits the DB on every render.
    const fetcher = unstable_cache(
      async (roleScope: { authorId?: string }) => {
        return prisma.post.findMany({
          where: {
            status: 'PUBLISHED',
            ...(roleScope.authorId ? { authorId: roleScope.authorId } : {}),
          },
          orderBy: { viewCount: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            viewCount: true,
            createdAt: true,
            slug: true,
            author: { select: { name: true } },
          },
        });
      },
      ['popular-posts', 'v1-2026-06-14'],
      {
        revalidate: 120,
        tags: ['popular-posts', 'posts'],
      },
    );

    const popularPosts = await fetcher({ authorId: user.role === 'AUTHOR' ? user.id : undefined });

    const formattedPosts = popularPosts.map((post) => ({
      id: post.id,
      title: post.title,
      views: post.viewCount,
      // 2026-06-19: unstable_cache JSON-serializes the return value, so
      // Prisma's Date becomes an ISO string on cache hits. Wrap with
      // new Date() which accepts both Date and string.
      publishDate: new Date(post.createdAt).toLocaleDateString('fa-IR'),
      author: post.author.name || 'ناشناس',
      slug: post.slug,
    }));

    return {
      success: true,
      message: 'پست‌های محبوب با موفقیت بازیابی شدند.',
      data: formattedPosts,
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
