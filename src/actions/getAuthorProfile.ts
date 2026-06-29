/**
 * @file getAuthorProfile
 * @description Single aggregated fetch for the public author profile
 * page. Returns the author + the first page of their published posts
 * in one round-trip pair. Cached for 2 minutes — profiles are read
 * often but rarely change.
 */
'use server';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { Prisma, type PostStatus } from '@prisma/client';
import prisma from '@/lib/db';
import type { UserWithProfile, PostWithRelations } from '@/types/types';

export interface AuthorProfilePayload {
  author: (UserWithProfile & { _count: { posts: number } }) | null;
  posts: PostWithRelations[];
  totalPosts: number;
  totalPages: number;
}

const AUTHOR_FILTER: Prisma.UserWhereInput = {
  OR: [
    { role: 'AUTHOR' },
    { role: 'ADMIN' },
    { role: 'OWNER' },
  ],
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
        email: true,
        emailVerified: true,
        image: true,
        phoneNumber: true,
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
    return { author: null, posts: [], totalPosts: 0, totalPages: 0 };
  }

  return {
    author: author as AuthorProfilePayload['author'],
    posts: posts as PostWithRelations[],
    totalPosts: total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

const getCachedAuthorProfile = unstable_cache(
  fetchAuthorProfile,
  ['author-profile', 'v1-2026-06-16'],
  { revalidate: 120, tags: ['posts', 'top-authors'] },
);

export const getAuthorProfile = cache(
  async (
    authorId: string,
    page = 1,
    limit = 9,
  ): Promise<AuthorProfilePayload> => {
    try {
      return await getCachedAuthorProfile(authorId, page, limit);
    } catch (error) {
      console.error('Failed to fetch author profile:', error);
      return { author: null, posts: [], totalPosts: 0, totalPages: 0 };
    }
  },
);
