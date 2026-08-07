'use server';

/**
 * Contact form server action.
 * Sends a contact email via the configured email provider.
 */

export interface ContactFormState {
  success: boolean;
  error: string | null;
}

/** escape HTML special chars to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendContactAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const email = (formData.get('email') as string | null)?.trim() ?? '';
  const message = (formData.get('message') as string | null)?.trim() ?? '';

  if (!name || !email || !message) {
    return { success: false, error: 'لطفاً همه فیلدها را پر کنید.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'آدرس ایمیل معتبر نیست.' };
  }

  try {
    const { getEmailProviderAsync } = await import('@/lib/email');
    const provider = await getEmailProviderAsync();
    const to = process.env.CONTACT_TO_EMAIL ?? process.env.RESEND_FROM ?? 'noreply@example.com';
    // escape user input before embedding in HTML to prevent XSS
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);
    await provider.send({
      to,
      subject: `پیام جدید از ${safeName} — فرم تماس`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">پیام جدید از سایت</h2>
          <p><strong>نام:</strong> ${safeName}</p>
          <p><strong>ایمیل:</strong> ${safeEmail}</p>
          <hr />
          <p style="white-space: pre-wrap;">${safeMessage}</p>
        </div>
      `,
      text: `پیام از ${name} (${email}):\n\n${message}`,
      replyTo: email,
    });
    return { success: true, error: null };
  } catch {
    return { success: false, error: 'ارسال پیام ناموفق بود. لطفاً بعداً دوباره تلاش کنید.' };
  }
}
