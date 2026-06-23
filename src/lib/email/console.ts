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
      // 2026-06-23: stamp the rendered HTML so devs can copy-paste the
      // verification link straight from the terminal.
      console.log(
        [
          '┌── [email:console] ─────────────────────────────────',
          `│ to:      ${message.to}`,
          `│ subject: ${message.subject}`,
          '│',
          ...message.text?.split('\n').map((line) => `│ ${line}`) ?? [],
          '└──────────────────────────────────────────────────',
        ].join('\n'),
      );
      return { id: `console-${Date.now()}`, provider: 'console' };
    },
  };
}