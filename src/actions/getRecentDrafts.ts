'use server';

import prisma from '@/lib/db';
import { checkRole } from '@/lib/utils';
import type { ActionResult } from '@/types/types';

export async function getRecentDrafts(): Promise<
  ActionResult<
    Array<{
      id: string;
      title: string;
      date: string;
      author: string;
    }>
  >
> {
  await checkRole(['ADMIN', 'AUTHOR']);

  try {
    const recentDrafts = await prisma.post.findMany({
      where: {
        status: 'DRAFT',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });

    const formattedDrafts = recentDrafts.map((draft) => ({
      id: draft.id,
      title: draft.title,
      date: draft.updatedAt.toLocaleDateString('fa-IR'),
      author: draft.author.name || 'ناشناس',
    }));

    return {
      success: true,
      message: 'پیش‌نویس‌های اخیر با موفقیت بازیابی شدند.',
      data: formattedDrafts,
    };
  } catch (error) {
    console.error('خطا در بازیابی پیش‌نویس‌های اخیر:', error);
    return {
      success: false,
      message: 'خطا در بازیابی پیش‌نویس‌های اخیر. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
