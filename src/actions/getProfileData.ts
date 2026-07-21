'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';
import { Role } from '@prisma/client';

const fetchProfile = async (userId: string) => {
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
};

// safeCache with per-user key prevents DB-failure crash while scoping cache
// correctly per userId — matching the previous unstable_cache per-user pattern.
const getCachedProfile = safeCache(fetchProfile, null, {
  key: 'user-profile',
  ttl: 60,
  tags: ['user-profile'],
});

// C3 fix: this is a public-facing server action. Require an authenticated
// session and restrict access to the owner of the profile (or an admin),
// otherwise anyone could enumerate userIds and harvest emails/roles.
export async function getProfileData(userId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const role = session.user.role as Role | undefined;
  if (session.user.id !== userId && role !== Role.ADMIN && role !== Role.OWNER) {
    return null;
  }
  return getCachedProfile(userId);
}
