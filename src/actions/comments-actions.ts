'use server';

/**
 * comments-actions — مدیریت نظرات مقالات (ادمین).
 *
 * پیش از این نظرات در دیتابیس ثبت می‌شدند (مدل Comment) اما هیچ صفحه‌ای برای
 * تأیید/حذف آن‌ها وجود نداشت. این ماژول CRUD ادمین را فراهم می‌کند:
 *   - لیست با فیلتر وضعیت (در انتظار / تأییدشده / همه)
 *   - تأیید / لغو تأیید تکی و گروهی
 *   - حذف تکی و گروهی
 */

import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { ActionResult } from '@/types/types';

export type CommentRow = {
  id: string;
  content: string;
  approved: boolean;
  createdAt: Date;
  time: string;
  postId: string;
  postTitle: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  replyCount: number;
};

export type CommentsListResult = ActionResult<{
  rows: CommentRow[];
  total: number;
  pending: number;
  approved: number;
}>;

export type CommentsStatus = 'all' | 'pending' | 'approved';

/**
 * لیست نظرات — آخرین‌ها اول؛ تا ۳۰۰ رکورد.
 * فیلتر وضعیت روی سرور اعمال می‌شود تا تب‌ها همیشه کل مجموعه را نشان دهند،
 * نه فقط پنجرهٔ بارگذاری‌شدهٔ صفحهٔ اول.
 */
export async function getComments(
  options: { limit?: number; offset?: number; status?: CommentsStatus } = {},
): Promise<CommentsListResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const limit = Math.min(options.limit ?? 200, 300);
    const offset = options.offset ?? 0;
    const where =
      options.status === 'pending'
        ? { approved: false }
        : options.status === 'approved'
          ? { approved: true }
          : {};

    const [rows, total, pending, approved] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          post: { select: { id: true, title: true } },
          author: { select: { id: true, name: true, email: true } },
          _count: { select: { replies: true } },
        },
      }),
      prisma.comment.count(),
      prisma.comment.count({ where: { approved: false } }),
      prisma.comment.count({ where: { approved: true } }),
    ]);

    return {
      success: true,
      message: 'نظرات با موفقیت بازیابی شدند',
      data: {
        rows: rows.map((c) => ({
          id: c.id,
          content: c.content,
          approved: c.approved,
          createdAt: c.createdAt,
          time: c.createdAt.toLocaleString('fa-IR'),
          postId: c.postId,
          postTitle: c.post.title,
          authorId: c.author.id,
          authorName: c.author.name ?? 'کاربر بدون نام',
          authorEmail: c.author.email,
          replyCount: c._count.replies,
        })),
        total,
        pending,
        approved,
      },
    };
  } catch {
    return { success: false, message: 'خطا در بارگذاری نظرات' };
  }
}

/**
 * تأیید یا لغو تأیید یک نظر.
 */
export async function setCommentApproval(
  id: string,
  approved: boolean,
): Promise<ActionResult<{ id: string; approved: boolean }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    await prisma.comment.update({
      where: { id },
      data: { approved },
    });

    revalidateTag('comments');
    return {
      success: true,
      message: approved ? 'نظر تأیید شد' : 'تأیید نظر لغو شد',
      data: { id, approved },
    };
  } catch {
    return { success: false, message: 'خطا در به‌روزرسانی نظر' };
  }
}

/**
 * تأیید گروهی نظرات (bulk approve).
 */
export async function bulkApproveComments(
  ids: string[],
): Promise<ActionResult<{ updated: number }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (ids.length === 0) return { success: false, message: 'نظری انتخاب نشده است' };

    const result = await prisma.comment.updateMany({
      where: { id: { in: ids }, approved: false },
      data: { approved: true },
    });

    revalidateTag('comments');
    return { success: true, message: 'نظرات تأیید شدند', data: { updated: result.count } };
  } catch {
    return { success: false, message: 'خطا در تأیید گروهی نظرات' };
  }
}

/**
 * حذف یک نظر.
 */
export async function deleteComment(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    await prisma.comment.delete({ where: { id } });

    revalidateTag('comments');
    return { success: true, message: 'نظر حذف شد', data: { id } };
  } catch {
    return { success: false, message: 'خطا در حذف نظر' };
  }
}

/**
 * حذف گروهی نظرات.
 */
export async function bulkDeleteComments(
  ids: string[],
): Promise<ActionResult<{ deleted: number }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (ids.length === 0) return { success: false, message: 'نظری انتخاب نشده است' };

    const result = await prisma.comment.deleteMany({
      where: { id: { in: ids } },
    });

    revalidateTag('comments');
    return { success: true, message: 'نظرات حذف شدند', data: { deleted: result.count } };
  } catch {
    return { success: false, message: 'خطا در حذف گروهی نظرات' };
  }
}

/**
 * رد گروهی نظرات.
 */
export async function bulkRejectComments(
  ids: string[],
): Promise<ActionResult<{ updated: number }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (ids.length === 0) return { success: false, message: 'نظری انتخاب نشده است' };

    const result = await prisma.comment.updateMany({
      where: { id: { in: ids } },
      data: { approved: false },
    });

    revalidateTag('comments');
    return { success: true, message: 'نظرات رد شدند', data: { updated: result.count } };
  } catch {
    return { success: false, message: 'خطا در رد گروهی نظرات' };
  }
}
