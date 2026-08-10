'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { tieredCache } from '@/lib/tiered-cache';
import type { ActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';

type PopularPostRow = {
  id: string;
  title: string;
  views: number;
  publishDate: string;
  author: string;
  slug: string;
};

// 2026-06-14: 2-minute cache. The view count delta is small
// enough that a 2-minute staleness is invisible in the UI, but
// the dashboard widget no longer hits the DB on every render.
// Per-user scoping via args key: safeCache uses JSON.stringify(args) as
// the compound key suffix, so (userId, role) pairs are stored separately.
const fetchPopularPostsRaw = async (userId: string, role: string): Promise<PopularPostRow[]> => {
  const posts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      ...(role === 'AUTHOR' ? { authorId: userId } : {}),
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

  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    views: post.viewCount,
    // safeCache returns plain JSON so Dates arrive as ISO strings on cache hits.
    publishDate: new Date(post.createdAt).toLocaleDateString('fa-IR'),
    author: post.author?.name || 'ناشناس',
    slug: post.slug,
  }));
};

const getCachedPopularPosts = tieredCache(fetchPopularPostsRaw, [], {
  key: 'popular-posts',
  l1Ttl: 120,
  l2Ttl: 600,
  tags: ['popular-posts', 'posts'],
});

export async function getPopularPosts(): Promise<ActionResult<PopularPostRow[]>> {
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
    const formattedPosts = await getCachedPopularPosts(user.id ?? 'no-id', user.role ?? 'unknown');

    return {
      success: true,
      message: 'پست‌های محبوب با موفقیت بازیابی شدند.',
      data: formattedPosts,
    };
  } catch {
    return {
      success: false,
      message: 'خطا در بازیابی پست‌های محبوب. لطفاً دوباره تلاش کنید.',
    };
  }
}
