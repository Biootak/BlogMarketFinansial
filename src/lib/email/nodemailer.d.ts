// 2026-06-23: optional dependency declaration for `nodemailer`. The
// SMTP email provider (`src/lib/email/smtp.ts`) loads it via
// `await import('nodemailer')`, but the package is not installed unless
// the user explicitly opts into EMAIL_PROVIDER=smtp. Without this
// ambient declaration TypeScript fails the build with TS2307 even
// though the runtime path is unreachable when EMAIL_PROVIDER!=smtp.
//
// If you DO install nodemailer (`npm install nodemailer -D`), delete
// this file — the real package's types will take over.

declare module 'nodemailer' {
  export interface SendMailOptions {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    headers?: Record<string, string>;
  }

  export interface SentMessageInfo {
    messageId: string;
  }

  export interface Transport {
    sendMail: (opts: SendMailOptions) => Promise<SentMessageInfo>;
  }

  export interface TransportOptions {
    host: string;
    port: number;
    secure?: boolean;
    auth?: { user: string; pass: string };
  }

  export function createTransport(opts: TransportOptions): Transport;
  const _default: { createTransport: typeof createTransport };
  export default _default;
}