// 2026-06-23: SMTP implementation of EmailProvider.
//
// Covers Mailgun, AWS SES (via SMTP), Postmark, Gmail, any SMTP relay.
// Drop-in: set EMAIL_PROVIDER=smtp + the four SMTP_* vars and you're done.
//
// Note: requires the `nodemailer` package. Add it with:
//   npm install nodemailer
//   npm install -D @types/nodemailer
// until a real SMTP provider is wired up, keep `EMAIL_PROVIDER=resend`.

import type { EmailMessage, EmailProvider, EmailSendResult, EmailConfigError } from './types';
import { EMAIL_ENV } from './types';

type NodemailerTransport = {
  sendMail: (opts: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    headers?: Record<string, string>;
  }) => Promise<{ messageId: string }>;
};

export async function createSmtpProvider(): Promise<EmailProvider> {
  const host = process.env[EMAIL_ENV.smtpHost];
  const port = Number(process.env[EMAIL_ENV.smtpPort] ?? 587);
  const user = process.env[EMAIL_ENV.smtpUser];
  const pass = process.env[EMAIL_ENV.smtpPass];
  const from = process.env[EMAIL_ENV.smtpFrom];

  const missing: string[] = [];
  if (!host) missing.push(EMAIL_ENV.smtpHost);
  if (!user) missing.push(EMAIL_ENV.smtpUser);
  if (!pass) missing.push(EMAIL_ENV.smtpPass);
  if (!from) missing.push(EMAIL_ENV.smtpFrom);
  if (missing.length > 0) {
    const { EmailConfigError } = await import('./types');
    throw new EmailConfigError('smtp', missing);
  }

  // Dynamic import keeps nodemailer out of the bundle when SMTP isn't used.
  const nodemailer = await import('nodemailer');
  const transport: NodemailerTransport = nodemailer.createTransport({
    host: host!,
    port,
    secure: port === 465,
    auth: { user: user!, pass: pass! },
  });

  return {
    name: 'smtp',
    async send(message: EmailMessage): Promise<EmailSendResult> {
      const info = await transport.sendMail({
        from: from!,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        headers: message.tags?.reduce<Record<string, string>>((acc, t) => {
          acc[`X-Tag-${t.name}`] = t.value;
          return acc;
        }, {}),
      });
      return { id: info.messageId, provider: 'smtp' };
    },
  };
}