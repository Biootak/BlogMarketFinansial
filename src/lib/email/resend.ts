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
        tags: message.tags?.map((t) => ({ name: t.name, value: t.value })),
      });

      if (result.error) {
        // Resend's typed error — surface message so the toast can show it.
        throw new Error(`[resend] ${result.error.message}`);
      }

      return { id: result.data?.id ?? 'unknown', provider: 'resend' };
    },
  };
}
