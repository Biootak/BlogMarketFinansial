'use client';

/**
 * StateHero — canonical premium state page (403 و maintenance / offline /
 * session-expired / exchange-suspended و …).
 *
 * همان زبان طراحی صفحهٔ ۴۰۳ (Forbidden):
 *   - SVG illustration با عدد وضعیت (code) و نماد مرکزی (mark)
 *   - Ambient gradient orbs + Spotlight
 *   - سرتیتر (eyebrow) + عنوان + توضیح (+ مسیر جاری)
 *   - آیتم‌های راهنما (helpItems)، گرید وضعیت (meta)، کارت‌های مقصد (suggestedLinks)
 *   - CTA اصلی + ثانویه و خط پشتیبانی (foot)
 *   - بدون asset خارجی، بدون layout shift، RTL-safe، prefers-reduced-motion
 *
 * `Forbidden` (پایین همین فایل) wrapper ای است که همان props را با پیش‌فرض
 * ۴۰۳/قفل نگه می‌دارد — صفحهٔ /forbidden بدون تغییر کار می‌کند.
 */

import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  CloudOff,
  Construction,
  Home,
  LayoutDashboard,
  LogIn,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShieldX,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useId, useRef } from 'react';

import { useStaggerEntrance } from '@/hooks/useStaggerEntrance';
import { Spotlight } from './Spotlight';
import s from './StateHero.module.css';

/* ─── Icon Registry (string → LucideIcon, serializable) ──────────────── */

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  layoutdashboard: LayoutDashboard,
  search: Search,
  sparkles: Sparkles,
  userround: UserRound,
  refresh: RefreshCw,
  login: LogIn,
  telegram: Send,
  phone: Phone,
  mail: Mail,
  shield: ShieldCheck,
  clock: Clock3,
  wrench: Wrench,
  cloud: CloudOff,
  alert: AlertTriangle,
  construction: Construction,
};

function resolveIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  return ICON_MAP[name.toLowerCase()] ?? undefined;
}

/* ─── Types ──────────────────────────────────────────────────────────── */

export type StateHeroTone = 'accent' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'indigo';

/** نماد مرکزی illustration — هر وضعیت نماد خودش را دارد. */
export type StateHeroMark = 'vault' | 'maintenance' | 'offline' | 'session' | 'suspended';

export interface StateHeroLink {
  href: string;
  label: string;
  sub?: string;
  /** Icon name key (e.g. "home", "refresh") — serializable string */
  icon?: string;
}

export interface StateHeroMetaItem {
  label: string;
  value: ReactNode;
}

export interface StateHeroFoot {
  label: string;
  href: string;
}

export interface StateHeroProps {
  /** عدد/کد بزرگ داخل illustration (پیش‌فرض ۴۰۳). */
  code?: string;
  /** نماد مرکزی — پیش‌فرض قفل (vault). */
  mark?: StateHeroMark;
  title?: string;
  description?: string;
  /** CTA اصلی. */
  primaryLink?: StateHeroLink;
  /** CTA های ثانویه (ghost). */
  secondaryLinks?: StateHeroLink[];
  /** کارت‌های مقصد پیشنهادی (زیر توضیح). */
  suggestedLinks?: StateHeroLink[];
  /** گرید وضعیت (۳-۴ آیتم) — اختیاری. */
  meta?: StateHeroMetaItem[];
  /** آیتم‌های راهنمای کوتاه (bullet) — اختیاری. */
  helpItems?: string[];
  /** خط پشتیبانی انتهای صفحه (mailto/tel) — اختیاری. */
  foot?: StateHeroFoot;
  tone?: StateHeroTone;
  spotlight?: boolean;
  showPath?: boolean;
  variant?: 'page' | 'inline';
  eyebrow?: string;
  className?: string;
}

/* ─── Illustration ───────────────────────────────────────────────────── */

function CenterMark({ mark }: { mark: StateHeroMark }) {
  const primary = 'var(--ds-primary)';
  switch (mark) {
    case 'maintenance':
      // چرخ‌دنده (gear) — به‌روزرسانی/تعمیر
      return (
        <g fill={primary}>
          <circle cx="200" cy="210" r="16" opacity="0.85" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={i}
              x="196"
              y="180"
              width="8"
              height="14"
              rx="2"
              opacity="0.7"
              transform={`rotate(${i * 45} 200 210)`}
            />
          ))}
          <circle cx="200" cy="210" r="7" fill="var(--ds-bg, white)" opacity="0.9" />
        </g>
      );
    case 'offline':
      // ابر با خط مورب — قطع اتصال
      return (
        <g stroke={primary} strokeWidth="3" strokeLinecap="round">
          <path
            d="M168 224 a16 16 0 0 1 6 -30 a20 20 0 0 1 38 4 a14 14 0 0 1 16 26 z"
            fill="none"
            opacity="0.9"
          />
          <line x1="176" y1="236" x2="228" y2="184" opacity="0.85" />
        </g>
      );
    case 'session':
      // ساعت — انقضای نشست
      return (
        <g stroke={primary} strokeWidth="3" strokeLinecap="round" fill="none">
          <circle cx="200" cy="210" r="20" opacity="0.9" />
          <line x1="200" y1="210" x2="200" y2="197" opacity="0.95" />
          <line x1="200" y1="210" x2="211" y2="216" opacity="0.8" />
        </g>
      );
    case 'suspended':
      // مثلث هشدار — تعلیق
      return (
        <g fill={primary}>
          <path d="M200 178 L224 232 L176 232 Z" opacity="0.85" />
          <rect
            x="197"
            y="205"
            width="6"
            height="16"
            rx="2"
            fill="var(--ds-bg, white)"
            opacity="0.95"
          />
          <circle cx="200" cy="228" r="2.5" fill="var(--ds-bg, white)" opacity="0.95" />
        </g>
      );
    default:
      // قفل — ۴۰۳ (مثل نسخهٔ قبلی)
      return (
        <>
          <circle cx="200" cy="215" r="14" fill={primary} opacity="0.12" />
          <circle cx="200" cy="210" r="8" fill={primary} opacity="0.6" />
          <path d="M195 214 L193 232 L207 232 L205 214 Z" fill={primary} opacity="0.6" />
          <circle cx="200" cy="208" r="3" fill="var(--ds-bg, white)" opacity="0.8" />
        </>
      );
  }
}

function StateHeroIllustration({
  tone,
  code,
  mark,
}: { tone: StateHeroTone; code: string; mark: StateHeroMark }) {
  return (
    <svg
      className={s.illustration}
      viewBox="0 0 400 400"
      role="img"
      aria-label="نماد وضعیت"
      fill="none"
      data-tone={tone}
    >
      <defs>
        <radialGradient id="sh-glass" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="var(--ds-bg, white)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--ds-bg-subtle, var(--ds-bg))" stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id="sh-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--ds-fg)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--ds-fg)" stopOpacity="0.2" />
        </linearGradient>
        <filter id="sh-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="20"
            floodColor="var(--ds-fg)"
            floodOpacity="0.18"
          />
        </filter>
        <radialGradient id="sh-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-primary)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--ds-primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sh-shield" x1="50%" y1="0%" x2="50%" y2="100%">
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
          stroke="url(#sh-stroke)"
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

      {/* Shield body — behind the medallion */}
      <g className={s.shieldGroup}>
        <path
          d="M200 70 L280 110 L280 200 C280 260 240 310 200 340 C160 310 120 260 120 200 L120 110 Z"
          fill="url(#sh-shield)"
          stroke="var(--ds-line, var(--ds-border))"
          strokeWidth="1"
          opacity="0.5"
        />
      </g>

      {/* Inner glass body */}
      <g className={s.lockBody}>
        <rect
          x="140"
          y="180"
          width="120"
          height="90"
          rx="16"
          fill="url(#sh-glass)"
          stroke="var(--ds-line, var(--ds-border))"
          strokeWidth="1"
          filter="url(#sh-shadow)"
        />
        <rect
          x="140"
          y="180"
          width="120"
          height="90"
          rx="16"
          fill="url(#sh-glow)"
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

      {/* Shackle (arc) — فقط برای قفل (403) */}
      {mark === 'vault' && (
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
      )}

      {/* Center mark — نماد وضعیت */}
      <g className={s.centerMark}>
        <CenterMark mark={mark} />
      </g>

      {/* X mark — فقط برای 403 */}
      {mark === 'vault' && (
        <g className={s.xMark} opacity="0.6">
          <line
            x1="260"
            y1="155"
            x2="275"
            y2="170"
            stroke="var(--ds-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="275"
            y1="155"
            x2="260"
            y2="170"
            stroke="var(--ds-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            cx="267.5"
            cy="162.5"
            r="12"
            stroke="var(--ds-primary)"
            strokeWidth="1.5"
            fill="none"
            opacity="0.4"
          />
        </g>
      )}

      {/* Status code — display-grade */}
      <text
        className={s.numeral}
        x="200"
        y="310"
        textAnchor="middle"
        fontSize="34"
        fontWeight="800"
        fill="var(--ds-fg)"
        fontFamily="var(--ds-font-mono, ui-monospace)"
        style={{ letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
      >
        {code}
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

/* ─── Component ──────────────────────────────────────────────────────── */

export function StateHero({
  code = '۴۰۳',
  mark = 'vault',
  title,
  description,
  primaryLink,
  secondaryLinks = [],
  suggestedLinks = [],
  meta,
  helpItems,
  foot,
  tone = 'rose',
  spotlight = true,
  showPath = true,
  variant = 'page',
  eyebrow,
  className,
}: StateHeroProps) {
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
        <StateHeroIllustration tone={tone} code={code} mark={mark} />
      </div>

      {/* ── Headline ──────────────────────────────────────────────── */}
      <div data-stagger className={s.headBlock}>
        {eyebrow && (
          <span className={s.eyebrow}>
            <ShieldX size={13} aria-hidden />
            {eyebrow}
          </span>
        )}
        {title && (
          <h1 id={titleId} className={s.title}>
            {title}
          </h1>
        )}
        {description && (
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
        )}
      </div>

      {/* ── Help items (short bullets) ─────────────────────────────── */}
      {helpItems && helpItems.length > 0 && (
        <ul data-stagger className={s.helpList} aria-label="راهنما">
          {helpItems.map((item) => (
            <li key={item} className={s.helpItem}>
              {item}
            </li>
          ))}
        </ul>
      )}

      {/* ── Status meta grid ───────────────────────────────────────── */}
      {meta && meta.length > 0 && (
        <div data-stagger className={s.metaGrid} aria-label="وضعیت">
          {meta.map((item) => (
            <div key={item.label} className={s.metaCell}>
              <span className={s.metaLabel}>{item.label}</span>
              <span className={s.metaValue}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

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
      {(primaryLink || secondaryLinks.length > 0) && (
        <div data-stagger className={s.actions}>
          {primaryLink &&
            (() => {
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
      )}

      {/* ── Support foot ───────────────────────────────────────────── */}
      {foot && (
        <div data-stagger className={s.foot}>
          <span>{foot.label}</span>
          <a href={foot.href} dir="ltr">
            {foot.href.replace(/^mailto:|^tel:/, '')}
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Forbidden — wrapper 403 با پیش‌فرض‌های قبلی ─────────────────────── */

const DEFAULT_TITLE = 'دسترسی شما به این بخش مجاز نیست';
const DEFAULT_DESC =
  'شما اجازهٔ دسترسی به این صفحه را ندارید. ممکن است نقش حساب شما برای این بخش کافی نباشد.';
const DEFAULT_EYEBROW = 'خطای دسترسی';
const DEFAULT_PRIMARY: StateHeroLink = {
  href: '/dashboard',
  label: 'بازگشت به داشبورد',
  icon: 'layoutdashboard',
};
const DEFAULT_SECONDARY: StateHeroLink[] = [
  { href: '/', label: 'صفحهٔ اصلی', icon: 'home' },
  { href: '/contact', label: 'تماس با پشتیبانی', icon: 'sparkles' },
];
const DEFAULT_SUGGESTED: StateHeroLink[] = [
  { href: '/dashboard', label: 'داشبورد', sub: 'پیشخوان حساب شما' },
  { href: '/dashboard/wallet', label: 'کیف پول', sub: 'موجودی و تراکنش‌ها' },
  { href: '/', label: 'صفحهٔ اصلی', sub: 'خانهٔ سایت' },
  { href: '/contact', label: 'پشتیبانی', sub: 'تماس با تیم ما' },
];

export interface ForbiddenProps extends Omit<StateHeroProps, 'code' | 'mark'> {}

export function Forbidden(props: ForbiddenProps) {
  return (
    <StateHero
      code="۴۰۳"
      mark="vault"
      title={DEFAULT_TITLE}
      description={DEFAULT_DESC}
      eyebrow={DEFAULT_EYEBROW}
      primaryLink={DEFAULT_PRIMARY}
      secondaryLinks={DEFAULT_SECONDARY}
      suggestedLinks={DEFAULT_SUGGESTED}
      {...props}
    />
  );
}

export default StateHero;
