'use server';

import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';

export async function resolveFraudReview(
  id: string,
  resolution: string,
): Promise<FintechActionResult<void>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی ندارید' } };
  }

  await prisma.fraudReview.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      resolution: resolution || 'رفع شده توسط ادمین',
      resolvedAt: new Date(),
      assignedToId: auth.user.id,
    },
  });

  revalidateTag('fraud-reviews');

  return { success: true, data: undefined };
}
