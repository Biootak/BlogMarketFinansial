// 2026-06-23: vendor-neutral email provider abstraction.
//
// Goal: let us swap Resend ↔ nodemailer (Mailgun / SES / Postmark / Gmail)
//      ↔ a console logger (dev/test) by setting EMAIL_PROVIDER in .env
//      and not touching any caller.
//
// Pattern: Strategy + Factory.
//
//   ┌─────────────────────────────────────────────────────┐
//   │ src/lib/email/index.ts  →  getEmailProvider()       │
//   │   selects impl from process.env.EMAIL_PROVIDER      │
//   └─────────────────────────────────────────────────────┘
//                              │
//              ┌───────────────┼───────────────┐
//              ▼               ▼               ▼
//        ResendProvider   SmtpProvider    ConsoleProvider
//        (vendor SDK)    (nodemailer)     (stdout, dev only)
//
// Caller API is a single interface (`EmailProvider.send`). Templates live
// in `templates.ts` so the HTML/Plaintext body is shared across providers.
//
// Adding a new provider:
//   1. drop a new file in src/lib/email/ that implements EmailProvider
//   2. add a `case` in getEmailProvider()
//   3. add the env vars to .env.example
// No call site needs to change.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Reply-To header. Useful for support@ flows. */
  replyTo?: string;
  /** Tags for filtering in the vendor dashboard (Resend/SES). */
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailSendResult {
  /** Vendor-side message id (or a synthetic one for console/mock providers). */
  id: string;
  provider: string;
}

export interface EmailProvider {
  /** Short identifier used in logs and tags. */
  readonly name: string;
  /**
   * Send a transactional email. Must reject (not silently swallow) on
   * validation errors; downstream code translates these into toast
   * messages for the user.
   */
  send(message: EmailMessage): Promise<EmailSendResult>;
}

/** Subset of envs the factory reads. Documented for grep-ability. */
export const EMAIL_ENV = {
  provider: 'EMAIL_PROVIDER',
  resendKey: 'RESEND_API_KEY',
  resendFrom: 'RESEND_FROM',
  smtpHost: 'SMTP_HOST',
  smtpPort: 'SMTP_PORT',
  smtpUser: 'SMTP_USER',
  smtpPass: 'SMTP_PASS',
  smtpFrom: 'SMTP_FROM',
} as const;

export type EmailProviderName = 'resend' | 'smtp' | 'console';

/**
 * Validation error: missing env config. Callers should turn this into a
 * 500 toast + an entry in the dashboard's health check.
 */
export class EmailConfigError extends Error {
  constructor(provider: string, missing: string[]) {
    super(
      `[email:${provider}] missing required env vars: ${missing.join(', ')}. ` +
        `Set them in .env, or pick a different EMAIL_PROVIDER.`,
    );
    this.name = 'EmailConfigError';
  }
}