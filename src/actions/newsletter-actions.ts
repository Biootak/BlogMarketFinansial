'use server';

/**
 * newsletter-actions — مدیریت مشترکین خبرنامه (ادمین).
 *
 * مدل Newsletter از روز اول وجود داشت و فرم عضویت در صفحهٔ اصلی ثبت‌نام می‌کرد،
 * اما ادمین راهی برای دیدن مشترکین یا خروجی گرفتن نداشت. این ماژول فراهم می‌کند:
 *   - لیست مشترکین با جستجو و فیلتر وضعیت
 *   - فعال/غیرفعال کردن و حذف تکی و گروهی
 *   - خروجی CSV (همهٔ مشترکین، بدون محدودیت صفحه)
 *   - ارسال خبرنامهٔ دسته‌جمعی (اگر سرویس ایمیل پیکربندی شده باشد)
 */

import prisma from '@/lib/db';
import { getEmailProvider } from '@/lib/email';
import { authFailureToActionResult, requireAdmin } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { ActionResult } from '@/types/types';

export type NewsletterRow = {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  time: string;
  linkedUser: boolean;
};

export type NewsletterListResult = ActionResult<{
  rows: NewsletterRow[];
  total: number;
  active: number;
  inactive: number;
}>;

/** لیست مشترکین — تا ۱۰۰۰ رکورد برای فیلتر سمت کلاینت. */
export async function getNewsletterSubscribers(): Promise<NewsletterListResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const [rows, total, active, inactive] = await Promise.all([
      prisma.newsletter.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      prisma.newsletter.count(),
      prisma.newsletter.count({ where: { isActive: true } }),
      prisma.newsletter.count({ where: { isActive: false } }),
    ]);

    return {
      success: true,
      message: 'مشترکین با موفقیت بازیابی شدند',
      data: {
        rows: rows.map((n) => ({
          id: n.id,
          email: n.email,
          isActive: n.isActive,
          createdAt: n.createdAt,
          time: n.createdAt.toLocaleString('fa-IR'),
          linkedUser: Boolean(n.userId),
        })),
        total,
        active,
        inactive,
      },
    };
  } catch {
    return { success: false, message: 'خطا در بارگذاری مشترکین خبرنامه' };
  }
}

/** فعال/غیرفعال کردن یک مشترک. */
export async function setSubscriberActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<{ id: string; isActive: boolean }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    await prisma.newsletter.update({ where: { id }, data: { isActive } });

    revalidateTag('newsletter');
    return {
      success: true,
      message: isActive ? 'مشترک فعال شد' : 'مشترک غیرفعال شد',
      data: { id, isActive },
    };
  } catch {
    return { success: false, message: 'خطا در به‌روزرسانی مشترک' };
  }
}

/** حذف مشترکین (تکی یا گروهی). */
export async function deleteSubscribers(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);
    if (ids.length === 0) return { success: false, message: 'مشترکی انتخاب نشده است' };

    const result = await prisma.newsletter.deleteMany({ where: { id: { in: ids } } });

    revalidateTag('newsletter');
    return { success: true, message: 'مشترکین حذف شدند', data: { deleted: result.count } };
  } catch {
    return { success: false, message: 'خطا در حذف مشترکین' };
  }
}

/** خروجی CSV همهٔ مشترکین فعال — بدون محدودیت صفحه. */
export async function exportNewsletterCsv(): Promise<
  ActionResult<{ csv: string; filename: string; count: number }>
> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const rows = await prisma.newsletter.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = 'email,status,registeredAt';
    const lines = rows.map((r) =>
      [csvEscape(r.email), r.isActive ? 'active' : 'inactive', r.createdAt.toISOString()].join(','),
    );

    return {
      success: true,
      message: 'خروجی CSV آماده شد',
      data: {
        csv: [header, ...lines].join('\n'),
        filename: `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`,
        count: rows.length,
      },
    };
  } catch {
    return { success: false, message: 'خطا در تولید خروجی' };
  }
}

export type BroadcastInput = { subject: string; body: string };

/**
 * ارسال خبرنامه به همهٔ مشترکین فعال.
 * اگر سرویس ایمیل (Resend) پیکربندی نشده باشد، خطای دوستانه برمی‌گرداند —
 * بدون اینکه چیزی خراب شود.
 */
export async function sendNewsletterBroadcast(
  input: BroadcastInput,
): Promise<ActionResult<{ sent: number }>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return authFailureToActionResult(authCheck);

    const subject = input.subject?.trim();
    const body = input.body?.trim();
    if (!subject) return { success: false, message: 'موضوع خبرنامه الزامی است' };
    if (!body) return { success: false, message: 'متن خبرنامه الزامی است' };
    if (body.length > 50_000)
      return { success: false, message: 'متن خبرنامه بیش از حد طولانی است' };

    const subscribers = await prisma.newsletter.findMany({
      where: { isActive: true },
      select: { email: true },
    });
    if (subscribers.length === 0) return { success: false, message: 'مشترک فعالی وجود ندارد' };

    let provider: ReturnType<typeof getEmailProvider>;
    try {
      provider = getEmailProvider();
    } catch {
      return {
        success: false,
        message: 'سرویس ایمیل پیکربندی نشده است — خبرنامه ارسال نشد',
      };
    }

    // بسته‌های ۵۰تایی تا ایمیل‌فرستنده درگیر نشود
    let sent = 0;
    for (let i = 0; i < subscribers.length; i += 50) {
      const batch = subscribers.slice(i, i + 50);
      await Promise.all(
        batch.map(async (s) => {
          try {
            await provider.send({
              to: s.email,
              subject,
              html: `<div style="font-family:Vazirmatn,Tahoma,sans-serif;line-height:1.9;color:#1c2430;max-width:600px;margin:0 auto;padding:24px"><h2 style="margin:0 0 12px">${subject}</h2><p>${body}</p></div>`,
              text: `${subject}\n\n${body}`,
            });
            sent += 1;
          } catch {
            // یک ایمیل ناموفق کل کمپین را خراب نمی‌کند
          }
        }),
      );
    }

    return { success: true, message: 'خبرنامه ارسال شد', data: { sent } };
  } catch {
    return { success: false, message: 'خطا در ارسال خبرنامه' };
  }
}
