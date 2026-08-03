'use client';

/**
 * HeroIdentity — signature moment of the exchange profile.
 *
 *   Layout (P2026 / asymmetric 12-col):
 *     ┌─────────────────────────────────────┐
 *     │ LEFT (7col)         │ RIGHT (5col)  │
 *     │ ─ identity         │ ─ live rate   │
 *     │ ─ name + verified  │ ─ USD/IRR big │
 *     │ ─ meta            │ ─ sparkline   │
 *     │ ─ stats strip      │ ─ buy/sell    │
 *     └─────────────────────────────────────┘
 *
 *   Signature: ambient SVG with system-breath (0.5Hz) — keeps the surface
 *   "alive but quiet". A second kinetic stroke is drawn on mount.
 */

import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Globe,
  MapPin,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import s from './HeroIdentity.module.css';
import Sparkline from './Sparkline';

type Props = {
  exchange: {
    name: string;
    displayName: string | null;
    logoUrl: string | null;
    city: string | null;
    licenseNo: string | null;
    website: string | null;
    createdAt: Date;
    _count: { Customer: number; Transaction: number };
  };
  primaryRate: {
    currencyCode: string;
    currencyPair: string;
    buyRate: string;
    sellRate: string;
    spread: number;
    spreadPct: number;
    spark: number[];
    unit: string;
    createdAt: Date;
  } | null;
  activeCurrencies: number;
};

export default function HeroIdentity({ exchange, primaryRate, activeCurrencies }: Props) {
  const displayName = exchange.displayName ?? exchange.name;
  const initial = displayName.charAt(0);
  const fa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' });
  const [ageSec, setAgeSec] = useState(0);

  // simulate "live" by recomputing age
  useEffect(() => {
    if (!primaryRate) return;
    const t = () => {
      const sec = Math.floor((Date.now() - new Date(primaryRate.createdAt).getTime()) / 1000);
      setAgeSec(Math.max(0, sec));
    };
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, [primaryRate]);

  const ageLabel = useAgeLabel(ageSec);

  return (
    <section className={s.hero} id="hero" aria-label={`صرافی ${displayName}`} dir="rtl">
      {/* ── Ambient layered background ─────────────────────────────── */}
      <div className={s.ambient} aria-hidden>
        {/* Grid pattern */}
        <svg className={s.grid} viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="heroGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="heroGlowA" cx="0%" cy="0%" r="50%">
              <stop offset="0%" stopColor="oklch(58% 0.14 162 / 0.32)" />
              <stop offset="100%" stopColor="oklch(58% 0.14 162 / 0)" />
            </radialGradient>
            <radialGradient id="heroGlowB" cx="100%" cy="100%" r="55%">
              <stop offset="0%" stopColor="oklch(55% 0.14 265 / 0.28)" />
              <stop offset="100%" stopColor="oklch(55% 0.14 265 / 0)" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroGrid)" />
          <ellipse cx="0" cy="0" rx="380" ry="320" fill="url(#heroGlowA)" />
          <ellipse cx="800" cy="480" rx="420" ry="320" fill="url(#heroGlowB)" />
        </svg>

        {/* Signature kinetic stroke — system-breath */}
        <svg
          className={s.kinetic}
          viewBox="0 0 1200 400"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
          focusable="false"
        >
          <path
            d="M -20 240 Q 240 80 520 220 T 1080 180 T 1220 260"
            fill="none"
            stroke="url(#kineticGrad)"
            strokeWidth="1.4"
            strokeLinecap="round"
            className={s.kineticPathA}
          />
          <path
            d="M -20 320 Q 320 200 600 290 T 1180 240"
            fill="none"
            stroke="url(#kineticGrad2)"
            strokeWidth="0.9"
            strokeLinecap="round"
            className={s.kineticPathB}
            opacity="0.55"
          />
          <defs>
            <linearGradient id="kineticGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(58% 0.14 162)" stopOpacity="0" />
              <stop offset="20%" stopColor="oklch(58% 0.14 162)" stopOpacity="0.7" />
              <stop offset="55%" stopColor="oklch(65% 0.14 220)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="oklch(55% 0.14 265)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="kineticGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(72% 0.13 70)" stopOpacity="0" />
              <stop offset="50%" stopColor="oklch(72% 0.13 70)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="oklch(72% 0.13 70)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Top hairline ─────────────────────────────────────────── */}
      <div className={s.hairline} aria-hidden />

      <div className={s.inner}>
        {/* ── LEFT: identity (7col) ──────────────────────────────── */}
        <div className={s.left}>
          {/* Status row */}
          <div className={s.statusRow}>
            <div className={s.livePill} role="status" aria-live="polite">
              <span className={s.liveDot} aria-hidden />
              <span>پروفایل فعال</span>
            </div>
            <div className={s.verifiedPill} title="صرافی توسط پلتفرم تأیید شده">
              <BadgeCheck size={11} strokeWidth={2.4} aria-hidden />
              تأییدشده
            </div>
          </div>

          {/* Logo + Name */}
          <div className={s.identityRow}>
            <div className={s.logo} aria-hidden>
              {exchange.logoUrl ? (
                // Dynamic user URL
                <img src={exchange.logoUrl} alt="" className={s.logoImg} />
              ) : (
                <div className={s.logoFallback}>
                  <span>{initial}</span>
                </div>
              )}
            </div>
            <div className={s.nameBlock}>
              <h1 className={s.name}>{displayName}</h1>
              {exchange.displayName && exchange.displayName !== exchange.name && (
                <p className={s.legalName}>نام ثبتی: {exchange.name}</p>
              )}
              <div className={s.metaRow}>
                {exchange.city && (
                  <span className={s.metaItem}>
                    <MapPin size={12} strokeWidth={1.9} aria-hidden />
                    {exchange.city}
                  </span>
                )}
                {exchange.licenseNo && (
                  <span className={s.metaItem}>
                    <Shield size={12} strokeWidth={1.9} aria-hidden />
                    مجوز {exchange.licenseNo}
                  </span>
                )}
                <span className={s.metaItem}>
                  <CalendarDays size={12} strokeWidth={1.9} aria-hidden />
                  عضو از {fa.format(exchange.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Stats strip — 3 KPIs */}
          <dl className={s.stats} aria-label="آمار صرافی">
            <div className={s.statCell}>
              <dt className={s.statLabel}>
                <Users size={11} strokeWidth={1.9} aria-hidden />
                مشتری
              </dt>
              <dd className={s.statValue}>
                {new Intl.NumberFormat('fa-IR').format(exchange._count.Customer)}
              </dd>
            </div>
            <span className={s.statDiv} aria-hidden />
            <div className={s.statCell}>
              <dt className={s.statLabel}>
                <Wallet size={11} strokeWidth={1.9} aria-hidden />
                تراکنش
              </dt>
              <dd className={s.statValue}>
                {new Intl.NumberFormat('fa-IR').format(exchange._count.Transaction)}
              </dd>
            </div>
            <span className={s.statDiv} aria-hidden />
            <div className={s.statCell}>
              <dt className={s.statLabel}>
                <Globe size={11} strokeWidth={1.9} aria-hidden />
                ارز فعال
              </dt>
              <dd className={s.statValue}>
                {new Intl.NumberFormat('fa-IR').format(activeCurrencies)}
              </dd>
            </div>
          </dl>

          {/* CTA row */}
          <div className={s.ctaRow}>
            {exchange.website && (
              <a
                href={exchange.website}
                target="_blank"
                rel="noopener noreferrer"
                className={s.ctaPrimary}
              >
                <Building2 size={14} strokeWidth={1.9} aria-hidden />
                <span>وبسایت رسمی</span>
                <ArrowUpRight size={13} strokeWidth={1.9} className={s.ctaIcon} aria-hidden />
              </a>
            )}
            <Link href="/exchanges" className={s.ctaGhost}>
              <span>مقایسه با سایر صرافی‌ها</span>
              <ArrowUpRight size={13} strokeWidth={1.9} className={s.ctaIcon} aria-hidden />
            </Link>
          </div>
        </div>

        {/* ── RIGHT: live rate spotlight (5col) ──────────────────── */}
        {primaryRate ? (
          <aside className={s.right} aria-label="نرخ لحظه‌ای">
            <div className={s.rateCard}>
              <div className={s.rateTop}>
                <div className={s.rateLabel}>
                  <span className={s.rateCode}>{primaryRate.currencyCode}</span>
                  <span className={s.rateSep} aria-hidden>
                    /
                  </span>
                  <span className={s.rateTarget}>{primaryRate.unit.toUpperCase()}</span>
                </div>
                <div className={s.rateLiveTag} role="status">
                  <span className={s.rateLiveDot} aria-hidden />
                  زنده
                </div>
              </div>

              <div className={s.rateHero}>
                <span className={s.rateHeroNum} dir="ltr">
                  {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
                    Math.round(Number(primaryRate.sellRate)),
                  )}
                </span>
                <span className={s.rateHeroUnit}>{primaryRate.unit}</span>
              </div>

              {primaryRate.spark.length > 1 && (
                <div className={s.rateSpark}>
                  <Sparkline
                    values={primaryRate.spark}
                    width={340}
                    height={56}
                    strokeWidth={1.8}
                    area
                    showEndPoint
                    label={`نمودار ${primaryRate.currencyCode}`}
                  />
                </div>
              )}

              <div className={s.rateBottom}>
                <div className={s.rateRow}>
                  <span className={s.rateKey}>خرید</span>
                  <span className={s.rateVal} dir="ltr">
                    {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
                      Math.round(Number(primaryRate.buyRate)),
                    )}
                    <span className={s.rateUnit}>{primaryRate.unit}</span>
                  </span>
                </div>
                <span className={s.rateSep2} aria-hidden />
                <div className={s.rateRow}>
                  <span className={s.rateKey}>فروش</span>
                  <span className={s.rateVal} dir="ltr">
                    {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
                      Math.round(Number(primaryRate.sellRate)),
                    )}
                    <span className={s.rateUnit}>{primaryRate.unit}</span>
                  </span>
                </div>
                <span className={s.rateSep2} aria-hidden />
                <div className={s.rateRow}>
                  <span className={s.rateKey}>اسپرد</span>
                  <span className={s.rateValSm}>
                    {new Intl.NumberFormat('fa-IR', {
                      maximumFractionDigits: 2,
                    }).format(primaryRate.spreadPct)}
                    <span className={s.rateUnit}>٪</span>
                  </span>
                </div>
              </div>

              <div className={s.rateFoot}>
                <span className={s.rateFootText}>به‌روزشده {ageLabel}</span>
                <span className={s.rateFootDot} aria-hidden />
                <span className={s.rateFootText}>هر ۶۰ ثانیه</span>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function useAgeLabel(ageSec: number): string {
  if (ageSec < 5) return 'همین الان';
  if (ageSec < 60) return `${new Intl.NumberFormat('fa-IR').format(ageSec)} ثانیه پیش`;
  const min = Math.floor(ageSec / 60);
  if (min < 60) return `${new Intl.NumberFormat('fa-IR').format(min)} دقیقه پیش`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${new Intl.NumberFormat('fa-IR').format(h)} ساعت پیش`;
  const d = Math.floor(h / 24);
  return `${new Intl.NumberFormat('fa-IR').format(d)} روز پیش`;
}
