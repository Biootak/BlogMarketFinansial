'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { revalidatePath, revalidateTag } from '@/lib/revalidate';
import type { ActionResult, CommentWithCustomRelations } from '@/types/types';
import { z } from 'zod';

// Zod schemas for comment mutations.
const commentContentSchema = z
  .string()
  .min(1, 'محتوای کامنت نمی‌تواند خالی باشد.')
  .max(1000, 'محتوای کامنت نباید بیشتر از ۱۰۰۰ کاراکتر باشد.')
  .trim();

const addCommentSchema = z.object({
  postId: z.string().min(1, 'شناسه پست الزامی است.'),
  content: commentContentSchema,
  parentId: z.string().min(1).optional(),
});

const editCommentSchema = z.object({
  commentId: z.string().min(1, 'شناسه کامنت الزامی است.'),
  content: commentContentSchema,
});

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

  const parsed = addCommentSchema.safeParse({ postId, content, parentId });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors[0]?.message ?? 'داده نامعتبر',
      error: 'INVALID_INPUT',
    };
  }

  try {
    // Verify the target post exists and is published before creating a comment.
    // Without this, any authenticated user could attach comments to any postId
    // (including non-existent or draft posts).
    const targetPost = await prisma.post.findUnique({
      where: { id: parsed.data.postId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!targetPost) {
      return {
        success: false,
        message: 'پست مورد نظر یافت نشد.',
        error: 'پست وجود ندارد یا منتشر نشده است.',
      };
    }

    const comment = await prisma.comment.create({
      data: {
        content: parsed.data.content,
        postId: parsed.data.postId,
        authorId: session.user.id as string,
        parentId: parsed.data.parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
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
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در  افزودن کامنت. لطفاً دوباره تلاش کنید.',
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

    if (
      comment.authorId !== session.user.id &&
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'OWNER'
    ) {
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
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در حذف کامنت. لطفاً دوباره تلاش کنید.',
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

  const parsedEdit = editCommentSchema.safeParse({ commentId, content });
  if (!parsedEdit.success) {
    return {
      success: false,
      message: parsedEdit.error.errors[0]?.message ?? 'داده نامعتبر',
      error: 'INVALID_INPUT',
    };
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parsedEdit.data.commentId },
    });

    if (!comment) {
      return {
        success: false,
        message: 'کامنت مورد نظر یافت نشد.',
        error: 'کامنت وجود ندارد.',
      };
    }

    if (
      comment.authorId !== session.user.id &&
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'OWNER'
    ) {
      return {
        success: false,
        message: 'شما اجازه ویرایش این کامنت را ندارید.',
        error: 'عدم دسترسی',
      };
    }

    const updatedComment = await prisma.comment.update({
      where: { id: parsedEdit.data.commentId },
      data: { content: parsedEdit.data.content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
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
  } catch (_error) {
    return {
      success: false,
      message: 'خطا در ویرایش کامنت. لطفاً دوباره تلاش کنید.',
    };
  }
}
