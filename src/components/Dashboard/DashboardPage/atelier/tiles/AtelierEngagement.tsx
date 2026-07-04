'use client';

/**
 * AtelierEngagement — Atelier 2026 (2026-07-04 v2) — engagement console.
 *
 * Visual redesign: replaces the 5/7 horizontal panorama with an
 * ASYMMETRIC bento grid. The heart remains the focal element but is now
 * housed in a hero card (left, 7/12 cols) with LIVE PARTICLES emanating
 * from it. The engagement-rate panel has been promoted to a featured
 * column (right, 5/12 cols, top). Comments and Shares are demoted to a
 * compact bottom strip — still useful, no longer competing for
 * attention.
 *
 * Why the new layout:
 *   • The previous design treated all four metrics as equals and
 *     asked the eye to scan them sequentially. Real dashboards usually
 *     have ONE primary "is my audience happy?" number — engagement
 *     rate — and three supporting breakdowns (likes, comments, shares).
 *     The v2 layout surfaces that hierarchy.
 *   • The heart visual used to share its half with mini-cards, which
 *     forced it to be smaller. v2 gives it the full 7-col hero canvas
 *     and the floating particles now have room to breathe.
 *   • Comments and shares are useful but secondary. Promoting them to
 *     the same tier as likes was wasting real estate.
 *
 * Composition (desktop ≥1280px):
 *
 *   ┌─────────────────────────────────┬──────────────────────┐
 *   │  ❤️ HERO HEART (cols 1–7)        │  ⚡ ENGAGEMENT RATE   │
 *   │   [BIG HEART + EKG + particles] │   ۶٫۸٪   [polar ring] │
 *   │   ۱,۲۴۷                           │   +۱٫۲pp             │
 *   │   ↗ +۱۲٪ هفتگی                   │   نرخ از هر ۱۰۰    │
 *   ├─────────────────────────────────┴──────────────────────┤
 *   │  💬 نظرات       ۴۳  ↘-۳٪   •  🔁 اشتراک  ۱۲۸  ↗+۲۴٪ │
 *   └────────────────────────────────────────────────────────┘
 *
 * Floating particles: eight tiny circles that drift upward from the
 * heart on mount, then loop subtly. Purely decorative — they hint at
 * "engagement is alive" without claiming any specific meaning.
 */

import CountUp from '@/components/Dashboard/primitives/CountUp';
import { cn } from '@/lib/utils';
import { useEffect, useId, useRef } from 'react';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineBolt,
  HiOutlineChatBubbleLeftRight,
  HiOutlineHeart,
  HiOutlineMinus,
  HiOutlineShare,
} from 'react-icons/hi2';
import { fmt, fmtCompact, pickTrend } from '../utils';

interface StatsLike {
  views: { today: number; data: number[] };
  likes: { total: number; data: number[] };
  /** `new` = new comments (matches the dashboard's existing
   *  "comments this period" headline). */
  comments: { new: number; data: number[] };
  shares: { total: number; data: number[] };
}

interface AtelierEngagementProps {
  stats: StatsLike;
}

/* ============================================================
 *  HeroHeart — the focal element (now much larger)
 *  ============================================================
 *  Same heart shape + EKG as before, but rendered larger and with
 *  a particle ring orbiting it. The particles are pure CSS — eight
 *  small circles that animate in a slow loop around the heart, with
 *  staggered phase offsets so they never align.
 * ============================================================ */

interface HeroHeartProps {
  /** 7-point integer series (one point per day, last 7 days). */
  data: number[];
  /** Optional id for SVG <defs> — keeps the gradient unique on the
   *  page even when the dashboard is rendered server-side twice. */
  gradId: string;
}

function HeroHeart({ data, gradId }: HeroHeartProps) {
  const strokeRef = useRef<SVGPathElement>(null);
  const allZero = data.length === 0 || data.every((v) => v === 0);

  useEffect(() => {
    const el = strokeRef.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.strokeDashoffset = '0';
      return;
    }
    el.style.strokeDashoffset = '1';
    const duration = 1500;
    let start: number | null = null;
    let raf = 0;
    const ease = (t: number) => 1 - 2 ** (-10 * t);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      el.style.strokeDashoffset = String(1 - ease(t));
      if (t < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [data]);

  // Build a horizontal 7-point sparkline that fits roughly inside the
  // lower-middle band of the heart, finishing with a sharp QRS peak.
  const VB_W = 400;
  const VB_H = 260;
  const baseY = VB_H * 0.72;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const span = max - min || 1;
  const step = data.length > 1 ? VB_W / (data.length - 1) : VB_W;

  const sparkPath = data
    .map((v, i) => {
      const x = i * step;
      const norm = allZero ? 0 : (v - min) / span;
      const wave = Math.sin(i * 0.95) * 7;
      const y = baseY - wave - norm * 20 - (i === data.length - 1 ? 28 : 0);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastX = (data.length - 1) * step;
  const lastY = baseY - Math.sin((data.length - 1) * 0.95) * 7 -
    (allZero ? 0 : ((data[data.length - 1] - min) / span) * 20) - 28;

  // Floating particle ring positions — 8 dots orbiting the heart center.
  // Rendered as <span> inside an absolutely positioned container.
  const particleCount = 8;
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 52 + (i % 3) * 4; // slight radius variation
    const xPct = 50 + Math.cos(angle) * (radius / 4);
    const yPct = 52 + Math.sin(angle) * (radius / 5);
    return { x: xPct, y: yPct, delay: i * 0.6 };
  });

  return (
    <div className="at-eng-hero-heart">
      <div className="at-eng-hero-heart__particles" aria-hidden>
        {particles.map((p, i) => (
          <span
            key={i}
            className="at-eng-hero-heart__particle"
            style={{
              insetInlineStart: `${p.x}%`,
              insetBlockStart: `${p.y}%`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="at-eng-hero-heart__halo" aria-hidden />

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="at-eng-hero-heart__svg"
        role="img"
        aria-label="روند هفتگی لایک‌ها — ضربان قلب"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.0" />
            <stop offset="40%" stopColor="var(--at-accent)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="var(--at-gold)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id={`${gradId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0.0" />
          </linearGradient>
          <radialGradient id={`${gradId}-core`} cx="0.5" cy="0.45" r="0.55">
            <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0" />
          </radialGradient>
          {/* Heart silhouette — larger version for the hero canvas. */}
          <path
            id={`${gradId}-shape`}
            d="M200,228
               C 110,160 60,118 60,76
               C 60,44 86,28 116,28
               C 148,28 176,48 200,76
               C 224,48 252,28 284,28
               C 314,28 340,44 340,76
               C 340,118 290,160 200,228 Z"
          />
        </defs>

        {/* soft inner radial fill — gives the heart a glowing core */}
        <use href={`#${gradId}-shape`} fill={`url(#${gradId}-core)`} aria-hidden />

        {/* gentle outer fill */}
        <use href={`#${gradId}-shape`} fill={`url(#${gradId}-fill)`} aria-hidden />

        {/* hairline heart silhouette */}
        <use
          href={`#${gradId}-shape`}
          fill="none"
          stroke="var(--at-line-strong)"
          strokeWidth={1.4}
          opacity={0.6}
          aria-hidden
        />

        {/* glow under-stroke for visual depth */}
        <use
          href={`#${gradId}-shape`}
          fill="none"
          stroke="var(--at-accent)"
          strokeWidth={8}
          opacity={0.10}
          aria-hidden
        />

        {/* ECG line traveling across the heart */}
        {data.length > 0 && (
          <>
            <path
              ref={strokeRef}
              d={sparkPath}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              style={{
                strokeDasharray: 1,
                strokeDashoffset: 1,
                filter: 'drop-shadow(0 0 8px color-mix(in oklch, var(--at-accent) 60%, transparent))',
              }}
            />
            {!allZero && (
              <>
                <circle
                  cx={lastX}
                  cy={lastY}
                  r={6}
                  fill="var(--at-bg)"
                  stroke="var(--at-accent)"
                  strokeWidth={2.2}
                />
                <circle cx={lastX} cy={lastY} r={2.2} fill="var(--at-accent)" />
              </>
            )}
          </>
        )}

        {/* baseline dashes for the no-data state */}
        {allZero && (
          <line
            x1={10}
            y1={baseY}
            x2={VB_W - 10}
            y2={baseY}
            stroke="var(--at-fg-faint)"
            strokeDasharray="4 4"
            strokeWidth={1}
            opacity={0.5}
          />
        )}
      </svg>
    </div>
  );
}

/* ============================================================
 *  EngagementRateGauge — promoted to hero column
 *  ============================================================
 *  Larger than the previous ring (96×96) with an inline value
 *  inside the dial and a longer narrative subline.
 * ============================================================ */

interface EngagementRateGaugeProps {
  /** Percentage 0..100 (clamped). */
  value: number;
  /** Color (CSS var). Defaults to accent. */
  color?: string;
  /** Track color (CSS var). Defaults to fg-faint. */
  trackColor?: string;
  /** Diameter in px. */
  size?: number;
  /** Stroke width in px. */
  stroke?: number;
  gradId: string;
  /** Delta in percentage points for the badge. */
  delta?: number;
}

function EngagementRateGauge({
  value,
  color = 'var(--at-accent)',
  trackColor = 'var(--at-fg-faint)',
  size = 96,
  stroke = 7,
  gradId,
  delta = 0,
}: EngagementRateGaugeProps) {
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(1, value));
  const targetOffset = c * (1 - safe);
  const ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.strokeDashoffset = String(targetOffset);
      return;
    }
    el.style.strokeDashoffset = String(c);
    const duration = 1300;
    let start: number | null = null;
    let raf = 0;
    const ease = (t: number) => 1 - 2 ** (-10 * t);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      el.style.strokeDashoffset = String(c * (1 - ease(t) * safe));
      if (t < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [safe, targetOffset, c]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="at-eng-rate-gauge"
      role="img"
      aria-label={`نرخ تعامل ${(value * 100).toFixed(1)} درصد`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--at-gold)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
        opacity={0.18}
      />
      <circle
        ref={ref}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 6px color-mix(in oklch, ${color} 50%, transparent))` }}
      />
      <text
        x={size / 2}
        y={size / 2 + 3}
        textAnchor="middle"
        dominantBaseline="middle"
        className="at-eng-rate-gauge__text"
        fill="var(--at-gold-fg)"
      >
        {(value * 100).toFixed(1)}
        <tspan className="at-eng-rate-gauge__unit">٪</tspan>
      </text>
    </svg>
  );
}

/* ============================================================
 *  CommentBubbleStack — visual for the comments satellite
 *  ============================================================
 *  Three small rounded rectangles that overlap like speech bubbles.
 *  Each row represents one of the recent 3 days of comments; the
 *  top rectangle fades in with a 60 ms stagger on mount.
 * ============================================================ */

function CommentBubbleStack({ intensity }: { intensity: number }) {
  return (
    <svg viewBox="0 0 64 40" className="at-eng-bubbles" aria-hidden>
      <rect x="6" y="6" width="44" height="14" rx="6" fill="var(--at-line)" />
      <rect x="3" y="20" width="36" height="14" rx="6" fill="var(--at-line)" />
      <rect
        x="14"
        y="10"
        width="48"
        height="16"
        rx="6"
        fill="var(--at-accent-soft)"
        stroke="var(--at-accent-fg)"
        strokeOpacity={0.45}
        strokeWidth={1}
        className="at-eng-bubble at-eng-bubble--front"
      />
      <path d="M22,26 L24,32 L28,26 Z" fill="var(--at-accent-soft)" stroke="var(--at-accent-fg)" strokeOpacity={0.45} strokeWidth={1} />
      <g className="at-eng-bubble__dots">
        <circle cx="22" cy="18" r="1.6" fill="var(--at-accent-fg)" />
        <circle cx="30" cy="18" r="1.6" fill="var(--at-accent-fg)" opacity={0.6 + intensity * 0.4} />
        <circle cx="38" cy="18" r="1.6" fill="var(--at-accent-fg)" opacity={0.3 + intensity * 0.5} />
      </g>
    </svg>
  );
}

/* ============================================================
 *  ShareRipple — visual for the shares satellite
 *  ============================================================
 *  Three concentric arcs that radiate from a center dot. Each arc
 *  fades in with a 200 ms stagger and slowly drifts outward, like
 *  a peer-to-peer share cascade.
 * ============================================================ */

function ShareRipple({ count }: { count: number }) {
  const tier = count < 50 ? 'low' : count < 200 ? 'mid' : 'high';
  return (
    <svg viewBox="0 0 64 40" className={cn('at-eng-ripple', `tier-${tier}`)} aria-hidden>
      <g className="at-eng-ripple__pulse" style={{ transformOrigin: '32px 20px' }}>
        <circle cx="32" cy="20" r="6" fill="var(--at-gold-soft)" stroke="var(--at-gold-fg)" strokeOpacity={0.45} strokeWidth={1} />
        <circle cx="32" cy="20" r="3" fill="var(--at-gold)" />
      </g>
      <g className="at-eng-ripple__ring" style={{ transformOrigin: '32px 20px' }}>
        <circle cx="32" cy="20" r="13" fill="none" stroke="var(--at-gold-fg)" strokeOpacity={0.45} strokeWidth={1} />
        <circle cx="32" cy="20" r="13" fill="none" stroke="var(--at-gold-fg)" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="3 4" />
      </g>
      <g className="at-eng-ripple__ring at-eng-ripple__ring--2" style={{ transformOrigin: '32px 20px' }}>
        <circle cx="32" cy="20" r="19" fill="none" stroke="var(--at-gold-fg)" strokeOpacity={0.22} strokeWidth={1} />
      </g>
      <circle cx="49" cy="14" r="1.5" fill="var(--at-gold-fg)" opacity="0.6" />
      <circle cx="52" cy="22" r="1.5" fill="var(--at-gold-fg)" opacity="0.45" />
      <circle cx="46" cy="28" r="1.5" fill="var(--at-gold-fg)" opacity="0.3" />
    </svg>
  );
}

/* ============================================================
 *  TrendPill — shared trend badge
 *  ============================================================ */

function TrendPill({
  trend,
  delta,
  suffix = '٪',
}: {
  trend: 'up' | 'down' | 'flat';
  delta: number;
  suffix?: string;
}) {
  const Icon =
    trend === 'up'
      ? HiOutlineArrowUpRight
      : trend === 'down'
        ? HiOutlineArrowDownRight
        : HiOutlineMinus;
  return (
    <span className={cn('at-eng-trend', `is-${trend}`)}>
      <Icon className="w-3 h-3" aria-hidden />
      <span className="tabular-nums">
        {`${delta > 0 ? '+' : ''}${delta.toFixed(suffix === 'pp' ? 1 : 0)}${suffix}`}
      </span>
    </span>
  );
}

/* ============================================================
 *  AtelierEngagement — the row-2 orchestrator
 *  ============================================================ */

export default function AtelierEngagement({ stats }: AtelierEngagementProps) {
  const gradId = useId();

  // Derive the 4th metric: engagement rate.
  // Convention: (likes + comments + shares) / views for the current
  // period. Series lengths are equal (7d), so summing all three
  // arrays and dividing by the sum of views gives one weekly
  // engagement rate as a fraction.
  const sumSeries = (s: number[]) => s.reduce((a, b) => a + b, 0);
  const windowed = (s: number[], start: number) =>
    s.slice(start, s.length).reduce((a, b) => a + b, 0);
  const half = Math.max(1, Math.floor(stats.views.data.length / 2));

  const weeklyViews = sumSeries(stats.views.data);
  const totalEng =
    sumSeries(stats.likes.data) +
    sumSeries(stats.comments.data) +
    sumSeries(stats.shares.data);
  const engRate = weeklyViews > 0 ? totalEng / weeklyViews : 0;

  const prevHalfViews = windowed(stats.views.data, 0) - windowed(stats.views.data, half);
  const prevHalfEng =
    windowed(stats.likes.data, 0) -
    windowed(stats.likes.data, half) +
    (windowed(stats.comments.data, 0) - windowed(stats.comments.data, half)) +
    (windowed(stats.shares.data, 0) - windowed(stats.shares.data, half));
  const prevRate = prevHalfViews > 0 ? prevHalfEng / prevHalfViews : 0;
  const engDeltaPp = (engRate - prevRate) * 100;

  const commentIntensity = Math.min(1, sumSeries(stats.comments.data) / Math.max(1, weeklyViews * 0.05));
  const weeklyLikes = sumSeries(stats.likes.data);
  const weeklyComments = sumSeries(stats.comments.data);
  const weeklyShares = sumSeries(stats.shares.data);

  return (
    <section className="at-tile at-engagement" aria-label="تعامل مخاطبان">
      <div className="at-engagement__ornament" aria-hidden />

      <header className="at-engagement__head">
        <div className="at-head">
          <span className="at-head__ico at-head__ico--heart" aria-hidden>
            <HiOutlineHeart className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">تعامل مخاطبان</h2>
            <p className="at-head__sub">لایک‌ها، نظرات و اشتراک‌گذاری — هفتگی</p>
          </div>
        </div>
        <span className="at-engagement__live">
          <span className="at-engagement__live-dot" aria-hidden />
          <HiOutlineBolt className="w-3 h-3" aria-hidden />
          <span>زنده · ۷ روز اخیر</span>
        </span>
      </header>

      <div className="at-engagement__body">
        {/* ---------- ROW A: HERO HEART (left, 7/12) + RATE (right, 5/12) ---------- */}
        <div className="at-eng-hero">
          <div className="at-eng-hero__viz">
            <HeroHeart data={stats.likes.data} gradId={`at-hero-heart-${gradId}`} />
          </div>

          <div className="at-eng-hero__meta">
            <span className="at-eng-hero__eyebrow">
              <HiOutlineHeart className="w-3 h-3" aria-hidden />
              <span>لایک‌ها · کل</span>
            </span>
            <span
              className="at-eng-hero__value tabular-nums"
              aria-label={`${fmt(stats.likes.total)} لایک`}
            >
              {fmt(stats.likes.total)}
            </span>
            <span className="at-eng-hero__sub tabular-nums">
              <CountUp value={weeklyLikes} duration={1100} />
              <span className="at-eng-hero__sub-suffix">لایک در هفتهٔ اخیر</span>
            </span>
            <TrendPill
              trend={pickTrend(stats.likes.data).trend}
              delta={pickTrend(stats.likes.data).delta}
            />
          </div>
        </div>

        <div className="at-eng-rate-card">
          <div className="at-eng-rate-card__head">
            <span className="at-eng-rate-card__label">
              <HiOutlineBolt className="w-3.5 h-3.5" aria-hidden />
              <span>نرخ تعامل</span>
            </span>
            <span className="at-eng-rate-card__chip">شاخص کلیدی</span>
          </div>

          <div className="at-eng-rate-card__viz">
            <EngagementRateGauge
              value={engRate}
              gradId={`at-rate-${gradId}`}
              delta={Math.sign(engDeltaPp)}
            />
          </div>

          <div className="at-eng-rate-card__body">
            <span className="at-eng-rate-card__narrative">
              از هر ۱۰۰ بازدید،{' '}
              <strong className="tabular-nums">
                {(engRate * 100).toFixed(1)}
              </strong>{' '}
              تعامل ثبت شده
            </span>
            <TrendPill
              trend={
                Math.abs(engDeltaPp) < 0.05
                  ? 'flat'
                  : engDeltaPp > 0
                    ? 'up'
                    : 'down'
              }
              delta={engDeltaPp}
              suffix="pp"
            />
          </div>
        </div>

        {/* ---------- ROW B: COMMENTS + SHARES strip ---------- */}
        <div className="at-eng-secondary">
          <div className="at-eng-secondary__cell">
            <div className="at-eng-secondary__viz" aria-hidden>
              <CommentBubbleStack intensity={commentIntensity} />
            </div>
            <div className="at-eng-secondary__meta">
              <span className="at-eng-secondary__label">
                <HiOutlineChatBubbleLeftRight className="w-3 h-3" aria-hidden />
                <span>نظرات</span>
              </span>
              <span className="at-eng-secondary__value tabular-nums">
                <CountUp value={stats.comments.new} duration={1000} />
              </span>
              <span className="at-eng-secondary__sub tabular-nums">
                {fmtCompact(weeklyComments)} این هفته
              </span>
              <TrendPill
                trend={pickTrend(stats.comments.data).trend}
                delta={pickTrend(stats.comments.data).delta}
              />
            </div>
          </div>

          <div className="at-eng-secondary__divider" aria-hidden />

          <div className="at-eng-secondary__cell">
            <div className="at-eng-secondary__viz" aria-hidden>
              <ShareRipple count={stats.shares.total} />
            </div>
            <div className="at-eng-secondary__meta">
              <span className="at-eng-secondary__label">
                <HiOutlineShare className="w-3 h-3" aria-hidden />
                <span>اشتراک‌گذاری</span>
              </span>
              <span className="at-eng-secondary__value tabular-nums">
                <CountUp value={stats.shares.total} duration={1000} />
              </span>
              <span className="at-eng-secondary__sub tabular-nums">
                {fmtCompact(weeklyShares)} این هفته
              </span>
              <TrendPill
                trend={pickTrend(stats.shares.data).trend}
                delta={pickTrend(stats.shares.data).delta}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}