'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { UserWithProfile, ActionResult } from '@/types/types';

export async function getAuthorById(id: string): Promise<ActionResult<UserWithProfile>> {
  try {
    const author = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        phoneNumber: true,
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
          select: {
            posts: true,
          },
        },
      },
    });

    if (!author) {
      return {
        success: false,
        message: 'نویسنده یافت نشد.',
      };
    }

    return {
      success: true,
      message: 'اطلاعات نویسنده با موفقیت دریافت شد.',
      data: author,
    };
  } catch (error) {
    console.error('خطا در دریافت اطلاعات نویسنده:', error);
    return {
      success: false,
      message: 'خطا در دریافت اطلاعات نویسنده. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
