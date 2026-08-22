// 2026-06-23: Resend implementation of EmailProvider.
//
// Migration cost from the current src/lib/mail.ts → this file:
//   - mail.ts becomes a 3-line wrapper around getEmailProvider()
//   - all other call sites stay as-is

import { Resend } from 'resend';
import {
  EMAIL_ENV,
  EmailConfigError,
  type EmailMessage,
  type EmailProvider,
  type EmailSendResult,
} from './types';

/**
 * FIX (2026-08-22 — prod incident): Resend فقط tag name/value با الگوی
 * ASCII `[a-zA-Z0-9_-]` را می‌پذیرد. قالب‌های ما مقدارهایی مثل
 * «otp:phone-verify» می‌فرستادند و کاراکتر `:` کل ایمیل را رد می‌کرد —
 * یعنی همهٔ OTP ایمیلی، بازیابی رمز و رسید سرویس در production شکست می‌خورد.
 * پاک‌سازی اینجا در نقطهٔ واحد provider انجام می‌شود تا هیچ قالب آینده‌ای
 * نتواند ارسال را بشکند (دفاع در عمق).
 */
function sanitizeResendTag(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  return cleaned.length > 0 ? cleaned : 'tag';
}

export const __sanitizeResendTagForTests = sanitizeResendTag;

export function createResendProvider(): EmailProvider {
  const apiKey = process.env[EMAIL_ENV.resendKey];
  const from = process.env[EMAIL_ENV.resendFrom] ?? 'onboarding@resend.dev';

  if (!apiKey) {
    throw new EmailConfigError('resend', [EMAIL_ENV.resendKey]);
  }

  const client = new Resend(apiKey);

  return {
    name: 'resend',
    async send(message: EmailMessage): Promise<EmailSendResult> {
      const result = await client.emails.send({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        tags: message.tags?.map((t) => ({
          name: sanitizeResendTag(t.name),
          value: sanitizeResendTag(t.value),
        })),
      });

      if (result.error) {
        // Resend's typed error — surface message so the toast can show it.
        throw new Error(`[resend] ${result.error.message}`);
      }

      return { id: result.data?.id ?? 'unknown', provider: 'resend' };
    },
  };
}
