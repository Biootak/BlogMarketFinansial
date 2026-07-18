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
  | 'recover'
  | 'service-verify';

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
  'service-verify': {
    subject: 'کد تأیید درخواست خدمات / Service request code',
    heading: 'تأیید درخواست',
    body: 'برای تأیید ایمیل و ثبت نهایی درخواست خدمات خود، این کد ۶ رقمی را وارد کنید.',
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
    '— تیم بلاگ Financial Market',
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

// ─── Service Request confirmation email ──────────────────────────────────── //

export interface ServiceRequestConfirmationArgs {
  to: string;
  fullName: string;
  trackingCode: string;
  serviceType: string;
  amount: string;
  currency: string;
  appUrl: string;
}

const SERVICE_LABELS: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد فریلنسری',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار / اشتراک',
  OTHER: 'سایر خدمات',
};

export function serviceRequestConfirmationEmail(
  args: ServiceRequestConfirmationArgs,
): EmailMessage {
  const serviceLabel = SERVICE_LABELS[args.serviceType] ?? args.serviceType;
  const trackingUrl = `${args.appUrl}/online-payment#tracking`;

  const text = [
    `${args.fullName} عزیز،`,
    '',
    'درخواست شما با موفقیت ثبت شد.',
    '',
    `کد پیگیری: ${args.trackingCode}`,
    `نوع خدمات: ${serviceLabel}`,
    `مبلغ: ${args.amount} ${args.currency}`,
    '',
    `برای پیگیری وضعیت درخواست خود به آدرس زیر مراجعه کنید:`,
    trackingUrl,
    '',
    'تیم ما در کمتر از ۳۰ دقیقه با شما تماس خواهد گرفت.',
    '',
    '— تیم Financial Market',
  ].join('\n');

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
  <body style="margin:0;padding:0;background:#f6f6f9;font-family:Tahoma,Arial,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
          <tr><td>
            <h1 style="margin:0 0 8px 0;font-size:20px;color:#111827">درخواست شما ثبت شد ✓</h1>
            <p style="margin:0 0 24px 0;line-height:1.7;color:#374151">
              ${args.fullName} عزیز، درخواست شما با موفقیت دریافت شد. کد پیگیری خود را نگه دارید.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin:0 0 20px 0">
              <tr><td style="padding:16px 20px">
                <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">کد پیگیری</p>
                <p style="margin:0;font-family:Menlo,Consolas,'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:4px;color:#0369a1">${args.trackingCode}</p>
              </td></tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e7eb;border-radius:8px;margin:0 0 24px 0">
              <tr>
                <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6b7280">نوع خدمات</td>
                <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#111827;text-align:left" dir="ltr">${serviceLabel}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6b7280">مبلغ</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;text-align:left" dir="ltr">${args.amount} ${args.currency}</td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:20px">
                <a href="${trackingUrl}"
                   style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600">
                  مشاهده وضعیت سفارش ←
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 16px 0;font-size:11px;color:#9ca3af;text-align:center">
              یا کد زیر را در صفحه پیگیری وارد کنید:
              <span style="display:block;font-family:Menlo,Consolas,monospace;font-size:13px;color:#374151;letter-spacing:2px;margin-top:4px" dir="ltr">${args.trackingCode}</span>
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
              تیم ما در کمتر از ۳۰ دقیقه با شما تماس خواهد گرفت.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return {
    to: args.to,
    subject: `تأییدیه درخواست ${args.trackingCode} / Service Request Confirmation`,
    html,
    text,
    tags: [{ name: 'category', value: 'service-request:confirmation' }],
  };
}

// ─── Service Request status-change notification email ─────────────────────── //

export interface ServiceRequestStatusEmailArgs {
  to: string;
  fullName: string;
  trackingCode: string;
  newStatus: string;
  adminNote?: string | null;
  appUrl: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

export function serviceRequestStatusEmail(
  args: ServiceRequestStatusEmailArgs,
): EmailMessage {
  const statusLabel = STATUS_LABELS[args.newStatus] ?? args.newStatus;
  const trackingUrl = `${args.appUrl}/online-payment#tracking`;

  const text = [
    `${args.fullName} عزیز،`,
    '',
    `وضعیت درخواست شما (${args.trackingCode}) به "${statusLabel}" تغییر یافت.`,
    ...(args.adminNote ? ['', `یادداشت: ${args.adminNote}`] : []),
    '',
    `برای مشاهده جزئیات: ${trackingUrl}`,
    '',
    '— تیم Financial Market',
  ].join('\n');

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
  <body style="margin:0;padding:0;background:#f6f6f9;font-family:Tahoma,Arial,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
          <tr><td>
            <h1 style="margin:0 0 8px 0;font-size:20px;color:#111827">بروزرسانی وضعیت درخواست</h1>
            <p style="margin:0 0 20px 0;line-height:1.7;color:#374151">
              ${args.fullName} عزیز، وضعیت درخواست شما تغییر یافته است.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:0 0 20px 0">
              <tr><td style="padding:16px 20px">
                <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280">کد پیگیری</p>
                <p style="margin:0 0 12px 0;font-family:Menlo,Consolas,'Courier New',monospace;font-size:16px;font-weight:700;letter-spacing:3px;color:#166534">${args.trackingCode}</p>
                <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280">وضعیت جدید</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:#15803d">${statusLabel}</p>
              </td></tr>
            </table>
            ${args.adminNote ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin:0 0 20px 0">
              <tr><td style="padding:14px 16px">
                <p style="margin:0 0 4px 0;font-size:11px;color:#92400e">یادداشت تیم</p>
                <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6">${args.adminNote}</p>
              </td></tr>
            </table>` : ''}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${trackingUrl}"
                   style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600">
                  مشاهده جزئیات
                </a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return {
    to: args.to,
    subject: `وضعیت درخواست ${args.trackingCode}: ${statusLabel}`,
    html,
    text,
    tags: [{ name: 'category', value: 'service-request:status-change' }],
  };
}

// ─── Service Request OTP (Progressive Capture) ────────────────────────────── //

export interface ServiceVerifyOtpArgs {
  to: string;
  code: string;
  trackingCode: string;
  expiresAt: Date;
}

export function serviceVerifyOtpEmail(args: ServiceVerifyOtpArgs): EmailMessage {
  const expiresLabel = '۱۰ دقیقهٔ دیگر';
  const text = [
    'کد تأیید ایمیل درخواست شما',
    '',
    `کد پیگیری: ${args.trackingCode}`,
    '',
    'کد ۶ رقمی تأیید:',
    args.code,
    '',
    `این کد تا ${expiresLabel} معتبر است و فقط یک‌بار قابل استفاده است.`,
    'اگر این درخواست را شما نداده‌اید، این ایمیل را نادیده بگیرید.',
    '',
    '— تیم Financial Market',
  ].join('\n');

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
  <body style="margin:0;padding:0;background:#f6f6f9;font-family:Tahoma,Arial,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
          <tr><td>
            <h1 style="margin:0 0 8px 0;font-size:20px;color:#111827">تأیید ایمیل درخواست</h1>
            <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280">کد پیگیری:</p>
            <p style="margin:0 0 24px 0;font-family:Menlo,Consolas,'Courier New',monospace;font-size:16px;font-weight:700;letter-spacing:3px;color:#0369a1">${args.trackingCode}</p>
            <p style="margin:0 0 16px 0;line-height:1.7;color:#374151">
              برای تأیید ایمیل و ثبت نهایی درخواست، کد زیر را وارد کنید:
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f3f4f6;border:1px dashed #d1d5db;border-radius:8px;margin:0 0 24px 0">
              <tr><td align="center" style="padding:20px 16px">
                <span style="font-family:Menlo,Consolas,'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#111827">${args.code}</span>
              </td></tr>
            </table>
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6">
              این کد تا ${expiresLabel} معتبر است و فقط یک‌بار قابل استفاده است.
            </p>
            <p style="margin:8px 0 0 0;font-size:12px;color:#9ca3af;line-height:1.6">
              If you didn't submit this request, you can safely ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return {
    to: args.to,
    subject: `کد تأیید درخواست ${args.trackingCode}`,
    html,
    text,
    tags: [{ name: 'category', value: 'service-request:otp' }],
  };
}

// ─── Welcome + Set-Password email (Progressive Capture) ──────────────────── //
// Sent immediately after a new account is auto-created via OTP verification.
// Contains a single-use password-reset token (64-char hex, 24 h TTL) so the
// user can set a permanent password without going through "Forgot Password".

export interface WelcomeSetPasswordArgs {
  to: string;
  name: string;
  trackingCode: string;
  resetToken: string;     // 64-char hex from generatePasswordResetToken
  appUrl: string;
}

export function welcomeSetPasswordEmail(args: WelcomeSetPasswordArgs): EmailMessage {
  // URL the user clicks to land on /auth?mode=set-password&email=…&token=…
  const setPasswordUrl = new URL('/auth', args.appUrl);
  setPasswordUrl.searchParams.set('mode', 'set-password');
  setPasswordUrl.searchParams.set('email', args.to);
  setPasswordUrl.searchParams.set('token', args.resetToken);
  const link = setPasswordUrl.toString();

  const text = [
    `${args.name} عزیز،`,
    '',
    'حساب کاربری شما در Financial Market ساخته شد.',
    '',
    `کد پیگیری درخواست: ${args.trackingCode}`,
    '',
    'برای ورود به پنل کاربری، ابتدا رمز عبور خود را تنظیم کنید:',
    link,
    '',
    'این لینک ۲۴ ساعت معتبر است و فقط یک‌بار قابل استفاده است.',
    'اگر این حساب را شما نساختید، این ایمیل را نادیده بگیرید.',
    '',
    '— تیم Financial Market',
  ].join('\n');

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
  <body style="margin:0;padding:0;background:#f6f6f9;font-family:Tahoma,Arial,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
          <tr><td>
            <h1 style="margin:0 0 6px 0;font-size:20px;color:#111827">خوش آمدید به Financial Market 👋</h1>
            <p style="margin:0 0 20px 0;font-size:13px;color:#6b7280">حساب کاربری شما آماده است</p>
            <p style="margin:0 0 16px 0;line-height:1.7;color:#374151">
              ${args.name} عزیز، درخواست خدمات شما (<strong dir="ltr" style="font-family:Menlo,Consolas,monospace;letter-spacing:2px;color:#0369a1">${args.trackingCode}</strong>) با موفقیت ثبت شد و یک حساب کاربری برای شما ساخته شد.
            </p>
            <p style="margin:0 0 24px 0;line-height:1.7;color:#374151">
              برای ورود به پنل کاربری و مشاهده وضعیت درخواست‌هایتان، ابتدا یک رمز عبور برای خود تنظیم کنید:
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0">
              <tr><td align="center">
                <a href="${link}"
                   style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;padding:14px 32px;font-size:15px;font-weight:700;letter-spacing:0.02em">
                  تنظیم رمز عبور
                </a>
              </td></tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 20px 0">
              <tr><td style="padding:12px 16px">
                <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280">لینک تنظیم رمز (۲۴ ساعت معتبر)</p>
                <p style="margin:0;font-size:11px;color:#94a3b8;word-break:break-all;direction:ltr;text-align:left">${link}</p>
              </td></tr>
            </table>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
              اگر این حساب را شما نساختید، این ایمیل را نادیده بگیرید — هیچ اقدامی نیاز نیست.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return {
    to: args.to,
    subject: `حساب کاربری شما آماده است — رمز عبور بسازید`,
    html,
    text,
    tags: [{ name: 'category', value: 'account:welcome-set-password' }],
  };
}
