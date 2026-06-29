'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { ActionResult, CommentWithCustomRelations } from '@/types/types';
import { revalidatePath } from 'next/cache';
import { revalidateTag } from '@/lib/revalidate';

export async function addComment(
  postId: string,
  content: string,
  parentId?: string,
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
    if (!content.trim() || content.length > 1000) {
      return {
        success: false,
        message: 'محتوای کامنت نامعتبر است.',
        error: 'محتوای کامنت باید بین 1 تا 1000 کاراکتر باشد.',
      };
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: session.user.id as string,
        parentId,
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
    revalidateTag(`post-${postId}`);
    revalidateTag('comments');
    revalidateTag('dashboard-stats');

    return {
      success: true,
      message: 'کامنت با موفقیت افزوده شد.',
      data: comment,
    };
  } catch (error) {
    console.error('خطا در افزودن  کامنت:', error);
    return {
      success: false,
      message: 'خطا در  افزودن کامنت. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteComment(commentId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user) {
    return {
      success: false,
      message: 'برای حذف کامنت باید وارد شوید.',
      error: 'کاربر احراز هویت نشده است.',
    };
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });

    if (!comment) {
      return {
        success: false,
        message: 'کامنت مورد نظر یافت نشد.',
        error: 'کامنت وجود ندارد.',
      };
    }

    if (comment.authorId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return {
        success: false,
        message: 'شما اجازه حذف این کامنت را ندارید.',
        error: 'عدم دسترسی',
      };
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    revalidatePath(`/single/${comment.postId}`);
    revalidateTag(`post-${comment.postId}`);
    revalidateTag('comments');
    revalidateTag('dashboard-stats');

    return {
      success: true,
      message: 'کامنت با موفقیت حذف شد.',
    };
  } catch (error) {
    console.error('خطا در حذف کامنت:', error);
    return {
      success: false,
      message: 'خطا در حذف کامنت. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function editComment(
  commentId: string,
  content: string,
): Promise<ActionResult<CommentWithCustomRelations>> {
  const session = await auth();
  if (!session?.user) {
    return {
      success: false,
      message: 'برای ویرایش کامنت باید وارد شوید.',
      error: 'کاربر احراز هویت نشده است.',
    };
  }

  try {
    if (!content.trim() || content.length > 1000) {
      return {
        success: false,
        message: 'محتوای کامنت نامعتبر است.',
        error: 'محتوای کامنت باید بین 1 تا 1000 کاراکتر باشد.',
      };
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return {
        success: false,
        message: 'کامنت مورد نظر یافت نشد.',
        error: 'کامنت وجود ندارد.',
      };
    }

    if (comment.authorId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return {
        success: false,
        message: 'شما اجازه ویرایش این کامنت را ندارید.',
        error: 'عدم دسترسی',
      };
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
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

    revalidatePath(`/single/${comment.postId}`);
    revalidateTag(`post-${comment.postId}`);
    revalidateTag('comments');
    revalidateTag('dashboard-stats');

    return {
      success: true,
      message: 'کامنت با موفقیت ویرایش شد.',
      data: updatedComment,
    };
  } catch (error) {
    console.error('خطا در ویرایش کامنت:', error);
    return {
      success: false,
      message: 'خطا در ویرایش کامنت. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
