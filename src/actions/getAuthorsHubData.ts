'use server';

import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import { type Prisma, Role } from '@prisma/client';
import { cache } from 'react';

/**
 * @file getAuthorsHubData
 * @description Single round-trip aggregator for the public /authors hub.
 * 2026-07-28: migrated from unstable_cache → safeCache for DB-resilience.
 */
export interface HubAuthor {
  id: string;
  name: string | null;
  image: string | null;
  profile: {
    avatar: string | null;
    bio: string | null;
    jobName: string | null;
  } | null;
  _count: { posts: number };
}

export interface HubExpertiseCategory {
  id: string;
  name: string;
  slug: string;
  authors: Array<{
    id: string;
    name: string | null;
    profile: { avatar: string | null; jobName: string | null } | null;
  }>;
}

export interface AuthorsHubData {
  totalAuthors: number;
  totalPosts: number;
  topAuthors: HubAuthor[];
  expertise: HubExpertiseCategory[];
}

const EMPTY_HUB: AuthorsHubData = {
  totalAuthors: 0,
  totalPosts: 0,
  topAuthors: [],
  expertise: [],
};

const fetchHubDataRaw = async (
  topLimit: number,
  expertiseLimit: number,
): Promise<AuthorsHubData> => {
  // 1. Top authors (ordered by post count) — reused by hero + grid.
  const authors = await prisma.user.findMany({
    where: {
      OR: [{ role: Role.AUTHOR }, { role: Role.ADMIN }, { role: Role.OWNER }],
    },
    take: topLimit,
    orderBy: { posts: { _count: 'desc' } },
    select: {
      id: true,
      name: true,
      image: true,
      profile: {
        select: { avatar: true, bio: true, jobName: true },
      },
      _count: { select: { posts: true } },
    },
  });

  // 2. Total counts (single round-trip per aggregate).
  const [authorCount, postCount] = await Promise.all([
    prisma.user.count({
      where: {
        OR: [{ role: Role.AUTHOR }, { role: Role.ADMIN }, { role: Role.OWNER }],
      },
    }),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
  ]);

  // 3. Top categories by published-post count, with their top authors.
  const topCategories = await prisma.category.findMany({
    where: {
      posts: { some: { status: 'PUBLISHED' } },
    },
    orderBy: { posts: { _count: 'desc' } },
    take: expertiseLimit,
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const expertise: HubExpertiseCategory[] = [];
  for (const cat of topCategories) {
    const catAuthors = await prisma.user.findMany({
      where: {
        OR: [{ role: Role.AUTHOR }, { role: Role.ADMIN }, { role: Role.OWNER }],
        posts: { some: { status: 'PUBLISHED', categories: { some: { id: cat.id } } } },
      },
      orderBy: { posts: { _count: 'desc' } },
      take: 6,
      select: {
        id: true,
        name: true,
        profile: { select: { avatar: true, jobName: true } },
      },
    });
    if (catAuthors.length > 0) {
      expertise.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        authors: catAuthors.map((a) => ({
          id: a.id,
          name: a.name,
          profile: a.profile ? { avatar: a.profile.avatar, jobName: a.profile.jobName } : null,
        })),
      });
    }
  }

  return {
    totalAuthors: authorCount,
    totalPosts: postCount,
    topAuthors: authors.map<HubAuthor>((a) => ({
      id: a.id,
      name: a.name,
      image: a.image,
      profile: a.profile
        ? {
            avatar: a.profile.avatar,
            bio: a.profile.bio,
            jobName: a.profile.jobName,
          }
        : null,
      _count: a._count,
    })),
    expertise,
  };
};

// safeCache dedupes across requests (in-memory, 5 min TTL) and tags allow
// immediate invalidation on publish. Tag `posts` so a publish busts the hub.
const getCachedHubData = safeCache(fetchHubDataRaw, EMPTY_HUB, {
  key: 'authors-hub',
  ttl: 300,
  tags: ['posts', 'top-authors'],
});

export const getAuthorsHubData = cache(
  async (topLimit = 12, expertiseLimit = 6): Promise<AuthorsHubData> => {
    return getCachedHubData(topLimit, expertiseLimit);
  },
);

export type AuthorsHubDataResult = Awaited<ReturnType<typeof getAuthorsHubData>>;

// Type used by callers when they want to discriminate individual shapes
// (currently only used internally for Prisma typing).
export type _PrismaPostWhere = Prisma.PostWhereInput;
