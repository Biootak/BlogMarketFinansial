/**
 * /exchange-suspended — Million-dollar suspended-exchange state (2026)
 *
 * Asymmetric editorial composition: 12-col grid with a status rail
 * (eyebrow + title + meta) on the left, and a focal glass card with
 * the help-list, CTA pair, and support contact on the right.
 *
 * Server Component — no client JS. Tokens only, RTL logical props,
 * mobile-first single-column stack, full-screen center on mobile.
 *
 * جایگزین نسخه قبلی که inline style داشت (نقض AGENTS.md) و
 * کلیشه‌ای بود.
 */

import { getSystemSettingsData } from '@/data/getSystemSettings';
import {
  AlertOctagon,
  ArrowRight,
  LifeBuoy,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import s from './exchange-suspended.module.css';

export const metadata: Metadata = {
  title: 'دسترسی معلق | صرافی',
  robots: { index: false },
};

const HELP_STEPS = [
  'تأییدیه‌های هویتی و اسناد رسمی صرافی را مرور کنید.',
  'هرگونه مغایرت گزارش‌شده از طرف تیم رعایت را برطرف کنید.',
  'پس از تأیید، دسترسی پنل به‌طور خودکار فعال خواهد شد.',
] as const;

function formatJalali(d: Date) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function formatTime(d: Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default async function ExchangeSuspendedPage() {
  const settings = await getSystemSettingsData();
  const supportPhone = settings.contactPhone ?? '+93 700 000 000';
  const supportEmail = settings.contactEmail ?? 'support@financialmarket.page';
  const now = new Date();

  return (
    <div className={s.root} dir="rtl">
      <div className={s.field} aria-hidden />
      <div className={s.geo} aria-hidden />

      <div className={s.shell}>
        {/* ── Left rail: status summary ───────────────────────── */}
        <aside className={s.rail} aria-label="خلاصه وضعیت">
          <span className={s.eyebrow}>
            <ShieldAlert aria-hidden size={14} strokeWidth={1.8} />
            صرافی تعلیق‌شده
          </span>

          <h1 className={s.railTitle}>
            دسترسی پنل صرافی
            <br />
            شما موقتاً مسدود است
          </h1>

          <p className={s.railLead}>
            به‌منظور رعایت مقررات و حفاظت از کاربران، فعالیت صرافی شما روی پلتفرم به حالت تعلیق درآمده است.
            برای رفع انسداد، مراحل زیر را دنبال کنید.
          </p>

          <div className={s.railMeta}>
            <div className={s.metaItem}>
              <span className={s.metaLabel}>تاریخ تعلیق</span>
              <span className={s.metaValue}>{formatJalali(now)}</span>
            </div>
            <div className={s.metaItem}>
              <span className={s.metaLabel}>ساعت</span>
              <span className={s.metaValue}>{formatTime(now)}</span>
            </div>
            <div className={s.metaItem}>
              <span className={s.metaLabel}>شناسه پیگیری</span>
              <span className={s.metaValue}>SUS-{now.getTime().toString(36).toUpperCase().slice(-8)}</span>
            </div>
            <div className={s.metaItem}>
              <span className={s.metaLabel}>اولویت بررسی</span>
              <span className={s.metaValue}>بالا</span>
            </div>
          </div>
        </aside>

        {/* ── Right card: focal action surface ──────────────────── */}
        <section className={s.card} aria-labelledby="suspended-card-title">
          <div className={s.mark} aria-hidden>
            <span className={s.markRing} />
            <span className={s.markRing} />
            <span className={s.markRing} />
            <span className={s.markCore}>
              <AlertOctagon size={28} strokeWidth={1.75} />
            </span>
          </div>

          <h2 id="suspended-card-title" className={s.cardTitle}>
            چرا دسترسی من مسدود شد؟
          </h2>
          <p className={s.cardBody}>
            تیم رعایت پلتفرم، فعالیت صرافی شما را برای بررسی بیشتر در حالت تعلیق قرار داده است. معمولاً این
            اقدام به دلایل زیر انجام می‌شود:
          </p>

          <ul className={s.helpList}>
            {HELP_STEPS.map((step) => (
              <li key={step} className={s.helpItem}>
                {step}
              </li>
            ))}
          </ul>

          <div className={s.actions}>
            <Link href="/dashboard" className={s.btnPrimary} aria-label="بازگشت به داشبورد">
              بازگشت به داشبورد
              <ArrowRight size={16} strokeWidth={2} aria-hidden className={s.btnIconFlip} />
            </Link>
            <a href={`tel:${supportPhone}`} className={s.btnGhost}>
              <Phone size={16} strokeWidth={2} aria-hidden />
              تماس با پشتیبانی
            </a>
          </div>

          <div className={s.foot}>
            <LifeBuoy className={s.footIcon} aria-hidden size={14} strokeWidth={1.8} />
            <span>نیاز به کمک بیشتر؟</span>
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            <span aria-hidden>·</span>
            <a href={`tel:${supportPhone}`}>{supportPhone}</a>
          </div>
        </section>
      </div>
    </div>
  );
}
