'use client';

/**
 * MillionDollarEmpty — 2026 bespoke illustrated empty state
 *
 * هدف: جایگزینی EmptyState ساده با یک طراحی میلیون‌دلاری که:
 *  - ۸ variant مختلف دارد (هرکدام illustration انیمیشنی اختصاصی)
 *  - ambient gradient orbs، staggered fade-in
 *  - ambient field با 3D-feel
 *  - CTA primary + secondary
 *  - رنگ‌بندی از tokens (--ds-*)
 *  - mobile-first، prefers-reduced-motion کامل
 *  - a11y: role="status" + aria-labelledby
 *
 * Variants:
 *  - inbox:        جعبه خالی (no requests)
 *  - search:       جستجوی بدون نتیجه
 *  - locked:       دسترسی محدود
 *  - sparkles:     برای features جدید
 *  - chart:        داده کم
 *  - bell:         notif خالی
 *  - card:         کارت/credit card خالی
 *  - network:      connection/API خالی
 *  - shield:       security/permissions خالی
 *  - default:      generic
 *
 *  استفاده در صفحات ضعیف:
 *    <MillionDollarEmpty
 *      variant="inbox"
 *      eyebrow="مرکز درخواست‌ها"
 *      title="هنوز درخواستی ندارید"
 *      description="وقتی اولین درخواست را ثبت کنید، اینجا نمایش داده می‌شود"
 *      primaryAction={<Button>...</Button>}
 *    />
 */

import { cn } from '@/lib/utils';
import { useId, useRef } from 'react';
import s from './MillionDollarEmpty.module.css';

export type MillionDollarEmptyVariant =
  | 'inbox'
  | 'search'
  | 'locked'
  | 'sparkles'
  | 'chart'
  | 'bell'
  | 'card'
  | 'network'
  | 'shield'
  | 'default';

export interface MillionDollarEmptyProps {
  variant?: MillionDollarEmptyVariant;
  /** یک کلمه یا عبارت کوچک در بالا — مثل "مرکز درخواست‌ها" */
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  /** tone تغییر رنگ ambient — neutral | primary | amber | rose | emerald */
  tone?: 'neutral' | 'primary' | 'amber' | 'rose' | 'emerald';
}

export function MillionDollarEmpty({
  variant = 'default',
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  tone = 'primary',
}: MillionDollarEmptyProps) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={rootRef}
      role="status"
      aria-labelledby={titleId}
      className={cn(s.root, s[`tone_${tone}`], className)}
    >
      {/* Ambient background orbs (no AI-slop particles) */}
      <div className={s.ambients} aria-hidden>
        <span className={cn(s.orb, s.orbA)} />
        <span className={cn(s.orb, s.orbB)} />
      </div>

      {/* Bespoke illustration */}
      <div className={s.stage}>
        <BespokeIllustration variant={variant} />
      </div>

      {/* Copy */}
      <div className={s.copy}>
        {eyebrow && (
          <span className={s.eyebrow}>
            <span className={s.eyebrowDot} aria-hidden />
            {eyebrow}
          </span>
        )}
        <h3 id={titleId} className={s.title}>
          {title}
        </h3>
        {description && <p className={s.description}>{description}</p>}
      </div>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className={s.actions}>
          {primaryAction}
          {secondaryAction && <div className={s.secondary}>{secondaryAction}</div>}
        </div>
      )}
    </div>
  );
}

export default MillionDollarEmpty;

/* ──────────────────────────────────────────────────────────────────────────
   BespokeIllustrations — هر variant یک inline SVG با انیمیشن CSS
   فقط از tokens — هیچ hex/rgb
   ────────────────────────────────────────────────────────────────────────── */

function BespokeIllustration({ variant }: { variant: MillionDollarEmptyVariant }) {
  switch (variant) {
    case 'inbox':
      return <InboxIllustration />;
    case 'search':
      return <SearchIllustration />;
    case 'locked':
      return <LockedIllustration />;
    case 'sparkles':
      return <SparklesIllustration />;
    case 'chart':
      return <ChartIllustration />;
    case 'bell':
      return <BellIllustration />;
    case 'card':
      return <CardIllustration />;
    case 'network':
      return <NetworkIllustration />;
    case 'shield':
      return <ShieldIllustration />;
    default:
      return <DefaultIllustration />;
  }
}

function InboxIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      <defs>
        <linearGradient id="ink-glass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--ds-bg, white)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--ds-bg-subtle, var(--ds-bg))" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* tray back */}
      <rect
        x="24"
        y="48"
        width="152"
        height="86"
        rx="10"
        fill="url(#ink-glass)"
        stroke="var(--ds-line, var(--ds-border))"
        strokeWidth="1"
      />
      {/* letter sliding in */}
      <g className={s.letter}>
        <rect
          x="60"
          y="22"
          width="80"
          height="56"
          rx="6"
          fill="var(--ds-bg, white)"
          stroke="var(--ds-line, var(--ds-border))"
          strokeWidth="1"
        />
        <line x1="68" y1="36" x2="120" y2="36" stroke="var(--ds-fg-muted)" strokeWidth="2" strokeLinecap="round" />
        <line x1="68" y1="46" x2="132" y2="46" stroke="var(--ds-fg-muted)" strokeWidth="2" strokeLinecap="round" />
        <line x1="68" y1="56" x2="100" y2="56" stroke="var(--ds-fg-muted)" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* front lip */}
      <path
        d="M24 110 L100 110 L92 134 L108 134 L100 110 L176 110 L176 120 L24 120 Z"
        fill="var(--ds-fg)"
        opacity="0.85"
      />
      {/* sparkles around */}
      <g className={s.sparkles}>
        <circle cx="40" cy="40" r="2" fill="var(--ds-primary)" />
        <circle cx="170" cy="34" r="1.5" fill="var(--ds-primary)" />
        <circle cx="180" cy="80" r="1.2" fill="var(--ds-primary)" />
      </g>
    </svg>
  );
}

function SearchIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      <defs>
        <linearGradient id="ink-lens" cx="50%" cy="50%">
          <stop offset="0%" stopColor="var(--ds-bg, white)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--ds-bg-subtle, var(--ds-bg))" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {/* rotating question mark */}
      <g className={s.spinSlow} style={{ transformOrigin: '100px 80px' }}>
        <text
          x="100"
          y="98"
          textAnchor="middle"
          fontSize="64"
          fontWeight="800"
          fill="var(--ds-fg-muted)"
          opacity="0.18"
          fontFamily="ui-monospace, monospace"
        >
          ?
        </text>
      </g>
      {/* magnifier ring */}
      <circle
        cx="100"
        cy="80"
        r="40"
        stroke="var(--ds-primary)"
        strokeWidth="2.5"
        fill="url(#ink-lens)"
      />
      <circle
        cx="100"
        cy="80"
        r="40"
        stroke="var(--ds-fg)"
        strokeOpacity="0.15"
        strokeWidth="1"
      />
      {/* handle */}
      <line
        x1="130"
        y1="110"
        x2="158"
        y2="138"
        stroke="var(--ds-primary)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="130"
        y1="110"
        x2="158"
        y2="138"
        stroke="var(--ds-fg)"
        strokeOpacity="0.18"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* tiny dots around */}
      <g className={s.twinkle}>
        <circle cx="36" cy="36" r="2" fill="var(--ds-primary)" opacity="0.6" />
        <circle cx="172" cy="44" r="1.5" fill="var(--ds-primary)" opacity="0.5" />
        <circle cx="44" cy="124" r="1.8" fill="var(--ds-primary)" opacity="0.4" />
        <circle cx="168" cy="120" r="1.2" fill="var(--ds-primary)" opacity="0.6" />
      </g>
    </svg>
  );
}

function LockedIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      {/* lock body */}
      <rect
        x="64"
        y="68"
        width="72"
        height="58"
        rx="10"
        fill="var(--ds-bg, white)"
        stroke="var(--ds-fg)"
        strokeWidth="1.5"
      />
      {/* shackle */}
      <path
        d="M76 68 V52 a24 24 0 0 1 48 0 V68"
        stroke="var(--ds-fg)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* keyhole */}
      <circle cx="100" cy="92" r="5" fill="var(--ds-fg)" />
      <rect x="98" y="96" width="4" height="12" rx="1" fill="var(--ds-fg)" />
      {/* ambient ring */}
      <circle
        cx="100"
        cy="92"
        r="56"
        stroke="var(--ds-primary)"
        strokeOpacity="0.18"
        strokeWidth="1"
        strokeDasharray="2 4"
        className={s.rotateSlow}
        style={{ transformOrigin: '100px 92px' }}
      />
    </svg>
  );
}

function SparklesIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      <g className={s.sparklesLarge}>
        {/* central star */}
        <path
          d="M100 24 L108 60 L144 68 L108 76 L100 112 L92 76 L56 68 L92 60 Z"
          fill="var(--ds-primary)"
          opacity="0.85"
        />
        {/* small stars */}
        <path
          d="M40 100 L44 110 L54 114 L44 118 L40 128 L36 118 L26 114 L36 110 Z"
          fill="var(--ds-primary)"
          opacity="0.4"
        />
        <path
          d="M164 32 L167 40 L175 43 L167 46 L164 54 L161 46 L153 43 L161 40 Z"
          fill="var(--ds-primary)"
          opacity="0.5"
        />
        <path
          d="M156 110 L159 118 L167 121 L159 124 L156 132 L153 124 L145 121 L153 118 Z"
          fill="var(--ds-primary)"
          opacity="0.4"
        />
        {/* dots */}
        <circle cx="32" cy="32" r="2" fill="var(--ds-primary)" />
        <circle cx="180" cy="80" r="1.5" fill="var(--ds-primary)" />
        <circle cx="100" cy="148" r="1.8" fill="var(--ds-primary)" />
      </g>
    </svg>
  );
}

function ChartIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      {/* axes */}
      <line
        x1="24"
        y1="32"
        x2="24"
        y2="128"
        stroke="var(--ds-fg-muted)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
      <line
        x1="24"
        y1="128"
        x2="176"
        y2="128"
        stroke="var(--ds-fg-muted)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* bars rising */}
      <g className={s.barsRise}>
        <rect x="44" y="108" width="14" height="20" rx="2" fill="var(--ds-primary)" opacity="0.4" />
        <rect x="72" y="92" width="14" height="36" rx="2" fill="var(--ds-primary)" opacity="0.55" />
        <rect x="100" y="76" width="14" height="52" rx="2" fill="var(--ds-primary)" opacity="0.7" />
        <rect x="128" y="58" width="14" height="70" rx="2" fill="var(--ds-primary)" opacity="0.85" />
        <rect x="156" y="40" width="14" height="88" rx="2" fill="var(--ds-primary)" />
      </g>
      {/* trend line */}
      <path
        d="M51 110 L79 96 L107 80 L135 64 L163 44"
        stroke="var(--ds-fg)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 3"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

function BellIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      <g className={s.bellRing} style={{ transformOrigin: '100px 70px' }}>
        {/* bell body */}
        <path
          d="M100 30 a30 30 0 0 1 30 30 v30 l10 14 H60 l10 -14 V60 a30 30 0 0 1 30 -30 Z"
          fill="var(--ds-bg, white)"
          stroke="var(--ds-fg)"
          strokeWidth="1.5"
        />
        {/* clapper */}
        <circle cx="100" cy="116" r="6" fill="var(--ds-fg)" />
        {/* top dot */}
        <circle cx="100" cy="22" r="3" fill="var(--ds-primary)" />
      </g>
      {/* silent waves */}
      <g className={s.wavePulse}>
        <circle cx="40" cy="68" r="3" fill="var(--ds-primary)" opacity="0.5" />
        <circle cx="160" cy="68" r="3" fill="var(--ds-primary)" opacity="0.5" />
      </g>
    </svg>
  );
}

function CardIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      <defs>
        <linearGradient id="ink-card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--ds-fg)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--ds-fg)" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <g className={s.cardFloat} style={{ transformOrigin: '100px 80px' }}>
        {/* back card */}
        <rect
          x="40"
          y="36"
          width="120"
          height="76"
          rx="10"
          transform="rotate(-6 100 74)"
          fill="var(--ds-bg, white)"
          stroke="var(--ds-line, var(--ds-border))"
          strokeWidth="1"
        />
        {/* front card */}
        <rect
          x="40"
          y="48"
          width="120"
          height="76"
          rx="10"
          fill="url(#ink-card)"
          transform="rotate(4 100 86)"
        />
        <rect
          x="40"
          y="48"
          width="120"
          height="76"
          rx="10"
          transform="rotate(4 100 86)"
          fill="none"
          stroke="var(--ds-fg)"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
        {/* chip */}
        <rect
          x="56"
          y="64"
          width="20"
          height="14"
          rx="2"
          transform="rotate(4 100 86)"
          fill="var(--ds-bg, white)"
          opacity="0.7"
        />
        {/* number dots */}
        <g transform="rotate(4 100 86)">
          <circle cx="56" cy="98" r="1.5" fill="var(--ds-bg, white)" />
          <circle cx="62" cy="98" r="1.5" fill="var(--ds-bg, white)" />
          <circle cx="68" cy="98" r="1.5" fill="var(--ds-bg, white)" />
          <circle cx="74" cy="98" r="1.5" fill="var(--ds-bg, white)" />
        </g>
      </g>
    </svg>
  );
}

function NetworkIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      <g className={s.networkPulse}>
        {/* central node */}
        <circle cx="100" cy="80" r="8" fill="var(--ds-primary)" />
        <circle cx="100" cy="80" r="14" fill="none" stroke="var(--ds-primary)" strokeOpacity="0.3" />
        {/* satellites */}
        <circle cx="48" cy="50" r="5" fill="var(--ds-fg-muted)" />
        <circle cx="152" cy="50" r="5" fill="var(--ds-fg-muted)" />
        <circle cx="48" cy="110" r="5" fill="var(--ds-fg-muted)" />
        <circle cx="152" cy="110" r="5" fill="var(--ds-fg-muted)" />
        {/* lines */}
        <line x1="100" y1="80" x2="48" y2="50" stroke="var(--ds-fg-muted)" strokeWidth="1" strokeDasharray="2 3" />
        <line x1="100" y1="80" x2="152" y2="50" stroke="var(--ds-fg-muted)" strokeWidth="1" strokeDasharray="2 3" />
        <line x1="100" y1="80" x2="48" y2="110" stroke="var(--ds-fg-muted)" strokeWidth="1" strokeDasharray="2 3" />
        <line x1="100" y1="80" x2="152" y2="110" stroke="var(--ds-fg-muted)" strokeWidth="1" strokeDasharray="2 3" />
      </g>
    </svg>
  );
}

function ShieldIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      <g className={s.shieldFloat} style={{ transformOrigin: '100px 80px' }}>
        <path
          d="M100 24 L148 44 V82 a48 48 0 0 1 -48 50 a48 48 0 0 1 -48 -50 V44 Z"
          fill="var(--ds-bg, white)"
          stroke="var(--ds-fg)"
          strokeWidth="1.5"
        />
        <path
          d="M100 60 a8 8 0 0 0 -8 8 v6 h-4 v22 a4 4 0 0 0 4 4 h16 a4 4 0 0 0 4 -4 V74 h-4 v-6 a8 8 0 0 0 -8 -8 Z"
          fill="var(--ds-primary)"
        />
      </g>
    </svg>
  );
}

function DefaultIllustration() {
  return (
    <svg viewBox="0 0 200 160" className={s.svg} fill="none" aria-hidden>
      <g className={s.float}>
        <circle cx="100" cy="80" r="36" fill="var(--ds-bg, white)" stroke="var(--ds-line, var(--ds-border))" strokeWidth="1" />
        <path
          d="M100 60 V100 M76 80 H124"
          stroke="var(--ds-fg-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
