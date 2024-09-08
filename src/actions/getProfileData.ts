'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { UserWithProfile } from '@/types/types';

export async function getProfileData(): Promise<UserWithProfile | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      _count: true,
    },
  });
}
