'use server';

import prisma from '@/lib/db';
import { PostStatus } from '@prisma/client';
import type { PostWithRelations } from '@/types/types';

interface GetLatestPostsParams {
  count?: number;
  skip?: number;
  category?: string;
}

export async function getLatestPosts({
  count = 6,
  skip = 0,
  category,
}: GetLatestPostsParams = {}): Promise<PostWithRelations[]> {
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
          include: {
            profile: true,
          },
        },
        categories: true,
        comments: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
            replies: true,
            likes: {
              include: {
                user: true,
              },
            },
            _count: true,
          },
        },
        tags: true,
        likes: true,
        savedBy: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            savedBy: true,
            tags: true,
          },
        },
      },
    });

    console.log(`Fetched ${posts.length} posts`);
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw new Error('Failed to fetch posts');
  }
}
