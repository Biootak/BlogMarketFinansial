'use client';

/**
 * /(site)/not-found — 2026 Million-dollar 404 page
 *
 * Design intent:
 *   - Linear × Vercel × Stripe — bespoke illustrated compass that lost its way
 *   - Ambient gradient orbs (no AI-slop particles)
 *   - Display-grade Persian numerals "۴۰۴" with optical-kerning
 *   - Inline SVG with CSS animations (no external assets, no layout shift)
 *   - Type hierarchy: massive display → headline → caption → actions
 *   - Mobile-first: collapses to single column at <640px
 *   - Full a11y: prefers-reduced-motion, focus rings, role="alert"
 *
 * Mirrors the same illustration in dashboard/not-found for visual consistency.
 */

import { ArrowRight, Compass, Home, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef } from 'react';
import s from './not-found.module.css';

const SUGGESTED_LINKS: ReadonlyArray<{ href: string; label: string; sub: string }> = [
  { href: '/', label: 'صفحهٔ اصلی', sub: 'تازه‌ترین گزارش‌ها و تحلیل‌ها' },
  { href: '/exchanges', label: 'صرافی‌ها', sub: 'مقایسه نرخ صرافی‌های معتبر' },
  { href: '/money-transfer', label: 'حوالهٔ ارزی', sub: 'ارسال امن به افغانستان و منطقه' },
  { href: '/archive', label: 'آرشیو مقالات', sub: 'مطالب آموزشی و تحلیلی' },
];

export default function SiteNotFound() {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!root.current) return;
    const items = root.current.querySelectorAll<HTMLElement>('[data-stagger]');
    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => {
        el.style.transition =
          'opacity 0.6s var(--ds-ease-out-quart, cubic-bezier(0.22, 1, 0.36, 1)), transform 0.6s var(--ds-ease-out-quart, cubic-bezier(0.22, 1, 0.36, 1))';
        el.style.transitionDelay = `${i * 70}ms`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }, []);

  return (
    <div ref={root} className={s.root} dir="rtl" role="alert" aria-labelledby={titleId}>
      {/* ── Ambient background orbs (tokens-only) ── */}
      <div className={s.ambients} aria-hidden>
        <span className={`${s.orb} ${s.orbA}`} />
        <span className={`${s.orb} ${s.orbB}`} />
        <span className={`${s.orb} ${s.orbC}`} />
      </div>

      {/* ── Hero stage: bespoke SVG illustration ── */}
      <div data-stagger className={s.stage}>
        <LostCompassIllustration />
      </div>

      {/* ── Headline ── */}
      <div data-stagger className={s.headBlock}>
        <span className={s.eyebrow}>
          <Compass size={13} aria-hidden />
          مسیر گم شده
        </span>
        <h1 id={titleId} className={s.title}>
          صفحه‌ای که دنبال آن می‌گردید پیدا نشد
        </h1>
        <p className={s.lead}>
          ممکن است لینک قدیمی باشد، صفحه منتقل شده باشد، یا آدرس را اشتباه وارد کرده باشید.
        </p>
        <code className={s.pathCode} dir="ltr">
          {pathname}
        </code>
      </div>

      {/* ── Suggested destinations (4 mini-cards) ── */}
      <div data-stagger className={s.suggestions} aria-label="پیشنهادهای جایگزین">
        {SUGGESTED_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={s.suggestCard}>
            <div className={s.suggestMain}>
              <span className={s.suggestLabel}>{link.label}</span>
              <span className={s.suggestSub}>{link.sub}</span>
            </div>
            <ArrowRight
              className={s.suggestArrow}
              size={16}
              aria-hidden
              strokeWidth={1.5}
            />
          </Link>
        ))}
      </div>

      {/* ── Primary actions ── */}
      <div data-stagger className={s.actions}>
        <Link href="/" className={s.primaryCta}>
          <Home size={15} aria-hidden />
          بازگشت به خانه
        </Link>
        <Link href="/search" className={s.ghostCta}>
          <Search size={15} aria-hidden />
          جستجو در سایت
        </Link>
        <Link href="/contact" className={s.ghostCta}>
          <Sparkles size={15} aria-hidden />
          تماس با پشتیبانی
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   LostCompassIllustration — inline SVG bespoke illustration
   - دایرهٔ بیرونی با نقاط جغرافیایی (stagger fade-in)
   - عقربهٔ قطب‌نما که می‌چرخد (ease-in-out 6s loop)
   - مسیر نقطه‌چین که به خارج می‌رود (dashoffset animation)
   - کلمهٔ "۴۰۴" به‌صورت optical-sized typography داخل دایره
   - رنگ‌ها: فقط ds-tokens (--ds-fg, --ds-primary, --ds-line)
   ──────────────────────────────────────────────────────────────────────── */

function LostCompassIllustration() {
  return (
    <svg
      className={s.illustration}
      viewBox="0 0 400 400"
      role="img"
      aria-label="نماد گم‌شدن مسیر"
      fill="none"
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

      {/* inner compass body */}
      <circle
        cx="200"
        cy="200"
        r="120"
        fill="url(#nc-glass)"
        stroke="var(--ds-line, var(--ds-border))"
        strokeWidth="1"
        filter="url(#nc-shadow)"
      />
      <circle
        cx="200"
        cy="200"
        r="120"
        stroke="var(--ds-fg-muted)"
        strokeOpacity="0.2"
        strokeWidth="1"
      />

      {/* compass needle — rotates 6s, drifts */}
      <g className={s.needle}>
        <path
          d="M200 110 L208 200 L200 290 L192 200 Z"
          fill="var(--ds-primary)"
          opacity="0.85"
        />
        <path
          d="M200 110 L208 200 L200 200 L192 200 Z"
          fill="var(--ds-fg)"
          opacity="0.4"
        />
        <circle cx="200" cy="200" r="6" fill="var(--ds-bg, white)" stroke="var(--ds-fg)" strokeWidth="1.5" />
      </g>

      {/* dashed path leading out of compass */}
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

      {/* central 404 number — display-grade */}
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

      {/* small star markers */}
      <g className={s.stars} fill="var(--ds-primary)" opacity="0.5">
        <circle cx="120" cy="140" r="2" />
        <circle cx="300" cy="120" r="1.5" />
        <circle cx="320" cy="220" r="2.5" />
        <circle cx="100" cy="280" r="1.5" />
      </g>
    </svg>
  );
}
