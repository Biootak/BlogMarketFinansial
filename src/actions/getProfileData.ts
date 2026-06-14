'use server';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';

export const getProfileData = unstable_cache(
  async (userId: string) => {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            bio: true,
            avatar: true,
            bgImage: true,
            jobName: true,
            company: true,
          },
        },
        _count: {
          select: { posts: true, comments: true, savedPosts: true, likes: true },
        },
      },
    });
  },
  ['user-profile', 'v1-2026-06-14'],
  {
    revalidate: 60,
    tags: ['user-profile'],
  },
);
