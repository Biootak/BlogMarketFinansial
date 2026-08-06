// 2026-06-23: dev/test email provider.
//
// Logs to stdout instead of sending. Useful for:
//   - local dev without leaking verification links to a real mailbox
//   - integration tests that assert "an email would have been sent"
//   - the dashboard's health check page so we can verify the template
//     renders without burning Resend quota
//
// Set EMAIL_PROVIDER=console. In production this throws — we never want
// to silently drop verification emails.

import type { EmailMessage, EmailProvider, EmailSendResult } from './types';

export function createConsoleProvider(): EmailProvider {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error(
      '[email:console] refusing to run in production. ' +
        'Set EMAIL_PROVIDER=resend (or smtp) and provide credentials.',
    );
  }

  return {
    name: 'console',
    async send(message: EmailMessage): Promise<EmailSendResult> {
      const id = `console-${Date.now()}`;
      // استخراج کد OTP از متن ایمیل (۶ رقمی)
      const codeMatch = message.html.match(/\b(\d{6})\b/) ?? message.text?.match(/\b(\d{6})\b/);
      const code = codeMatch?.[1];

      const lines = [
        '',
        '┌─────────────────────────────────────────┐',
        '│         📧  DEV EMAIL (console)          │',
        '├─────────────────────────────────────────┤',
        `│  To:      ${message.to.padEnd(29)}│`,
        `│  Subject: ${message.subject.slice(0, 29).padEnd(29)}│`,
        code ? `│  🔑 CODE:  ${code.padEnd(29)}│` : '│  (no 6-digit code found in body)        │',
        '└─────────────────────────────────────────┘',
        '',
      ].join('\n');
      process.stdout.write(`${lines}\n`);

      return { id, provider: 'console' };
    },
  };
}
