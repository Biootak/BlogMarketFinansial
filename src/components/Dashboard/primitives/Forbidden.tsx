'use client';

/**
 * Forbidden — canonical 403 page with VaultLock SVG illustration.
 *
 * Design intent (million-dollar premium):
 *   - Linear × Stripe — bespoke illustrated vault lock
 *   - Ambient gradient orbs (no AI-slop particles)
 *   - Display-grade Persian numerals "۴۰۳" with optical-kerning
 *   - Inline SVG with CSS animations (no external assets, no layout shift)
 *   - Type hierarchy: massive display → headline → caption → actions
 *   - Mobile-first: collapses to single column at <640px
 *   - Full a11y: prefers-reduced-motion, focus rings, role="alert"
 *   - RTL-safe: arrows point correct direction, logical properties throughout
 */

import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Home,
  LayoutDashboard,
  Search,
  ShieldX,
  Sparkles,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useRef } from 'react';

import { Spotlight } from './Spotlight';
import { useStaggerEntrance } from '@/hooks/useStaggerEntrance';
import s from './Forbidden.module.css';

/* ─── Icon Registry (string → LucideIcon, serializable) ──────────────── */

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  layoutdashboard: LayoutDashboard,
  search: Search,
  sparkles: Sparkles,
  userround: UserRound,
};

function resolveIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  return ICON_MAP[name.toLowerCase()] ?? undefined;
}

/* ─── Types ──────────────────────────────────────────────────────────── */

export type ForbiddenTone =
  | 'accent'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'indigo';

export interface ForbiddenLink {
  href: string;
  label: string;
  sub?: string;
  /** Icon name key (e.g. "home", "search", "dashboard") — serializable string */
  icon?: string;
}

export interface ForbiddenProps {
  title?: string;
  description?: string;
  primaryLink?: ForbiddenLink;
  secondaryLinks?: ForbiddenLink[];
  suggestedLinks?: ForbiddenLink[];
  tone?: ForbiddenTone;
  spotlight?: boolean;
  showPath?: boolean;
  variant?: 'page' | 'inline';
  eyebrow?: string;
  className?: string;
}

/* ─── Illustration ───────────────────────────────────────────────────── */

function VaultLockIllustration({ tone }: { tone: ForbiddenTone }) {
  return (
    <svg
      className={s.illustration}
      viewBox="0 0 400 400"
      role="img"
      aria-label="نماد دسترسی غیرمجاز"
      fill="none"
      data-tone={tone}
    >
      <defs>
        <radialGradient id="fl-glass" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="var(--ds-bg, white)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--ds-bg-subtle, var(--ds-bg))" stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id="fl-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--ds-fg)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--ds-fg)" stopOpacity="0.2" />
        </linearGradient>
        <filter id="fl-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="20"
            floodColor="var(--ds-fg)"
            floodOpacity="0.18"
          />
        </filter>
        <radialGradient id="fl-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-primary)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--ds-primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fl-shield" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="var(--ds-primary)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--ds-primary)" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* outer ring — soft, slow rotate */}
      <g className={s.outerRing}>
        <circle
          cx="200"
          cy="200"
          r="170"
          stroke="url(#fl-stroke)"
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

      {/* tick marks — 12 around the circle (clock-like) */}
      <g className={s.ticks} stroke="var(--ds-fg-muted)" strokeWidth="1.5" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          const isMajor = i % 3 === 0;
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

      {/* Shield body — behind lock */}
      <g className={s.shieldGroup}>
        <path
          d="M200 70 L280 110 L280 200 C280 260 240 310 200 340 C160 310 120 260 120 200 L120 110 Z"
          fill="url(#fl-shield)"
          stroke="var(--ds-line, var(--ds-border))"
          strokeWidth="1"
          opacity="0.5"
        />
      </g>

      {/* Inner lock body */}
      <g className={s.lockBody}>
        <rect
          x="140"
          y="180"
          width="120"
          height="90"
          rx="16"
          fill="url(#fl-glass)"
          stroke="var(--ds-line, var(--ds-border))"
          strokeWidth="1"
          filter="url(#fl-shadow)"
        />
        <rect
          x="140"
          y="180"
          width="120"
          height="90"
          rx="16"
          fill="url(#fl-glow)"
          className={s.innerGlow}
        />
        <rect
          x="140"
          y="180"
          width="120"
          height="90"
          rx="16"
          stroke="var(--ds-fg-muted)"
          strokeOpacity="0.15"
          strokeWidth="1"
        />
      </g>

      {/* Lock shackle (arc) */}
      <g className={s.shackle}>
        <path
          d="M160 180 L160 145 C160 120 175 105 200 105 C225 105 240 120 240 145 L240 180"
          stroke="var(--ds-primary)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity="0.15"
          transform="translate(2, 2)"
        />
        <path
          d="M160 180 L160 145 C160 120 175 105 200 105 C225 105 240 120 240 145 L240 180"
          stroke="var(--ds-primary)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M160 180 L160 145 C160 120 175 105 200 105"
          stroke="var(--ds-fg)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
      </g>

      {/* Keyhole */}
      <g className={s.keyhole}>
        <circle cx="200" cy="215" r="14" fill="var(--ds-primary)" opacity="0.12" />
        <circle cx="200" cy="210" r="8" fill="var(--ds-primary)" opacity="0.6" />
        <path
          d="M195 214 L193 232 L207 232 L205 214 Z"
          fill="var(--ds-primary)"
          opacity="0.6"
        />
        <circle cx="200" cy="208" r="3" fill="var(--ds-bg, white)" opacity="0.8" />
      </g>

      {/* X mark — access denied indicator */}
      <g className={s.xMark} opacity="0.6">
        <line
          x1="260" y1="155" x2="275" y2="170"
          stroke="var(--ds-primary)" strokeWidth="2.5" strokeLinecap="round"
        />
        <line
          x1="275" y1="155" x2="260" y2="170"
          stroke="var(--ds-primary)" strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx="267.5" cy="162.5" r="12" stroke="var(--ds-primary)" strokeWidth="1.5" fill="none" opacity="0.4" />
      </g>

      {/* 403 numeral — display-grade */}
      <text
        className={s.numeral}
        x="200"
        y="310"
        textAnchor="middle"
        fontSize="36"
        fontWeight="800"
        fill="var(--ds-fg)"
        fontFamily="var(--ds-font-mono, ui-monospace)"
        style={{ letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
      >
        ۴۰۳
      </text>

      {/* Small star markers */}
      <g className={s.stars} fill="var(--ds-primary)" opacity="0.5">
        <circle cx="110" cy="130" r="2" />
        <circle cx="310" cy="110" r="1.5" />
        <circle cx="330" cy="230" r="2.5" />
        <circle cx="90" cy="270" r="1.5" />
        <circle cx="270" cy="90" r="1" />
        <circle cx="130" cy="290" r="1.2" />
      </g>
    </svg>
  );
}

/* ─── Defaults ───────────────────────────────────────────────────────── */

const DEFAULT_TITLE = 'دسترسی شما به این بخش مجاز نیست';
const DEFAULT_DESC =
  'شما اجازهٔ دسترسی به این صفحه را ندارید. ممکن است نقش حساب شما برای این بخش کافی نباشد.';
const DEFAULT_EYEBROW = 'خطای دسترسی';
const DEFAULT_PRIMARY: ForbiddenLink = { href: '/dashboard', label: 'بازگشت به داشبورد', icon: 'layoutdashboard' };
const DEFAULT_SECONDARY: ForbiddenLink[] = [
  { href: '/', label: 'صفحهٔ اصلی', icon: 'home' },
  { href: '/contact', label: 'تماس با پشتیبانی', icon: 'sparkles' },
];

const DEFAULT_SUGGESTED: ForbiddenLink[] = [
  { href: '/dashboard', label: 'داشبورد', sub: 'پیشخوان حساب شما' },
  { href: '/dashboard/wallet', label: 'کیف پول', sub: 'موجودی و تراکنش‌ها' },
  { href: '/', label: 'صفحهٔ اصلی', sub: 'خانهٔ سایت' },
  { href: '/contact', label: 'پشتیبانی', sub: 'تماس با تیم ما' },
];

/* ─── Component ──────────────────────────────────────────────────────── */

export function Forbidden({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  primaryLink = DEFAULT_PRIMARY,
  secondaryLinks = DEFAULT_SECONDARY,
  suggestedLinks = DEFAULT_SUGGESTED,
  tone = 'rose',
  spotlight = true,
  showPath = true,
  variant = 'page',
  eyebrow = DEFAULT_EYEBROW,
  className,
}: ForbiddenProps) {
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
        <VaultLockIllustration tone={tone} />
      </div>

      {/* ── Headline ──────────────────────────────────────────────── */}
      <div data-stagger className={s.headBlock}>
        <span className={s.eyebrow}>
          <ShieldX size={13} aria-hidden />
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
              <ArrowLeft className={s.suggestArrow} size={16} aria-hidden strokeWidth={1.5} />
            </Link>
          ))}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div data-stagger className={s.actions}>
        {(() => {
          const PrimaryIcon = resolveIcon(primaryLink.icon) ?? LayoutDashboard;
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

export default Forbidden;