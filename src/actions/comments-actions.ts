'use server';

/**
 * comments-actions — مدیریت نظرات مقالات (ادمین).
 *
 * وضعیت‌های ممکن هر نظر:
 *   pending  = approved:false  AND rejectedAt:null   (هنوز بررسی نشده)
 *   approved = approved:true   AND rejectedAt:null   (تأیید شده)
 *   rejected = approved:false  AND rejectedAt:!null  (رد شده)
 */

import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { ActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';

export type CommentRow = {
  id: string;
  content: string;
  approved: boolean;
  rejectedAt: Date | null;
  status: 'pending' | 'approved' | 'rejected';
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
  rejected: number;
}>;

export type CommentsStatus = 'all' | 'pending' | 'approved' | 'rejected';

function toStatus(approved: boolean, rejectedAt: Date | null): 'pending' | 'approved' | 'rejected' {
  if (approved) return 'approved';
  if (rejectedAt) return 'rejected';
  return 'pending';
}

/**
 * لیست نظرات — آخرین‌ها اول.
 */
export async function getComments(
  options: { limit?: number; offset?: number; status?: CommentsStatus } = {},
): Promise<CommentsListResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const limit = Math.min(options.limit ?? 200, 300);
    const offset = options.offset ?? 0;

    // تشخیص وجود column rejectedAt — اگه Prisma client قدیمی بود graceful fallback
    type ColRow = { column_name: string }[];
    const colCheck = await prisma.$queryRaw<ColRow>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Comment' AND column_name = 'rejectedAt'
      LIMIT 1
    `.catch(() => [] as ColRow);
    const hasRejectedAt = colCheck.length > 0;

    const buildWhere = (status?: typeof options.status): Prisma.CommentWhereInput => {
      if (status === 'approved') return { approved: true };
      if (status === 'pending')
        return hasRejectedAt ? { approved: false, rejectedAt: null } : { approved: false };
      if (status === 'rejected')
        return hasRejectedAt
          ? { approved: false, rejectedAt: { not: null } }
          : { id: '__no_results__' };
      return {};
    };

    const where = buildWhere(options.status);

    const [rows, total, pending, approved, rejected] = await Promise.all([
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
      prisma.comment.count({ where: buildWhere('pending') }),
      prisma.comment.count({ where: { approved: true } }),
      prisma.comment.count({ where: buildWhere('rejected') }),
    ]);

    return {
      success: true,
      message: 'نظرات با موفقیت بازیابی شدند',
      data: {
        rows: rows.map((c) => ({
          id: c.id,
          content: c.content,
          approved: c.approved,
          rejectedAt: c.rejectedAt ?? null,
          status: toStatus(c.approved, c.rejectedAt ?? null),
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
        rejected,
      },
    };
  } catch {
    return { success: false, message: 'خطا در بارگذاری نظرات' };
  }
}

/**
 * تأیید یک نظر.
 */
export async function approveComment(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    await prisma.comment.update({
      where: { id },
      data: { approved: true, rejectedAt: null },
    });

    revalidateTag('comments');
    return { success: true, message: 'نظر تأیید شد', data: { id } };
  } catch {
    return { success: false, message: 'خطا در تأیید نظر' };
  }
}

/**
 * رد یک نظر (rejected).
 */
export async function rejectComment(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    await prisma.comment.update({
      where: { id },
      data: { approved: false, rejectedAt: new Date() },
    });

    revalidateTag('comments');
    return { success: true, message: 'نظر رد شد', data: { id } };
  } catch {
    return { success: false, message: 'خطا در رد نظر' };
  }
}

/**
 * لغو تأیید نظر (برگشت به pending).
 */
export async function unapproveComment(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    await prisma.comment.update({
      where: { id },
      data: { approved: false, rejectedAt: null },
    });

    revalidateTag('comments');
    return { success: true, message: 'تأیید نظر لغو شد', data: { id } };
  } catch {
    return { success: false, message: 'خطا در لغو تأیید نظر' };
  }
}

/**
 * برگرداندن نظر رد‌شده به pending.
 */
export async function restoreComment(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    await prisma.comment.update({
      where: { id },
      data: { approved: false, rejectedAt: null },
    });

    revalidateTag('comments');
    return { success: true, message: 'نظر به صف انتظار برگشت', data: { id } };
  } catch {
    return { success: false, message: 'خطا در بازیابی نظر' };
  }
}

/** @deprecated از approveComment / rejectComment / unapproveComment استفاده کنید */
export async function setCommentApproval(
  id: string,
  approved: boolean,
): Promise<ActionResult<{ id: string; approved: boolean }>> {
  const result = approved ? await approveComment(id) : await unapproveComment(id);
  if (!result.success) return { success: false, message: result.message ?? 'خطا' };
  return { success: true, message: result.message, data: { id, approved } };
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
 * تأیید گروهی نظرات.
 */
export async function bulkApproveComments(
  ids: string[],
): Promise<ActionResult<{ updated: number }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (ids.length === 0) return { success: false, message: 'نظری انتخاب نشده است' };

    const result = await prisma.comment.updateMany({
      where: { id: { in: ids } },
      data: { approved: true, rejectedAt: null },
    });

    revalidateTag('comments');
    return { success: true, message: 'نظرات تأیید شدند', data: { updated: result.count } };
  } catch {
    return { success: false, message: 'خطا در تأیید گروهی نظرات' };
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
      data: { approved: false, rejectedAt: new Date() },
    });

    revalidateTag('comments');
    return { success: true, message: 'نظرات رد شدند', data: { updated: result.count } };
  } catch {
    return { success: false, message: 'خطا در رد گروهی نظرات' };
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
