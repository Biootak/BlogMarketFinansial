'use client';

/**
 * RouteError — canonical error boundary UI (million-dollar premium)
 * ============================================================================
 *
 * Design intent:
 *   - Linear × Stripe — bespoke SVG illustrations per error kind
 *   - Ambient gradient orbs (no AI-slop particles)
 *   - Spotlight overlay
 *   - Suggested destination cards (2×2 grid, context-aware)
 *   - Tone-driven accent colors
 *   - Stagger entrance animation
 *   - error type detection (network / auth / not-found / server / unknown)
 *   - Sentry capture در همه محیط‌ها
 *   - فقط design system tokens — هیچ hex/rgb hardcode
 *   - RTL logical props
 *   - dev mode: error.message + digest نمایش داده می‌شود
 *   - variant="page" (center-screen) | variant="inline" (داخل section)
 *
 * استفاده در error.tsx:
 *   export default function MyError({ error, reset }) {
 *     return <RouteError error={error} reset={reset} section="نام بخش" />;
 *   }
 * ============================================================================
 */

import * as Sentry from '@sentry/nextjs';
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  LayoutDashboard,
  LogIn,
  RefreshCw,
  Search,
  ServerCrash,
  ShieldAlert,
  Store,
  type LucideIcon,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';

import { Spotlight, type SpotlightTone } from './Spotlight';
import { useStaggerEntrance } from '@/hooks/useStaggerEntrance';
import s from './RouteError.module.css';

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** نام بخش برای پیام خطا — مثلا‌ً "گزارش‌ها" یا "پنل صرافی" */
  section?: string;
  /** لینک بازگشت. پیش‌فرض: "/" */
  backHref?: string;
  /** متن دکمه بازگشت. پیش‌فرض: "صفحه اصلی" */
  backLabel?: string;
  /** page = center-screen (پیش‌فرض) | inline = داخل section */
  variant?: 'page' | 'inline';
  /** کارت‌های مقصد پیشنهادی (شبکهٔ ۲×۲). پیش‌فرض بر اساس نوع خطا ساخته می‌شود. */
  suggestions?: SuggestItem[];
}

/** یک کارت مقصد پیشنهادی در شبکهٔ ۲×۲. */
export interface SuggestItem {
  href: string;
  label: string;
  sub: string;
  icon?: LucideIcon;
}

type ErrorKind = 'network' | 'auth' | 'notfound' | 'server' | 'unknown';

function detectKind(error: Error): ErrorKind {
  const m = (error.message ?? '').toLowerCase();
  if (
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('timeout') ||
    m.includes('failed to fetch')
  )
    return 'network';
  if (m.includes('unauthorized') || m.includes('403') || m.includes('401')) return 'auth';
  if (m.includes('not found') || m.includes('404')) return 'notfound';
  if (m.includes('database') || m.includes('prisma') || m.includes('server') || m.includes('500'))
    return 'server';
  return 'unknown';
}

const KIND_TONE: Record<ErrorKind, SpotlightTone> = {
  network: 'indigo',
  auth: 'rose',
  notfound: 'violet',
  server: 'amber',
  unknown: 'emerald',
};

const KIND_META: Record<
  ErrorKind,
  { eyebrow: string; title: string; description: string }
> = {
  network: {
    eyebrow: 'خطای اتصال',
    title: 'ارتباط با سرور برقرار نشد',
    description: 'اینترنت خود را بررسی کنید و دوباره تلاش کنید.',
  },
  auth: {
    eyebrow: 'دسترسی غیرمجاز',
    title: 'دسترسی شما مجاز نیست',
    description: 'شما اجازهٔ دسترسی به این بخش را ندارید. ممکن است نقش حساب شما کافی نباشد.',
  },
  notfound: {
    eyebrow: 'یافت نشد',
    title: 'این منبع وجود ندارد',
    description: 'صفحه یا داده‌ای که دنبال آن می‌گردید یافت نشد.',
  },
  server: {
    eyebrow: 'خطای سرور',
    title: 'سرور موقتاُ در دسترس نیست',
    description: 'مشکلی فنی پیش آمده. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.',
  },
  unknown: {
    eyebrow: 'خطای غیرمنتظره',
    title: 'مشکلی پیش آمده است',
    description: 'خطایی رخ داده که پیش‌بینی نشده بود. لطفاً دوباره تلاش کنید.',
  },
};

/* ─── Illustrations ─────────────────────────────────────────────────── */

/** Network — broken signal waves */
function NetworkIllustration() {
  return (
    <svg className={s.illustration} viewBox="0 0 400 400" role="img" aria-label="خطای اتصال">
      <defs>
        <linearGradient id="re-sig" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--re-primary)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--re-primary)" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Outer rings */}
      <g className={s.outerRing}>
        <circle cx="200" cy="200" r="160" stroke="var(--ds-fg-muted)" strokeWidth="1" strokeDasharray="2 6" opacity="0.3" />
      </g>
      <g className={s.outerRing2}>
        <circle cx="200" cy="200" r="140" stroke="var(--ds-fg-muted)" strokeWidth="0.5" strokeDasharray="1 8" opacity="0.2" />
      </g>

      {/* Signal tower */}
      <g className={s.signalWaves}>
        {/* Tower base */}
        <line x1="200" y1="120" x2="200" y2="280" stroke="var(--ds-fg)" strokeWidth="3" strokeLinecap="round" />
        <line x1="180" y1="280" x2="220" y2="280" stroke="var(--ds-fg)" strokeWidth="3" strokeLinecap="round" />
        {/* Antenna tip */}
        <circle cx="200" cy="115" r="5" fill="var(--re-primary)" opacity="0.8" />
        {/* Signal waves — left */}
        <path d="M170 140 C155 155 155 170 170 185" stroke="url(#re-sig)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M155 125 C135 145 135 175 155 195" stroke="url(#re-sig)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M140 110 C115 135 115 185 140 210" stroke="url(#re-sig)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
        {/* Signal waves — right */}
        <path d="M230 140 C245 155 245 170 230 185" stroke="url(#re-sig)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M245 125 C265 145 265 175 245 195" stroke="url(#re-sig)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M260 110 C285 135 285 185 260 210" stroke="url(#re-sig)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
      </g>

      {/* X mark — connection broken */}
      <g className={s.signalBreak} opacity="0.8">
        <line x1="175" y1="220" x2="225" y2="250" stroke="var(--re-primary)" strokeWidth="3" strokeLinecap="round" />
        <line x1="225" y1="220" x2="175" y2="250" stroke="var(--re-primary)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="200" cy="235" r="22" stroke="var(--re-primary)" strokeWidth="1.5" fill="none" opacity="0.4" />
      </g>

      {/* Stars */}
      <g className={s.stars} fill="var(--re-primary)" opacity="0.5">
        <circle cx="100" cy="120" r="2" />
        <circle cx="310" cy="100" r="1.5" />
        <circle cx="330" cy="250" r="2" />
        <circle cx="80" cy="280" r="1.5" />
        <circle cx="280" cy="80" r="1" />
      </g>
    </svg>
  );
}

/** Auth — shield + lock */
function AuthIllustration() {
  return (
    <svg className={s.illustration} viewBox="0 0 400 400" role="img" aria-label="دسترسی غیرمجاز">
      <defs>
        <linearGradient id="re-shield" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="var(--re-primary)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--re-primary)" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Outer rings */}
      <g className={s.outerRing}>
        <circle cx="200" cy="200" r="160" stroke="var(--ds-fg-muted)" strokeWidth="1" strokeDasharray="2 6" opacity="0.3" />
      </g>

      {/* Shield */}
      <g className={s.shieldPulse}>
        <path
          d="M200 70 L280 110 L280 200 C280 260 240 310 200 340 C160 310 120 260 120 200 L120 110 Z"
          fill="url(#re-shield)"
          stroke="var(--ds-line, var(--ds-border))"
          strokeWidth="1"
          opacity="0.5"
        />
      </g>

      {/* Lock body */}
      <g className={s.lockIcon}>
        <rect x="155" y="190" width="90" height="70" rx="12" fill="var(--ds-bg, white)" stroke="var(--ds-line, var(--ds-border))" strokeWidth="1" opacity="0.9" />
        {/* Shackle */}
        <path d="M170 190 L170 165 C170 145 182 135 200 135 C218 135 230 145 230 165 L230 190" stroke="var(--re-primary)" strokeWidth="8" strokeLinecap="round" fill="none" />
        {/* Keyhole */}
        <circle cx="200" cy="215" r="8" fill="var(--re-primary)" opacity="0.6" />
        <path d="M196 218 L194 235 L206 235 L204 218 Z" fill="var(--re-primary)" opacity="0.6" />
        <circle cx="200" cy="213" r="3" fill="var(--ds-bg, white)" opacity="0.8" />
      </g>

      {/* Stars */}
      <g className={s.stars} fill="var(--re-primary)" opacity="0.5">
        <circle cx="110" cy="130" r="2" />
        <circle cx="310" cy="110" r="1.5" />
        <circle cx="330" cy="230" r="2.5" />
        <circle cx="90" cy="270" r="1.5" />
        <circle cx="270" cy="90" r="1" />
      </g>
    </svg>
  );
}

/** NotFound — lost compass */
function NotFoundIllustration() {
  return (
    <svg className={s.illustration} viewBox="0 0 400 400" role="img" aria-label="یافت نشد">
      {/* Outer rings */}
      <g className={s.outerRing}>
        <circle cx="200" cy="200" r="160" stroke="var(--ds-fg-muted)" strokeWidth="1" strokeDasharray="2 6" opacity="0.3" />
      </g>
      <g className={s.outerRing2}>
        <circle cx="200" cy="200" r="140" stroke="var(--ds-fg-muted)" strokeWidth="0.5" strokeDasharray="1 8" opacity="0.2" />
      </g>

      {/* Compass body */}
      <g className={s.compassDrift}>
        <circle cx="200" cy="200" r="80" fill="var(--ds-bg, white)" stroke="var(--ds-line, var(--ds-border))" strokeWidth="1.5" opacity="0.9" />
        <circle cx="200" cy="200" r="60" fill="none" stroke="var(--ds-fg-muted)" strokeWidth="0.5" opacity="0.3" />
        {/* Compass needle — spinning */}
        <path d="M200 140 L210 195 L200 200 L190 195 Z" fill="var(--re-primary)" opacity="0.7" />
        <path d="M200 260 L190 205 L200 200 L210 205 Z" fill="var(--ds-fg-muted)" opacity="0.3" />
        {/* Center dot */}
        <circle cx="200" cy="200" r="6" fill="var(--re-primary)" opacity="0.8" />
        <circle cx="200" cy="200" r="3" fill="var(--ds-bg, white)" opacity="0.9" />
        {/* Cardinal directions */}
        <text x="200" y="125" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ds-fg-muted)" opacity="0.5">N</text>
        <text x="200" y="295" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ds-fg-muted)" opacity="0.5">S</text>
        <text x="125" y="205" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ds-fg-muted)" opacity="0.5">W</text>
        <text x="275" y="205" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ds-fg-muted)" opacity="0.5">E</text>
      </g>

      {/* Question mark — lost */}
      <g opacity="0.6">
        <text x="290" y="150" fontSize="36" fontWeight="800" fill="var(--re-primary)" fontFamily="var(--ds-font-mono, ui-monospace)" opacity="0.5">?</text>
      </g>

      {/* Stars */}
      <g className={s.stars} fill="var(--re-primary)" opacity="0.5">
        <circle cx="100" cy="120" r="2" />
        <circle cx="310" cy="100" r="1.5" />
        <circle cx="330" cy="250" r="2" />
        <circle cx="80" cy="280" r="1.5" />
        <circle cx="280" cy="80" r="1" />
      </g>
    </svg>
  );
}

/** Server — crashed server */
function ServerIllustration() {
  return (
    <svg className={s.illustration} viewBox="0 0 400 400" role="img" aria-label="خطای سرور">
      {/* Outer rings */}
      <g className={s.outerRing}>
        <circle cx="200" cy="200" r="160" stroke="var(--ds-fg-muted)" strokeWidth="1" strokeDasharray="2 6" opacity="0.3" />
      </g>

      {/* Server rack */}
      <g className={s.serverShake}>
        {/* Rack body */}
        <rect x="130" y="120" width="140" height="160" rx="12" fill="var(--ds-bg, white)" stroke="var(--ds-line, var(--ds-border))" strokeWidth="1.5" opacity="0.9" />
        {/* Server blades */}
        <rect x="145" y="140" width="110" height="25" rx="4" fill="var(--ds-surface, var(--ds-bg-subtle))" stroke="var(--ds-line, var(--ds-border))" strokeWidth="0.5" />
        <circle cx="160" cy="152.5" r="4" fill="var(--re-primary)" opacity="0.6" />
        <circle cx="175" cy="152.5" r="3" fill="var(--ds-fg-muted)" opacity="0.3" />
        <rect x="190" y="148" width="50" height="9" rx="2" fill="var(--ds-fg-muted)" opacity="0.15" />

        <rect x="145" y="175" width="110" height="25" rx="4" fill="var(--ds-surface, var(--ds-bg-subtle))" stroke="var(--ds-line, var(--ds-border))" strokeWidth="0.5" />
        <circle cx="160" cy="187.5" r="4" fill="var(--re-primary)" opacity="0.6" />
        <circle cx="175" cy="187.5" r="3" fill="var(--ds-fg-muted)" opacity="0.3" />
        <rect x="190" y="183" width="50" height="9" rx="2" fill="var(--ds-fg-muted)" opacity="0.15" />

        <rect x="145" y="210" width="110" height="25" rx="4" fill="var(--ds-surface, var(--ds-bg-subtle))" stroke="var(--ds-line, var(--ds-border))" strokeWidth="0.5" />
        <circle cx="160" cy="222.5" r="4" fill="var(--re-primary)" opacity="0.6" />
        <circle cx="175" cy="222.5" r="3" fill="var(--ds-fg-muted)" opacity="0.3" />
        <rect x="190" y="218" width="50" height="9" rx="2" fill="var(--ds-fg-muted)" opacity="0.15" />

        <rect x="145" y="245" width="110" height="25" rx="4" fill="var(--ds-surface, var(--ds-bg-subtle))" stroke="var(--ds-line, var(--ds-border))" strokeWidth="0.5" />
        <circle cx="160" cy="257.5" r="4" fill="var(--re-primary)" opacity="0.4" />
        <circle cx="175" cy="257.5" r="3" fill="var(--ds-fg-muted)" opacity="0.3" />
        <rect x="190" y="253" width="50" height="9" rx="2" fill="var(--ds-fg-muted)" opacity="0.15" />
      </g>

      {/* Smoke particles */}
      <g className="smokeParticles" fill="var(--ds-fg-muted)" opacity="0.3">
        <circle cx="180" cy="100" r="6" />
        <circle cx="210" cy="90" r="4" />
        <circle cx="195" cy="80" r="5" />
      </g>

      {/* Stars */}
      <g className={s.stars} fill="var(--re-primary)" opacity="0.5">
        <circle cx="100" cy="140" r="2" />
        <circle cx="310" cy="120" r="1.5" />
        <circle cx="320" cy="260" r="2" />
        <circle cx="85" cy="290" r="1.5" />
        <circle cx="280" cy="90" r="1" />
      </g>
    </svg>
  );
}

/** Unknown — pulsing warning */
function UnknownIllustration() {
  return (
    <svg className={s.illustration} viewBox="0 0 400 400" role="img" aria-label="خطای غیرمنتظره">
      {/* Outer rings */}
      <g className={s.outerRing}>
        <circle cx="200" cy="200" r="160" stroke="var(--ds-fg-muted)" strokeWidth="1" strokeDasharray="2 6" opacity="0.3" />
      </g>
      <g className={s.outerRing2}>
        <circle cx="200" cy="200" r="140" stroke="var(--ds-fg-muted)" strokeWidth="0.5" strokeDasharray="1 8" opacity="0.2" />
      </g>

      {/* Expanding ring */}
      <g className={s.warningRing}>
        <circle cx="200" cy="200" r="100" stroke="var(--re-primary)" strokeWidth="1" fill="none" opacity="0.3" />
      </g>

      {/* Warning triangle */}
      <g className={s.warningPulse}>
        <path
          d="M200 100 L280 240 L120 240 Z"
          fill="var(--ds-bg, white)"
          stroke="var(--re-primary)"
          strokeWidth="2"
          opacity="0.8"
        />
        {/* Exclamation mark */}
        <line x1="200" y1="150" x2="200" y2="200" stroke="var(--re-primary)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="200" cy="220" r="4" fill="var(--re-primary)" />
      </g>

      {/* Inner glow */}
      <circle cx="200" cy="200" r="60" fill="var(--re-primary)" opacity="0.05" className={s.innerGlow} />

      {/* Stars */}
      <g className={s.stars} fill="var(--re-primary)" opacity="0.5">
        <circle cx="100" cy="120" r="2" />
        <circle cx="310" cy="100" r="1.5" />
        <circle cx="330" cy="250" r="2" />
        <circle cx="80" cy="280" r="1.5" />
        <circle cx="280" cy="80" r="1" />
      </g>
    </svg>
  );
}

/* ─── Suggested destinations ─────────────────────────────────────── */

function defaultSuggestions(
  kind: ErrorKind,
  backHref: string,
  backLabel: string,
): SuggestItem[] {
  const items: SuggestItem[] = [];
  if (backHref && backHref !== '/') {
    items.push({ href: backHref, label: backLabel, sub: 'بازگشت به بخش قبلی', icon: ArrowLeft });
  }
  items.push({ href: '/', label: 'صفحه اصلی', sub: 'شروع دوباره از سایت', icon: Home });
  items.push({ href: '/dashboard', label: 'داشبورد', sub: 'پنل مدیریت', icon: LayoutDashboard });
  if (kind === 'auth') {
    items.push({ href: '/auth', label: 'ورود', sub: 'وارد حساب کاربری شوید', icon: LogIn });
  } else {
    items.push({ href: '/exchange', label: 'صرافی', sub: 'پنل صرافی', icon: Store });
  }
  return items.slice(0, 4);
}

const ILLUSTRATION_MAP: Record<ErrorKind, () => React.ReactNode> = {
  network: NetworkIllustration,
  auth: AuthIllustration,
  notfound: NotFoundIllustration,
  server: ServerIllustration,
  unknown: UnknownIllustration,
};

/* ─── Component ──────────────────────────────────────────────────────── */

export function RouteError({
  error,
  reset,
  section,
  backHref = '/',
  backLabel = 'صفحه اصلی',
  variant = 'page',
  suggestions,
}: RouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const kind = detectKind(error);
  const tone = KIND_TONE[kind];
  const { eyebrow, title, description } = KIND_META[kind];
  const heading = section ? `خطا در بارگذاری ${section}` : title;
  const Illustration = ILLUSTRATION_MAP[kind];
  const suggestItems = suggestions ?? defaultSuggestions(kind, backHref, backLabel);
  const root = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useStaggerEntrance(root);

  return (
    <div
      ref={root}
      className={s.root}
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

      {variant === 'page' && <Spotlight tone={tone} className={s.spotlight} />}

      {/* ── Hero stage: SVG illustration ──────────────────────────── */}
      <div data-stagger className={s.stage}>
        <Illustration />
      </div>

      {/* ── Headline ──────────────────────────────────────────────── */}
      <div data-stagger className={s.headBlock}>
        <span className={s.eyebrow}>
          {kind === 'network' && <WifiOff size={13} aria-hidden />}
          {kind === 'auth' && <ShieldAlert size={13} aria-hidden />}
          {kind === 'notfound' && <Search size={13} aria-hidden />}
          {kind === 'server' && <ServerCrash size={13} aria-hidden />}
          {kind === 'unknown' && <AlertTriangle size={13} aria-hidden />}
          {eyebrow}
        </span>
        <h2 id={titleId} className={s.title}>
          {heading}
        </h2>
        <p className={s.lead}>{description}</p>

        {process.env.NODE_ENV === 'development' && (
          <code className={s.devInfo} dir="ltr">
            {error.message}
            {error.digest && <> &middot; digest: {error.digest}</>}
          </code>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div data-stagger className={s.actions}>
        <button type="button" onClick={reset} className={s.retryBtn}>
          <RefreshCw size={14} strokeWidth={2} aria-hidden />
          تلاش مجدد
        </button>
        <Link href={backHref} className={s.backLink}>
          <ArrowLeft size={14} strokeWidth={2} aria-hidden />
          {backLabel}
        </Link>
      </div>

      {/* ── Suggested destination cards (2×2) ────────────────────── */}
      {suggestItems.length > 0 && (
        <div data-stagger className={s.suggestions}>
          {suggestItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={s.suggestCard}>
                {Icon && <Icon size={18} strokeWidth={1.75} aria-hidden />}
                <span className={s.suggestMain}>
                  <span className={s.suggestLabel}>{item.label}</span>
                  <span className={s.suggestSub}>{item.sub}</span>
                </span>
                <ArrowLeft size={15} strokeWidth={1.75} className={s.suggestArrow} aria-hidden />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}