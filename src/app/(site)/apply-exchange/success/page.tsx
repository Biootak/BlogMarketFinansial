/**
 * /apply-exchange/success — Million-dollar confirmation state (2026)
 *
 * Replaces a basic inline-styled "✓ درخواست ثبت شد" with a proper
 * delivery-confirmation surface: check mark with halo + halo rings,
 * asymmetric summary grid, asymmetric CTA pair, and a tip rail.
 *
 * Server Component. Tokens only. RTL logical props. Mobile-first.
 *
 * تغییر ۲۰۲۶-۰۷-۲۹:
 *   لینک اشتباه «پیگیری درخواست‌ها → /customer/2fa» حذف شد.
 *   customer/2fa صفحهٔ تنظیمات امنیتی است، نه پیگیری درخواست.
 *   جایگزین: «تماس با پشتیبانی» → /contact (واقعی و در routes ثبت‌شده).
 */
import { ArrowLeft, CheckCircle2, Home, Lightbulb, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import s from './success.module.css';

export const metadata: Metadata = {
  title: 'درخواست ثبت شد | صرافی',
  robots: { index: false },
};

/** کوتاه‌سازی UUID/CUID به ۸ کاراکتر برای نمایش به کاربر */
function shortTrackId(id: string): string {
  if (!id) return '';
  // آخرین ۸ کاراکتر را بگیر و به حروف بزرگ تبدیل کن
  const clean = id.replace(/-/g, '').toUpperCase();
  if (clean.length >= 8) {
    const part = clean.slice(-8);
    return `${part.slice(0, 4)}-${part.slice(4)}`;
  }
  return clean || '';
}

export default async function ApplyExchangeSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ۲۰۲۶-۰۷-۲۹: استفاده از id واقعی اگر از فرم ارسال شده باشد
  // FIX (2026-08-01): کد پیگیری جعلی حذف شد — «داده واقعی، نه نمایشی».
  // قبلاً اگر ?id= نبود، کد ساختگی با هر refresh عوض می‌شد که کاربر را گمراه
  // می‌کرد. حالا فقط کد واقعی از فرم نمایش داده می‌شود؛ بدون آن، بخش کد
  // حذف و پیام «در انتظار تأیید» نمایش داده می‌شود.
  const sp = (await searchParams) ?? {};
  const rawId = typeof sp.id === 'string' ? sp.id : '';
  const trackId = rawId ? shortTrackId(rawId) : '';
  const now = new Date();

  const summary = {
    code: trackId,
    date: new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(now),
    time: new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now),
    eta: '۲۴ تا ۴۸ ساعت',
  } as const;

  return (
    <div className={s.root} dir="rtl">
      <div className={s.field} aria-hidden />

      <div className={s.shell}>
        <div className={s.mark} aria-hidden>
          <CheckCircle2 size={36} strokeWidth={2} />
        </div>

        <h1 className={s.title}>درخواست شما با موفقیت ثبت شد</h1>
        <p className={s.lead}>
          تیم ما درخواست ثبت صرافی شما را دریافت کرد. پس از بررسی مدارک و تأیید نهایی، ایمیل
          فعال‌سازی پنل صرافی برایتان ارسال خواهد شد.
        </p>

        <dl className={s.summary} aria-label="جزئیات درخواست">
          {summary.code && (
            <div className={s.summaryItem}>
              <dt className={s.summaryLabel}>کد پیگیری</dt>
              <dd className={s.summaryValue} dir="ltr">
                {summary.code}
              </dd>
            </div>
          )}
          <div className={s.summaryItem}>
            <dt className={s.summaryLabel}>تاریخ ثبت</dt>
            <dd className={s.summaryValue}>{summary.date}</dd>
          </div>
          <div className={s.summaryItem}>
            <dt className={s.summaryLabel}>ساعت</dt>
            <dd className={s.summaryValue}>{summary.time}</dd>
          </div>
          <div className={s.summaryItem}>
            <dt className={s.summaryLabel}>زمان تقریبی بررسی</dt>
            <dd className={s.summaryValue}>{summary.eta}</dd>
          </div>
        </dl>

        <div className={s.tip} role="note">
          <Lightbulb className={s.tipIcon} aria-hidden size={16} strokeWidth={1.8} />
          <span>
            {summary.code
              ? 'کد پیگیری را ذخیره کنید. در صورت نیاز به پیگیری، این کد را به پشتیبانی ارائه دهید.'
              : 'برای پیگیری وضعیت درخواست، کد ارسال‌شده به ایمیل‌تان را به پشتیبانی ارائه دهید.'}
          </span>
        </div>

        <div className={s.actions}>
          <Link href="/" className={s.btnPrimary}>
            <Home size={16} strokeWidth={2} aria-hidden />
            بازگشت به صفحهٔ اصلی
          </Link>
          <Link href="/contact" className={s.btnGhost}>
            <Mail size={16} strokeWidth={2} aria-hidden />
            تماس با پشتیبانی
            <ArrowLeft size={14} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
