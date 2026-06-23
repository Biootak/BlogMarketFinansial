// 2026-06-23: shared email templates. Pure functions → identical output
// across every provider.
//
// 2026 best practice for transactional email:
//   - HTML body + plaintext fallback (deliverability)
//   - inline CSS only (Gmail strips <style>)
//   - explicit subject in Persian + English for support tickets
//   - single CTA button (not a link farm)

import type { EmailMessage } from './types';

export interface VerificationEmailArgs {
  to: string;
  /** Absolute URL of the verification page, including the token. */
  url: string;
  /** ISO-formatted, e.g. "دو ساعت دیگر". */
  expiresLabel: string;
}

export function verificationEmail({ to, url, expiresLabel }: VerificationEmailArgs): EmailMessage {
  const subject = 'تأیید ایمیل — Verify your email';
  const text = [
    'سلام،',
    '',
    'برای فعال‌سازی حساب خود روی لینک زیر کلیک کنید:',
    url,
    '',
    `این لینک تا ${expiresLabel} معتبر است.`,
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
            <h1 style="margin:0 0 16px 0;font-size:20px;color:#111827">تأیید ایمیل</h1>
            <p style="margin:0 0 24px 0;line-height:1.7;color:#374151">
              برای فعال‌سازی حساب خود روی دکمه زیر کلیک کنید. این لینک تا ${expiresLabel} معتبر است.
            </p>
            <p style="margin:0 0 24px 0;text-align:center">
              <a href="${url}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
                        padding:12px 24px;border-radius:8px;font-weight:600">
                تأیید ایمیل
              </a>
            </p>
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6">
              اگر دکمه کار نکرد، این لینک را در مرورگر کپی کنید:<br>
              <span style="word-break:break-all;color:#374151">${url}</span>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { to, subject, html, text, tags: [{ name: 'category', value: 'verification' }] };
}