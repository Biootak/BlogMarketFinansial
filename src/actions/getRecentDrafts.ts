'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';

import type { ActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';

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
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return {
      success: false,
      message: 'لطفاً وارد حساب کاربری خود شوید.',
    };
  }

  try {
    const where: Prisma.PostWhereInput = {
      status: 'DRAFT',
    };

    // اگر نویسنده است، فقط پست‌های خودش را ببیند
    if (user.role === 'AUTHOR') {
      where.authorId = user.id;
    }

    const recentDrafts = await prisma.post.findMany({
      where,
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
