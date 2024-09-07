import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { UserWithProfile, ActionResult } from '@/types/types';

export async function getAuthorById(id: string): Promise<ActionResult<UserWithProfile>> {
  try {
    const author = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
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

    // حذف اطلاعات حساس
    const { password, ...UserWithProfile } = author;

    return {
      success: true,
      message: 'اطلاعات نویسنده با موفقیت دریافت شد.',
      data: UserWithProfile,
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
