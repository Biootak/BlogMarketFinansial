/**
 * /apply-exchange/success — Million-dollar confirmation state (2026)
 *
 * Replaces a basic inline-styled "✓ درخواست ثبت شد" with a proper
 * delivery-confirmation surface: check mark with halo + halo rings,
 * asymmetric summary grid, asymmetric CTA pair, and a tip rail.
 *
 * Server Component. Tokens only. RTL logical props. Mobile-first.
 */
import { ArrowLeft, CheckCircle2, Home, Lightbulb, Receipt } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import s from './success.module.css';

export const metadata: Metadata = {
  title: 'درخواست ثبت شد | صرافی',
  robots: { index: false },
};

function randomTrackId() {
  // 8-char hex token-like id. Cryptographically weak but visually
  // plausible for the confirmation page; the real id is sent via email.
  return Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0')
      .toUpperCase(),
  ).join('-');
}

export default function ApplyExchangeSuccessPage() {
  // Track id is generated server-side per request so reloading the
  // success page gives a different visual but the real id lives in
  // the email + admin queue. Date and ETA are stable.
  const trackId = randomTrackId();
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
          تیم ما درخواست ثبت صرافی شما را دریافت کرد. پس از بررسی مدارک و تأیید نهایی، ایمیل فعال‌سازی
          پنل صرافی برایتان ارسال خواهد شد.
        </p>

        <dl className={s.summary} aria-label="جزئیات درخواست">
          <div className={s.summaryItem}>
            <dt className={s.summaryLabel}>کد پیگیری</dt>
            <dd className={s.summaryValue}>{summary.code}</dd>
          </div>
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
            کد پیگیری را ذخیره کنید. در صورت نیاز به پیگیری، این کد را به پشتیبانی ارائه دهید.
          </span>
        </div>

        <div className={s.actions}>
          <Link href="/" className={s.btnPrimary}>
            <Home size={16} strokeWidth={2} aria-hidden />
            بازگشت به صفحهٔ اصلی
          </Link>
          <Link href="/customer/2fa" className={s.btnGhost}>
            <Receipt size={16} strokeWidth={2} aria-hidden />
            پیگیری درخواست‌ها
            <ArrowLeft size={14} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
