'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { PostStatus } from '@prisma/client';
import type { PostWithRelations } from '@/types/types';
import { revalidatePath, revalidateTag } from 'next/cache';

interface GetLatestPostsParams {
  count?: number;
  skip?: number;
  category?: string;
}

// Internal fetch function
async function fetchLatestPosts(
  count: number,
  skip: number,
  category: string | undefined,
): Promise<PostWithRelations[]> {
    try {
      const whereClause = {
        status: PostStatus.PUBLISHED,
        ...(category && category !== 'همه'
          ? {
              categories: {
                some: {
                  name: category,
                },
              },
            }
          : {}),
      };

      const posts = await prisma.post.findMany({
        where: whereClause,
        take: count,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  avatar: true,
                  jobName: true,
                },
              },
            },
          },
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
              savedBy: true,
            },
          },
        },
      });

      return posts as PostWithRelations[];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching posts:', error);
      }
      return [];
    }
}

// Cached version
const getCachedLatestPosts = unstable_cache(
  fetchLatestPosts,
  ['latest-posts'],
  {
    revalidate: 60, // 1 minute
    tags: ['posts', 'latest-posts'],
  }
);

// Public API
export async function getLatestPosts({
  count = 6,
  skip = 0,
  category,
}: GetLatestPostsParams = {}): Promise<PostWithRelations[]> {
  return getCachedLatestPosts(count, skip, category);
}

export async function invalidatePostsCache() {
  revalidatePath('/posts');
  revalidateTag('posts', 'page');
  revalidateTag('latest-posts', 'page');
}
