'use client';

/**
 * NotFound — canonical 404 page with LostCompass SVG illustration.
 *
 * Design intent (million-dollar premium):
 *   - Linear × Vercel × Stripe — bespoke illustrated compass that lost its way
 *   - Ambient gradient orbs (no AI-slop particles)
 *   - Display-grade Persian numerals "۴۰۴" with optical-kerning
 *   - Inline SVG with CSS animations (no external assets, no layout shift)
 *   - Type hierarchy: massive display → headline → caption → actions
 *   - Mobile-first: collapses to single column at <640px
 *   - Full a11y: prefers-reduced-motion, focus rings, role="alert"
 *   - RTL-safe: arrows point correct direction, logical properties throughout
 */

import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  ClipboardList,
  Compass,
  FileSearch,
  FileX2,
  Home,
  LayoutDashboard,
  ReceiptText,
  Search,
  Sparkles,
  Store,
  UserRound,
  UserSearch,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useRef } from 'react';

import { useStaggerEntrance } from '@/hooks/useStaggerEntrance';
import s from './NotFound.module.css';
import { Spotlight } from './Spotlight';

/* ─── Icon Registry (string → LucideIcon, serializable) ──────────────── */

const ICON_MAP: Record<string, LucideIcon> = {
  arrowleftright: ArrowLeftRight,
  building2: Building2,
  clipboardlist: ClipboardList,
  layoutdashboard: LayoutDashboard,
  filesearch: FileSearch,
  filex2: FileX2,
  home: Home,
  receipttext: ReceiptText,
  search: Search,
  sparkles: Sparkles,
  store: Store,
  userround: UserRound,
  usersearch: UserSearch,
  usersround: UsersRound,
  walletcards: WalletCards,
};

function resolveIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  return ICON_MAP[name.toLowerCase()] ?? undefined;
}

/* ─── Types ──────────────────────────────────────────────────────────── */

export type NotFoundTone = 'accent' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'indigo';

export interface NotFoundLink {
  href: string;
  label: string;
  sub?: string;
  /** Icon name key (e.g. "home", "search", "dashboard") — serializable string, not a component ref */
  icon?: string;
}

export interface NotFoundProps {
  title?: string;
  description?: string;
  primaryLink?: NotFoundLink;
  secondaryLinks?: NotFoundLink[];
  suggestedLinks?: NotFoundLink[];
  tone?: NotFoundTone;
  spotlight?: boolean;
  showPath?: boolean;
  variant?: 'page' | 'inline';
  eyebrow?: string;
  className?: string;
}

/* ─── Illustration ───────────────────────────────────────────────────── */

function LostCompassIllustration({ tone }: { tone: NotFoundTone }) {
  return (
    <svg
      className={s.illustration}
      viewBox="0 0 400 400"
      role="img"
      aria-label="نماد گم‌شدن مسیر"
      fill="none"
      data-tone={tone}
    >
      <defs>
        <radialGradient id="nc-glass" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="var(--ds-bg, white)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--ds-bg-subtle, var(--ds-bg))" stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id="nc-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--ds-fg)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--ds-fg)" stopOpacity="0.2" />
        </linearGradient>
        <filter id="nc-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="20"
            floodColor="var(--ds-fg)"
            floodOpacity="0.18"
          />
        </filter>
        {/* Inner glow for compass body */}
        <radialGradient id="nc-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-primary)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--ds-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* outer ring — soft, slow rotate */}
      <g className={s.outerRing}>
        <circle
          cx="200"
          cy="200"
          r="170"
          stroke="url(#nc-stroke)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
      </g>

      {/* Secondary outer ring — counter-rotating */}
      <g className={s.outerRing2}>
        <circle
          cx="200"
          cy="200"
          r="155"
          stroke="var(--ds-fg-muted)"
          strokeWidth="0.5"
          strokeDasharray="1 8"
          opacity="0.3"
        />
      </g>

      {/* tick marks — 16 around the circle */}
      <g className={s.ticks} stroke="var(--ds-fg-muted)" strokeWidth="1.5" strokeLinecap="round">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 360) / 16;
          const isMajor = i % 4 === 0;
          return (
            <line
              key={i}
              x1="200"
              y1={isMajor ? 36 : 40}
              x2="200"
              y2={isMajor ? 50 : 48}
              transform={`rotate(${angle} 200 200)`}
              opacity={isMajor ? 0.7 : 0.3}
            />
          );
        })}
      </g>

      {/* Compass direction labels */}
      <g
        className={s.compassLabels}
        fill="var(--ds-fg-muted)"
        fontSize="10"
        fontWeight="600"
        textAnchor="middle"
        opacity="0.5"
      >
        <text x="200" y="28">
          ش
        </text>
        <text x="200" y="382">
          ج
        </text>
        <text x="378" y="204">
          ب
        </text>
        <text x="22" y="204">
          خ
        </text>
      </g>

      {/* Inner compass body */}
      <circle
        cx="200"
        cy="200"
        r="120"
        fill="url(#nc-glass)"
        stroke="var(--ds-line, var(--ds-border))"
        strokeWidth="1"
        filter="url(#nc-shadow)"
      />
      {/* Inner glow */}
      <circle cx="200" cy="200" r="120" fill="url(#nc-glow)" className={s.innerGlow} />
      <circle
        cx="200"
        cy="200"
        r="120"
        stroke="var(--ds-fg-muted)"
        strokeOpacity="0.2"
        strokeWidth="1"
      />

      {/* Compass rose — subtle background pattern */}
      <g className={s.compassRose} opacity="0.08">
        <path d="M200 90 L210 190 L200 200 L190 190 Z" fill="var(--ds-fg)" />
        <path d="M200 310 L210 210 L200 200 L190 210 Z" fill="var(--ds-fg)" />
        <path d="M90 200 L190 190 L200 200 L190 210 Z" fill="var(--ds-fg)" />
        <path d="M310 200 L210 190 L200 200 L210 210 Z" fill="var(--ds-fg)" />
      </g>

      {/* Compass needle — drifts */}
      <g className={s.needle}>
        {/* Shadow */}
        <path
          d="M200 112 L208 200 L200 290 L192 200 Z"
          fill="var(--ds-primary)"
          opacity="0.15"
          transform="translate(2, 2)"
        />
        {/* Main needle */}
        <path d="M200 110 L208 200 L200 290 L192 200 Z" fill="var(--ds-primary)" opacity="0.85" />
        {/* Highlight */}
        <path d="M200 110 L208 200 L200 200 L192 200 Z" fill="var(--ds-fg)" opacity="0.4" />
        {/* Center dot */}
        <circle
          cx="200"
          cy="200"
          r="6"
          fill="var(--ds-bg, white)"
          stroke="var(--ds-fg)"
          strokeWidth="1.5"
        />
        <circle cx="200" cy="200" r="2" fill="var(--ds-primary)" />
      </g>

      {/* Dashed escape path */}
      <path
        className={s.escapePath}
        d="M 280 280 Q 340 320 360 360"
        stroke="var(--ds-primary)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* 404 numeral — display-grade */}
      <text
        className={s.numeral}
        x="200"
        y="215"
        textAnchor="middle"
        fontSize="48"
        fontWeight="800"
        fill="var(--ds-fg)"
        fontFamily="var(--ds-font-mono, ui-monospace)"
        style={{ letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
      >
        ۴۰۴
      </text>

      {/* Small star markers */}
      <g className={s.stars} fill="var(--ds-primary)" opacity="0.5">
        <circle cx="120" cy="140" r="2" />
        <circle cx="300" cy="120" r="1.5" />
        <circle cx="320" cy="220" r="2.5" />
        <circle cx="100" cy="280" r="1.5" />
        <circle cx="260" cy="100" r="1" />
        <circle cx="140" cy="300" r="1.2" />
      </g>
    </svg>
  );
}

/* ─── Defaults ───────────────────────────────────────────────────────── */

const DEFAULT_TITLE = 'این مسیر در نقشهٔ ما نیست';
const DEFAULT_DESC =
  'صفحه‌ای که دنبال آن می‌گردید وجود ندارد، منتقل شده یا شاید هرگز ساخته نشده است.';
const DEFAULT_EYEBROW = 'خطای مسیریابی';
const DEFAULT_PRIMARY: NotFoundLink = { href: '/', label: 'بازگشت به خانه', icon: 'home' };
const DEFAULT_SECONDARY: NotFoundLink[] = [
  { href: '/archive', label: 'جستجو در آرشیو', icon: 'search' },
  { href: '/exchanges', label: 'صرافی‌ها' },
  { href: '/contact', label: 'پشتیبانی', icon: 'sparkles' },
];

const DEFAULT_SUGGESTED: NotFoundLink[] = [
  { href: '/', label: 'صفحهٔ اصلی', sub: 'تازه‌ترین گزارش‌ها و تحلیل‌ها' },
  { href: '/exchanges', label: 'صرافی‌ها', sub: 'مقایسه نرخ صرافی‌های معتبر' },
  { href: '/money-transfer', label: 'حوالهٔ ارزی', sub: 'ارسال امن به افغانستان و منطقه' },
  { href: '/archive', label: 'آرشیو مقالات', sub: 'مطالب آموزشی و تحلیلی' },
];

/* ─── Component ──────────────────────────────────────────────────────── */

export function NotFound({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  primaryLink = DEFAULT_PRIMARY,
  secondaryLinks = DEFAULT_SECONDARY,
  suggestedLinks = DEFAULT_SUGGESTED,
  tone = 'violet',
  spotlight = true,
  showPath = true,
  variant = 'page',
  eyebrow = DEFAULT_EYEBROW,
  className,
}: NotFoundProps) {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useStaggerEntrance(root);

  return (
    <div
      ref={root}
      className={`${s.root} ${className ?? ''}`}
      data-variant={variant}
      data-tone={tone}
      dir="rtl"
      role="alert"
      aria-labelledby={titleId}
    >
      {/* ── Ambient orbs ──────────────────────────────────────────── */}
      <div className={s.ambients} aria-hidden>
        <span className={`${s.orb} ${s.orbA}`} />
        <span className={`${s.orb} ${s.orbB}`} />
        <span className={`${s.orb} ${s.orbC}`} />
      </div>

      {spotlight && <Spotlight tone={tone} className={s.spotlight} />}

      {/* ── Hero stage: SVG illustration ──────────────────────────── */}
      <div data-stagger className={s.stage}>
        <LostCompassIllustration tone={tone} />
      </div>

      {/* ── Headline ──────────────────────────────────────────────── */}
      <div data-stagger className={s.headBlock}>
        <span className={s.eyebrow}>
          <Compass size={13} aria-hidden />
          {eyebrow}
        </span>
        <h1 id={titleId} className={s.title}>
          {title}
        </h1>
        <p className={s.lead}>
          {description}
          {showPath && pathname && (
            <>
              <br />
              <code className={s.pathCode} dir="ltr">
                {pathname}
              </code>
            </>
          )}
        </p>
      </div>

      {/* ── Suggested destination cards ───────────────────────────── */}
      {suggestedLinks.length > 0 && (
        <div data-stagger className={s.suggestions} aria-label="پیشنهادهای جایگزین">
          {suggestedLinks.map((link) => (
            <Link key={link.href} href={link.href} className={s.suggestCard}>
              <div className={s.suggestMain}>
                <span className={s.suggestLabel}>{link.label}</span>
                {link.sub && <span className={s.suggestSub}>{link.sub}</span>}
              </div>
              {/* RTL: ArrowLeft points left = toward the destination in RTL reading flow */}
              <ArrowLeft className={s.suggestArrow} size={16} aria-hidden strokeWidth={1.5} />
            </Link>
          ))}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div data-stagger className={s.actions}>
        {(() => {
          const PrimaryIcon = resolveIcon(primaryLink.icon) ?? Home;
          return (
            <Link href={primaryLink.href} className={s.primaryCta}>
              <PrimaryIcon size={15} aria-hidden />
              {primaryLink.label}
            </Link>
          );
        })()}

        {secondaryLinks.map((link) => {
          const LinkIcon = resolveIcon(link.icon) ?? Search;
          return (
            <Link key={link.href} href={link.href} className={s.ghostCta}>
              <LinkIcon size={15} aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default NotFound;
