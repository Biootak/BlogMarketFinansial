'use server';

/**
 * feedback-actions — بررسی بازخوردها و پیام‌های تماس (ادمین).
 *
 * فرم بازخورد عمومی از روز اول رکورد ContactSubmission می‌ساخت («برای پیگیری
 * ادمین») اما ادمین هرگز صفحه‌ای برای دیدن آن‌ها نداشت — پیام‌ها عملاً خاک
 * می‌خوردند. این ماژول فراهم می‌کند:
 *   - لیست پیام‌ها با جستجو و فیلتر وضعیت
 *   - گردش کار وضعیت: NEW → READ → REPLIED / ARCHIVED (تکی و گروهی)
 *   - حذف تکی و گروهی
 */

import prisma from '@/lib/db';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { ActionResult } from '@/types/types';
import { FEEDBACK_STATUSES, type FeedbackStatus } from './feedback-constants';

export type FeedbackRow = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  userId: string | null;
  status: FeedbackStatus;
  ipAddress: string | null;
  createdAt: Date;
  time: string;
};

export type FeedbackListResult = ActionResult<{
  rows: FeedbackRow[];
  total: number;
  newCount: number;
  repliedCount: number;
}>;

/** لیست پیام‌ها — جدیدترین‌ها اول؛ تا ۳۰۰ رکورد. */
export async function getFeedbackSubmissions(
  options: { limit?: number; offset?: number } = {},
): Promise<FeedbackListResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const limit = Math.min(options.limit ?? 200, 300);
    const offset = options.offset ?? 0;

    const [rows, total, newCount, repliedCount] = await Promise.all([
      prisma.contactSubmission.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.contactSubmission.count(),
      prisma.contactSubmission.count({ where: { status: 'NEW' } }),
      prisma.contactSubmission.count({ where: { status: 'REPLIED' } }),
    ]);

    return {
      success: true,
      message: 'بازخوردها با موفقیت بازیابی شدند',
      data: {
        rows: rows.map((f) => ({
          id: f.id,
          name: f.name,
          email: f.email,
          subject: f.subject,
          message: f.message,
          userId: f.userId,
          status: (FEEDBACK_STATUSES.includes(f.status as FeedbackStatus)
            ? f.status
            : 'NEW') as FeedbackStatus,
          ipAddress: f.ipAddress,
          createdAt: f.createdAt,
          time: f.createdAt.toLocaleString('fa-IR'),
        })),
        total,
        newCount,
        repliedCount,
      },
    };
  } catch {
    return { success: false, message: 'خطا در بارگذاری بازخوردها' };
  }
}

/** تغییر وضعیت یک یا چند پیام. */
export async function setFeedbackStatus(
  ids: string[],
  status: FeedbackStatus,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (ids.length === 0) return { success: false, message: 'پیامی انتخاب نشده است' };
    if (!FEEDBACK_STATUSES.includes(status)) {
      return { success: false, message: 'وضعیت نامعتبر است' };
    }

    const result = await prisma.contactSubmission.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    revalidateTag('feedback');
    return { success: true, message: 'وضعیت به‌روزرسانی شد', data: { updated: result.count } };
  } catch {
    return { success: false, message: 'خطا در به‌روزرسانی وضعیت' };
  }
}

/** حذف پیام‌ها (تکی یا گروهی). */
export async function deleteFeedback(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (ids.length === 0) return { success: false, message: 'پیامی انتخاب نشده است' };

    const result = await prisma.contactSubmission.deleteMany({ where: { id: { in: ids } } });

    revalidateTag('feedback');
    return { success: true, message: 'پیام‌ها حذف شدند', data: { deleted: result.count } };
  } catch {
    return { success: false, message: 'خطا در حذف پیام‌ها' };
  }
}
