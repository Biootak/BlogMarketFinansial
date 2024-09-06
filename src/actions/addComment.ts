'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { ActionResult, CommentWithCustomRelations } from '@/types/types';
import { revalidatePath } from 'next/cache';

export async function addComment(
  postId: string,
  content: string,
): Promise<ActionResult<CommentWithCustomRelations>> {
  const session = await auth();
  if (!session?.user) {
    return {
      success: false,
      message: 'برای افزودن کامنت باید وارد شوید.',
      error: 'کاربر احراز هویت نشده است.',
    };
  }

  try {
    // اعتبارسنجی ورودی‌ها
    if (!content.trim() || content.length > 100) {
      return {
        success: false,
        message: 'محتوای کامنت نامعتبر است.',
        error: 'محتوای کامنت باید بین 1 تا 100 کاراکتر باشد.',
      };
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: session.user.id as string,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profile: true,
            image: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        post: true,
        parent: true,
        replies: {
          include: {
            author: true,
          },
        },
        likes: true,
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
    });

    revalidatePath(`/single/${postId}`);

    return {
      success: true,
      message: 'کامنت با موفقیت افزوده شد.',
      data: comment,
    };
  } catch (error) {
    console.error('خطا در افزودن کامنت:', error);
    return {
      success: false,
      message: 'خطا در افزودن کامنت. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
