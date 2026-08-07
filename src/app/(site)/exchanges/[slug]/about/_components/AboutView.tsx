'use client';

/**
 * AboutView — صفحهٔ کامل دربارهٔ صرافی
 *
 *   • Story / identity
 *   • Trust signals (3 KPI cards)
 *   • License + Founded
 *   • Standards
 */

import {
  Award,
  BadgeCheck,
  Building2,
  CalendarDays,
  Globe,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import s from './AboutView.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

type Props = {
  exchange: {
    name: string;
    displayName: string | null;
    logoUrl: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    licenseNo: string | null;
    createdAt: Date;
    _count: { Customer: number; Transaction: number };
    hasHours: boolean;
  };
};

function gregorianDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

function persianDate(d: Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export default function AboutView({ exchange }: Props) {
  const displayName = exchange.displayName ?? exchange.name;
  const initial = displayName.charAt(0);
  const yearsActive = Math.max(0, new Date().getFullYear() - exchange.createdAt.getFullYear());
  const phoneTel = exchange.phone?.replace(/[^\d+]/g, '') ?? '';

  return (
    <section className={s.section} dir="rtl" aria-label={`دربارهٔ ${displayName}`}>
      <div className={s.inner}>
        {/* ── Hero identity ──────────────────────────────────── */}
        <header className={s.hero}>
          <div className={s.heroBg} aria-hidden>
            <svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="abGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
                <radialGradient id="abGlow" cx="0%" cy="0%" r="50%">
                  <stop offset="0%" stopColor="oklch(58% 0.14 162 / 0.25)" />
                  <stop offset="100%" stopColor="oklch(58% 0.14 162 / 0)" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#abGrid)" />
              <ellipse cx="0" cy="0" rx="380" ry="280" fill="url(#abGlow)" />
            </svg>
          </div>
          <div className={s.heroInner}>
            <div className={s.heroLogo} aria-hidden>
              {exchange.logoUrl ? (
                // Dynamic user URL
                <img src={exchange.logoUrl} alt="" className={s.heroLogoImg} />
              ) : (
                <div className={s.heroLogoFallback}>
                  <span>{initial}</span>
                </div>
              )}
            </div>
            <div className={s.heroText}>
              <div className={s.heroPill}>
                <BadgeCheck size={12} strokeWidth={2.4} aria-hidden />
                صرافی تأییدشده
              </div>
              <h1 className={s.heroTitle}>{displayName}</h1>
              <div className={s.heroMeta}>
                {exchange.city && (
                  <span className={s.heroMetaItem}>
                    <MapPin size={12} strokeWidth={1.9} aria-hidden />
                    {exchange.city}
                  </span>
                )}
                {exchange.licenseNo && (
                  <span className={s.heroMetaItem}>
                    <Shield size={12} strokeWidth={1.9} aria-hidden />
                    مجوز {exchange.licenseNo}
                  </span>
                )}
                <span className={s.heroMetaItem}>
                  <CalendarDays size={12} strokeWidth={1.9} aria-hidden />
                  {yearsActive > 0 ? `${_faNum.format(yearsActive)} سال سابقه` : 'صرافی تازه‌تأسیس'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── KPIs ───────────────────────────────────────────── */}
        <div className={s.kpiGrid}>
          <article className={s.kpiCard}>
            <span className={s.kpiIcon} aria-hidden>
              <Users size={18} strokeWidth={1.6} />
            </span>
            <span className={s.kpiValue}>{_faNum.format(exchange._count.Customer)}</span>
            <span className={s.kpiLabel}>مشتری ثبت‌شده</span>
          </article>
          <article className={s.kpiCard}>
            <span className={s.kpiIcon} aria-hidden>
              <Wallet size={18} strokeWidth={1.6} />
            </span>
            <span className={s.kpiValue}>{_faNum.format(exchange._count.Transaction)}</span>
            <span className={s.kpiLabel}>تراکنش انجام‌شده</span>
          </article>
          <article className={s.kpiCard}>
            <span className={s.kpiIcon} aria-hidden>
              <Award size={18} strokeWidth={1.6} />
            </span>
            <span className={s.kpiValue}>{gregorianDate(exchange.createdAt)}</span>
            <span className={s.kpiLabel}>
              تاریخ عضویت (شمسی: {persianDate(exchange.createdAt)})
            </span>
          </article>
        </div>

        {/* ── Two-column: story / sidebar ──────────────────── */}
        <div className={s.colsGrid}>
          <article className={s.storyCard}>
            <header className={s.cardHead}>
              <h2 className={s.cardTitle}>
                <Building2 size={15} strokeWidth={1.9} aria-hidden />
                دربارهٔ صرافی
              </h2>
            </header>
            <p className={s.storyText}>
              {displayName} یکی از صرافی‌های فعال در شبکهٔ ماست که با مجوز رسمی در شهر{' '}
              {exchange.city ?? '—'} به ارائهٔ خدمات خرید و فروش ارزهای خارجی می‌پردازد. تمامی نرخ‌های
              نمایش‌داده‌شده در صفحهٔ اصلی، مستقیماً توسط صرافی و از طریق پنل کاربری وی ثبت می‌شوند و هر
              ۶۰ ثانیه به‌روزرسانی می‌گردند.
            </p>
            <p className={s.storyText}>
              هدف ما ایجاد یک پلتفرم شفاف برای معرفی صرافی‌های مورد اعتماد و ارائهٔ اطلاعات دقیق نرخ،
              ساعات کاری و راه‌های ارتباطی به کاربران است.
            </p>
            <ul className={s.signalList} aria-label="نشانه‌های اعتماد">
              <li className={s.signalItem}>
                <span className={s.signalIcon} aria-hidden>
                  <ShieldCheck size={14} strokeWidth={2.4} />
                </span>
                <div>
                  <p className={s.signalTitle}>تأیید رسمی پلتفرم</p>
                  <p className={s.signalDesc}>مدارک هویتی و مجوز فعالیت بررسی و تأیید شده است.</p>
                </div>
              </li>
              <li className={s.signalItem}>
                <span className={s.signalIcon} aria-hidden>
                  <BadgeCheck size={14} strokeWidth={2.4} />
                </span>
                <div>
                  <p className={s.signalTitle}>نرخ‌های شفاف</p>
                  <p className={s.signalDesc}>
                    نرخ‌های خرید و فروش به‌صورت زنده و بدون تخفیف پنهان نمایش داده می‌شوند.
                  </p>
                </div>
              </li>
              <li className={s.signalItem}>
                <span className={s.signalIcon} aria-hidden>
                  <Award size={14} strokeWidth={2.4} />
                </span>
                <div>
                  <p className={s.signalTitle}>
                    {yearsActive > 0
                      ? `${_faNum.format(yearsActive)} سال تجربه`
                      : 'صرافی تازه‌تأسیس'}
                  </p>
                  <p className={s.signalDesc}>
                    فعالیت رسمی از سال {exchange.createdAt.getFullYear()} میلادی.
                  </p>
                </div>
              </li>
            </ul>
          </article>

          <aside className={s.sidebar}>
            <article className={s.infoCard}>
              <h2 className={s.cardTitle}>
                <Phone size={15} strokeWidth={1.9} aria-hidden />
                راه‌های ارتباطی
              </h2>
              <ul className={s.contactList}>
                {exchange.phone && (
                  <li className={s.contactItem}>
                    <a href={`tel:${phoneTel}`} className={s.contactLink} dir="ltr">
                      <Phone size={14} strokeWidth={1.9} className={s.contactIcon} aria-hidden />
                      <span className={s.contactValue}>{exchange.phone}</span>
                    </a>
                  </li>
                )}
                {exchange.email && (
                  <li className={s.contactItem}>
                    <a href={`mailto:${exchange.email}`} className={s.contactLink} dir="ltr">
                      <Mail size={14} strokeWidth={1.9} className={s.contactIcon} aria-hidden />
                      <span className={s.contactValue}>{exchange.email}</span>
                    </a>
                  </li>
                )}
                {exchange.website && (
                  <li className={s.contactItem}>
                    <a
                      href={exchange.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.contactLink}
                    >
                      <Globe size={14} strokeWidth={1.9} className={s.contactIcon} aria-hidden />
                      <span className={s.contactValue}>
                        {(() => {
                          try {
                            return new URL(exchange.website).hostname.replace(/^www\./, '');
                          } catch {
                            return exchange.website;
                          }
                        })()}
                      </span>
                    </a>
                  </li>
                )}
                {exchange.address && (
                  <li className={s.contactItem}>
                    <div className={s.contactLink}>
                      <MapPin size={14} strokeWidth={1.9} className={s.contactIcon} aria-hidden />
                      <span className={s.contactValue}>
                        {exchange.city ? `${exchange.city}، ` : ''}
                        {exchange.address}
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            </article>

            {exchange.hasHours && (
              <article className={s.infoCard}>
                <h2 className={s.cardTitle}>
                  <CalendarDays size={15} strokeWidth={1.9} aria-hidden />
                  ساعات کاری
                </h2>
                <p className={s.hoursHint}>
                  برای مشاهدهٔ برنامهٔ کامل هفتگی به صفحهٔ ساعات کاری مراجعه کنید.
                </p>
                <Link href="./hours" className={s.linkBtn}>
                  مشاهدهٔ برنامهٔ هفتگی
                </Link>
              </article>
            )}

            <article className={s.infoCard}>
              <h2 className={s.cardTitle}>
                <Shield size={15} strokeWidth={1.9} aria-hidden />
                استانداردهای ایمنی
              </h2>
              <ul className={s.stdList}>
                <li className={s.stdItem}>
                  <ShieldCheck size={12} strokeWidth={2.4} aria-hidden />
                  نرخ‌های زنده هر ۶۰ ثانیه
                </li>
                <li className={s.stdItem}>
                  <ShieldCheck size={12} strokeWidth={2.4} aria-hidden />
                  تأیید هویت انجام‌شده
                </li>
                <li className={s.stdItem}>
                  <ShieldCheck size={12} strokeWidth={2.4} aria-hidden />
                  دسترسی ۲۴/۷ به صفحه
                </li>
                <li className={s.stdItem}>
                  <ShieldCheck size={12} strokeWidth={2.4} aria-hidden />
                  حریم خصوصی محرمانه
                </li>
              </ul>
            </article>
          </aside>
        </div>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <div className={s.ctaBox}>
          <div className={s.ctaBoxText}>
            <h3 className={s.ctaBoxTitle}>به نرخ‌های لحظه‌ای نیاز دارید؟</h3>
            <p className={s.ctaBoxDesc}>
              برای مشاهدهٔ جدول کامل نرخ خرید و فروش ارزها، به صفحهٔ بازارها مراجعه کنید.
            </p>
          </div>
          <Link href="./markets" className={s.ctaBoxBtn}>
            مشاهدهٔ بازارها
          </Link>
        </div>
      </div>
    </section>
  );
}
