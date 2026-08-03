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
  const STAFF_ROLES = [{ role: Role.AUTHOR }, { role: Role.ADMIN }, { role: Role.OWNER }];

  // 2026-08-perf: همه query ها موازی — قبلاً sequential بود (authors → counts → categories → N×catAuthors)
  // الان: 3 query موازی به جای 3+N query sequential
  const [authors, [authorCount, postCount], topCategories] = await Promise.all([
    // 1. Top authors
    prisma.user.findMany({
      where: { OR: STAFF_ROLES },
      take: topLimit,
      orderBy: { posts: { _count: 'desc' } },
      select: {
        id: true,
        name: true,
        image: true,
        profile: { select: { avatar: true, bio: true, jobName: true } },
        _count: { select: { posts: true } },
      },
    }),
    // 2. Total counts
    Promise.all([
      prisma.user.count({ where: { OR: STAFF_ROLES } }),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
    ]),
    // 3. Top categories — یک query که author ها را هم includes می‌کند (N+1 حذف شد)
    prisma.category.findMany({
      where: { posts: { some: { status: 'PUBLISHED' } } },
      orderBy: { posts: { _count: 'desc' } },
      take: expertiseLimit,
      select: {
        id: true,
        name: true,
        slug: true,
        posts: {
          where: { status: 'PUBLISHED' },
          take: 1,
          select: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
                profile: { select: { avatar: true, jobName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  // 2026-08-perf: به جای N query برای هر category، از posts.author استفاده می‌کنیم
  // که در همان query بالا آمده است.
  const expertise: HubExpertiseCategory[] = topCategories
    .map((cat) => {
      const catAuthors = cat.posts
        .map((p) => p.author)
        .filter(
          (a): a is NonNullable<typeof a> =>
            a !== null &&
            (a.role === Role.AUTHOR || a.role === Role.ADMIN || a.role === Role.OWNER),
        )
        // dedupe by id
        .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
        .slice(0, 6);

      if (catAuthors.length === 0) return null;
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        authors: catAuthors.map((a) => ({
          id: a.id,
          name: a.name,
          profile: a.profile ? { avatar: a.profile.avatar, jobName: a.profile.jobName } : null,
        })),
      };
    })
    .filter((e): e is HubExpertiseCategory => e !== null);

  return {
    totalAuthors: authorCount,
    totalPosts: postCount,
    topAuthors: authors.map<HubAuthor>((a) => ({
      id: a.id,
      name: a.name,
      image: a.image,
      profile: a.profile
        ? { avatar: a.profile.avatar, bio: a.profile.bio, jobName: a.profile.jobName }
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
