'use server';

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import type { PostWithRelations } from '@/types/types';

// 2026-07-28: migrated from unstable_cache → safeCache for DB-resilience.
// The public author profile page must never 500 — safeCache returns stale
// or an empty payload instead of crashing the layout.

export interface AuthorProfilePayload {
  author: (import('@/types/types').UserWithProfile & { _count: { posts: number } }) | null;
  posts: PostWithRelations[];
  totalPosts: number;
  totalPages: number;
}

import type { PostStatus, Prisma } from '@prisma/client';
import { cache } from 'react';

const AUTHOR_FILTER: Prisma.UserWhereInput = {
  OR: [{ role: 'AUTHOR' }, { role: 'ADMIN' }, { role: 'OWNER' }],
};

const EMPTY_PAYLOAD: AuthorProfilePayload = {
  author: null,
  posts: [],
  totalPosts: 0,
  totalPages: 0,
};

const fetchAuthorProfile = async (
  authorId: string,
  page: number,
  limit: number,
): Promise<AuthorProfilePayload> => {
  const [author, posts, total] = await Promise.all([
    prisma.user.findFirst({
      where: { id: authorId, ...AUTHOR_FILTER },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        status: true,
        profile: {
          select: {
            bio: true,
            avatar: true,
            bgImage: true,
            jobName: true,
            company: true,
          },
        },
        _count: { select: { posts: true } },
      },
    }),
    prisma.post.findMany({
      where: { authorId, status: 'PUBLISHED' as PostStatus },
      include: {
        author: {
          include: { profile: true },
        },
        categories: true,
        tags: true,
        _count: {
          select: { comments: true, likes: true, savedBy: true, tags: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({
      where: { authorId, status: 'PUBLISHED' as PostStatus },
    }),
  ]);

  if (!author) {
    return EMPTY_PAYLOAD;
  }

  return {
    author: author as AuthorProfilePayload['author'],
    posts: posts as PostWithRelations[],
    totalPosts: total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

const getCachedAuthorProfile = safeCache(fetchAuthorProfile, EMPTY_PAYLOAD, {
  key: 'author-profile',
  ttl: 120,
  tags: ['posts', 'top-authors'],
});

export const getAuthorProfile = cache(
  async (authorId: string, page = 1, limit = 9): Promise<AuthorProfilePayload> => {
    return getCachedAuthorProfile(authorId, page, limit);
  },
);

export type AuthorProfileData = Awaited<ReturnType<typeof getAuthorProfile>>;
