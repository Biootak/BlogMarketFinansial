'use server';

import prisma from '@/lib/db';
import { checkRole } from '@/lib/utils';
import type { UserWithProfile } from '@/types/types';

export async function getProfileData(): Promise<UserWithProfile | null> {
  const session = await checkRole(['ADMIN', 'AUTHOR']);

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      _count: true,
    },
  });
}
