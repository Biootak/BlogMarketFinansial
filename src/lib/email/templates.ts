// 2026-06-23: single OTP email template.
//
// One function, four intents. The body copy is Persian + a short English
// line for support tickets; HTML uses inline CSS (Gmail strips <style>),
// the code is rendered in a high-contrast box with letter-spacing so
// 6 digits stay readable on mobile.

import type { EmailMessage } from './types';

export type OtpEmailIntent =
  | 'register'
  | 'login'
  | 'reverify'
  | 'recover';

export interface OtpEmailArgs {
  to: string;
  code: string;
  intent: OtpEmailIntent;
  expiresLabel: string;
}

const COPY: Record<
  OtpEmailIntent,
  { subject: string; heading: string; body: string }
> = {
  register: {
    subject: 'کد تأیید ثبت‌نام / Verification code',
    heading: 'تأیید ثبت‌نام',
    body: 'برای فعال‌سازی حساب خود، این کد ۶ رقمی را در صفحهٔ باز شده وارد کنید.',
  },
  login: {
    subject: 'کد ورود / Sign-in code',
    heading: 'ورود به حساب',
    body: 'برای ورود بدون رمز عبور، این کد ۶ رقمی را در صفحهٔ باز شده وارد کنید.',
  },
  reverify: {
    subject: 'تأیید ایمیل / Verify your email',
    heading: 'تأیید ایمیل',
    body: 'برای تأیید ایمیل خود، این کد ۶ رقمی را در صفحهٔ باز شده وارد کنید.',
  },
  recover: {
    subject: 'بازنشانی رمز عبور / Reset password',
    heading: 'بازنشانی رمز عبور',
    body: 'برای تنظیم رمز عبور جدید، این کد ۶ رقمی را در صفحهٔ باز شده وارد کنید.',
  },
};

export function otpEmail(args: OtpEmailArgs): EmailMessage {
  const copy = COPY[args.intent];

  const text = [
    copy.heading,
    '',
    copy.body,
    '',
    'کد تأیید شما:',
    args.code,
    '',
    `این کد تا ${args.expiresLabel} معتبر است. اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.`,
    '',
    '— تیم بلاگ بازار مالی',
  ].join('\n');

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
  <body style="margin:0;padding:0;background:#f6f6f9;font-family:Tahoma,Arial,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
          <tr><td>
            <h1 style="margin:0 0 8px 0;font-size:20px;color:#111827">${copy.heading}</h1>
            <p style="margin:0 0 24px 0;line-height:1.7;color:#374151">${copy.body}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f3f4f6;border:1px dashed #d1d5db;border-radius:8px;margin:0 0 24px 0">
              <tr><td align="center" style="padding:20px 16px">
                <span style="font-family:Menlo,Consolas,'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#111827">${args.code}</span>
              </td></tr>
            </table>
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6">
              این کد تا ${args.expiresLabel} معتبر است و فقط یک‌بار قابل استفاده است.
            </p>
            <p style="margin:8px 0 0 0;font-size:12px;color:#9ca3af;line-height:1.6">
              If you didn't request this code you can safely ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return {
    to: args.to,
    subject: copy.subject,
    html,
    text,
    tags: [{ name: 'category', value: `otp:${args.intent}` }],
  };
}

/** "۱۰ دقیقهٔ دیگر" — reused in the UI copy for consistency. */
export function otpExpiresLabel(): string {
  return '۱۰ دقیقهٔ دیگر';
}
