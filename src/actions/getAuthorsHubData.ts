'use server';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { Role, Prisma } from '@prisma/client';
import prisma from '@/lib/db';

/**
 * @file getAuthorsHubData
 * @description Single round-trip aggregator for the public /authors hub.
 * Returns the data needed by the hub hero + grid + expertise cloud in
 * a single Promise.all. Cached across requests with `unstable_cache` so
 * the hub is cheap to render on every page navigation.
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

const fetchHubDataRaw = async (
  topLimit: number,
  expertiseLimit: number,
): Promise<AuthorsHubData> => {
  // 1. Top authors (ordered by post count) — reused by hero + grid.
  const authors = await prisma.user.findMany({
    where: {
      OR: [
        { role: Role.AUTHOR },
        { role: Role.ADMIN },
        { role: Role.SUPER_ADMIN },
      ],
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
        OR: [
          { role: Role.AUTHOR },
          { role: Role.ADMIN },
          { role: Role.SUPER_ADMIN },
        ],
      },
    }),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
  ]);

  // 3. Top categories by published-post count, with their top authors.
  //    A group-by on Post.categories + a per-category user lookup is
  //    more efficient than 1+N — the inner findMany picks the most
  //    published authors in that category.
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
        OR: [
          { role: Role.AUTHOR },
          { role: Role.ADMIN },
          { role: Role.SUPER_ADMIN },
        ],
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
          profile: a.profile
            ? { avatar: a.profile.avatar, jobName: a.profile.jobName }
            : null,
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

// `cache` (react) dedupes within a single request; `unstable_cache` dedupes
// across requests for 5 minutes. Tag `posts` so a publish busts the hub.
const getCachedHubData = unstable_cache(
  fetchHubDataRaw,
  ['authors-hub', 'v1-2026-06-16'],
  { revalidate: 300, tags: ['posts', 'top-authors'] },
);

export const getAuthorsHubData = cache(
  async (
    topLimit = 12,
    expertiseLimit = 6,
  ): Promise<AuthorsHubData> => {
    try {
      return await getCachedHubData(topLimit, expertiseLimit);
    } catch (error) {
      // 2026-06-16: if Prisma is unreachable (e.g. local dev without DB)
      // we still want the page to render. Surface the failure via an
      // empty payload rather than 500ing the whole hub.
      console.error('Failed to fetch authors hub data:', error);
      return {
        totalAuthors: 0,
        totalPosts: 0,
        topAuthors: [],
        expertise: [],
      };
    }
  },
);

export type AuthorsHubDataResult = Awaited<ReturnType<typeof getAuthorsHubData>>;

// 2026-06-16: `isEmptyHub` is intentionally NOT exported from a 'use server'
// file because Next.js requires every export from such a file to be an
// async function. Consumers can re-define this 1-liner locally.
function isEmptyHub(data: AuthorsHubData): boolean {
  return data.topAuthors.length === 0 && data.expertise.length === 0;
}

// Type used by callers when they want to discriminate individual shapes
// (currently only used internally for Prisma typing).
export type _PrismaPostWhere = Prisma.PostWhereInput;
