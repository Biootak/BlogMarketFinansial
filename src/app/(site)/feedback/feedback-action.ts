'use server';

/**
 * feedback-action.ts — ارسال بازخورد (H8-fix).
 *
 * پیام بازخورد + امتیاز به ایمیل پشتیبانی ارسال می‌شود (همان الگوی
 * contact-action.ts). امتیاز را validation می‌کند تا ورودی نامعتبر رد شود.
 */

import prisma from '@/lib/db';

export interface FeedbackFormState {
  success: boolean;
  error: string | null;
}

export async function submitFeedbackAction(formData: FormData): Promise<FeedbackFormState> {
  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const email = (formData.get('email') as string | null)?.trim() ?? '';
  const message = (formData.get('message') as string | null)?.trim() ?? '';
  const ratingRaw = Number((formData.get('rating') as string | null) ?? '0');

  if (!name || !email || !message) {
    return { success: false, error: 'لطفاً همه فیلدها را پر کنید.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'آدرس ایمیل معتبر نیست.' };
  }
  const rating = Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;

  try {
    // ذخیره در DB (ContactSubmission) — برای پیگیری ادمین
    const { v4 as createId } = await import('uuid');
    await prisma.contactSubmission.create({
      data: {
        id: createId(),
        name,
        email,
        subject: rating ? `بازخورد — ${rating}/۵` : 'بازخورد',
        message,
        status: 'NEW',
      },
    });

    // ارسال ایمیل به پشتیبانی
    const { getEmailProviderAsync } = await import('@/lib/email');
    const provider = await getEmailProviderAsync();
    const to = process.env.CONTACT_TO_EMAIL ?? process.env.RESEND_FROM ?? 'noreply@example.com';
    await provider.send({
      to,
      subject: `بازخورد جدید از ${name}${rating ? ` (${rating}/۵)` : ''}`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">بازخورد جدید از سایت</h2>
          <p><strong>نام:</strong> ${name}</p>
          <p><strong>ایمیل:</strong> ${email}</p>
          ${rating ? `<p><strong>امتیاز:</strong> ${rating} / ۵</p>` : ''}
          <hr />
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
      text: `بازخورد از ${name} (${email})${rating ? ` — ${rating}/۵` : ''}:\n\n${message}`,
      replyTo: email,
    });

    return { success: true, error: null };
  } catch {
    return { success: false, error: 'ارسال بازخورد ناموفق بود. لطفاً بعداً دوباره تلاش کنید.' };
  }
}
