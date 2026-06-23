// 2026-06-23: email factory + cached singleton.
//
// `getEmailProvider()` is memoized so we don't construct the Resend
// client (or open the SMTP socket) on every send. The first call decides
// the provider for the lifetime of the process.
//
// To migrate from src/lib/mail.ts to this module:
//   1. delete mail.ts
//   2. in auth-actions.ts change:
//        import { sendVerificationEmail } from '@/lib/mail';
//        await sendVerificationEmail(email, token);
//      to:
//        import { getEmailProvider } from '@/lib/email';
//        import { verificationEmail } from '@/lib/email/templates';
//        const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify-request?token=${token}`;
//        await getEmailProvider().send(verificationEmail({ to: email, url }));
//   3. set EMAIL_PROVIDER in .env (default stays `resend`)

import {
  type EmailProvider,
  type EmailProviderName,
  EmailConfigError,
  EMAIL_ENV,
} from './types';
import { createResendProvider } from './resend';
import { createConsoleProvider } from './console';

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;

  const name = (process.env[EMAIL_ENV.provider] ?? 'resend') as EmailProviderName;
  switch (name) {
    case 'resend':
      cached = createResendProvider();
      break;
    case 'smtp':
      // SMTP factory is async (dynamic import of nodemailer) — we
      // don't cache here; call `await getEmailProviderAsync()` instead.
      throw new Error(
        '[email] SMTP provider requires async initialization. ' +
          'Use getEmailProviderAsync() instead of getEmailProvider().',
      );
    case 'console':
      cached = createConsoleProvider();
      break;
    default:
      throw new EmailConfigError(name, [EMAIL_ENV.provider]);
  }

  return cached;
}

export async function getEmailProviderAsync(): Promise<EmailProvider> {
  if (cached) return cached;
  const name = (process.env[EMAIL_ENV.provider] ?? 'resend') as EmailProviderName;
  if (name === 'smtp') {
    // 2026-06-23: webpackIgnore keeps the nodemailer import out of the
    // server-action bundle when the SMTP provider isn't in use. Without
    // it, Next 16's webpack trace walks the dynamic import and fails
    // the build even though `process.env.EMAIL_PROVIDER` is 'resend'.
    const { createSmtpProvider } = await import(
      /* webpackIgnore: true */ './smtp'
    );
    cached = await createSmtpProvider();
    return cached;
  }
  return getEmailProvider();
}

/** Test helper: resets the cache. Not exported from the package barrel. */
export function __resetEmailProviderForTests(): void {
  cached = null;
}

export type { EmailMessage, EmailProvider, EmailSendResult, EmailProviderName } from './types';
export { EmailConfigError, EMAIL_ENV } from './types';