'use client';

/**
 * AtelierHero — dramatic greeting + anchor number + radial pulse.
 *
 * Layout (desktop):
 *   ┌──────────────────────────────┬──────────────┐
 *   │ eyebrow  · live dot         │              │
 *   │ greeting, name              │  radial      │
 *   │ today views (oversized)     │  pulse       │
 *   │ delta chip + meta           │              │
 *   │ sparkline + CTAs            │              │
 *   └──────────────────────────────┴──────────────┘
 *
 * On mobile the pulse moves below the metrics and stretches full width.
 * Persian date renders in poetic form above the greeting; Persian
 * numerals everywhere; Vazirmatn carries the typographic weight.
 *
 * A subtle geometric SVG (eight-point star + hairline arcs) sits in
 * the upper-right of the hero panel as a brand mark — it rotates very
 * slowly via CSS keyframes (5 minute loop).
 */

import CountUp from '@/components/Dashboard/primitives/CountUp';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineBolt,
  HiOutlineMinus,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { fmt, persianLongDate, pickTrend, timeOfDay } from '../utils';
import AtelierPulse from './AtelierPulse';

interface AtelierHeroProps {
  todayViews: number;
  totalViews: number;
  /** 7-element weekly views series. */
  spark: number[];
  /** Number of published posts (used as a "right-now" anchor). */
  publishedTotal: number;
}

function HeroSpark({ data, gradId }: { data: number[]; gradId: string }) {
  const pathRef = useRef<SVGPathElement>(null);
  const width = 600;
  const height = 84;

  useEffect(() => {
    if (!data.length || typeof window === 'undefined') return;
    const el = pathRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.strokeDashoffset = '0';
      return;
    }
    el.style.strokeDashoffset = '1';
    const duration = 1300;
    let raf = 0;
    let start: number | null = null;
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

  if (!data.length) return null;
  const allZero = data.every((v) => v === 0);
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const span = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = allZero ? height - 4 : height - 8 - ((v - min) / span) * (height - 16);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = allZero ? '' : `${line} L${width},${height} L0,${height} Z`;

  // Last point
  const last = pts[pts.length - 1];
  const lastX = last?.[0] ?? 0;
  const lastY = last?.[1] ?? height - 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="at-hero__spark"
      role="img"
      aria-label="روند هفتگی بازدید"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gradId})`} />}
      {allZero && (
        <line
          x1="0"
          y1={height - 4}
          x2={width}
          y2={height - 4}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="6 4"
          opacity={0.4}
        />
      )}
      <path
        ref={pathRef}
        d={line}
        fill="none"
        stroke="var(--at-fg)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 1, opacity: allZero ? 0.4 : 1 }}
      />
      {!allZero && (
        <>
          <circle
            cx={lastX}
            cy={lastY}
            r={4}
            fill="var(--at-bg)"
            stroke="var(--at-accent)"
            strokeWidth={2}
          />
          <circle cx={lastX} cy={lastY} r={1.5} fill="var(--at-accent)" />
        </>
      )}
    </svg>
  );
}

export default function AtelierHero({
  todayViews,
  totalViews,
  spark,
  publishedTotal,
}: AtelierHeroProps) {
  const user = useCurrentUser();
  const gradId = useId();
  const [hour, setHour] = useState(12);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setHour(d.getHours());
      setNow(d);
    };
    update();
    const t = window.setInterval(update, 60_000);
    return () => window.clearInterval(t);
  }, []);

  const greeting = timeOfDay(hour);
  const { trend, delta } = pickTrend(spark);
  const TrendIcon =
    trend === 'up'
      ? HiOutlineArrowUpRight
      : trend === 'down'
        ? HiOutlineArrowDownRight
        : HiOutlineMinus;

  return (
    <section className="at-tile at-hero" aria-label="خلاصهٔ امروز">
      {/* Brand mark — eight-point star + concentric arcs, very slow rotation */}
      <div className="at-hero__mark" aria-hidden>
        <svg viewBox="0 0 200 200" className="at-hero__mark-svg">
          <defs>
            <radialGradient id="at-mark-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.18" />
              <stop offset="60%" stopColor="var(--at-gold)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--at-gold)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#at-mark-grad)" />
          <g className="at-hero__mark-spin">
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.35"
            />
            <circle
              cx="100"
              cy="100"
              r="74"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.25"
            />
            {/* 8-point star */}
            <path
              d="M100 18 L114 86 L182 100 L114 114 L100 182 L86 114 L18 100 L86 86 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.9"
              opacity="0.5"
            />
            <path
              d="M100 38 L108 92 L162 100 L108 108 L100 162 L92 108 L38 100 L92 92 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.3"
            />
          </g>
        </svg>
      </div>

      <header className="at-hero__head">
        <span className="at-hero__eyebrow">
          <span className="at-hero__dot" aria-hidden />
          <HiOutlineBolt className="w-3 h-3" aria-hidden />
          <span>پیشخوان · {now ? persianLongDate(now) : persianLongDate()}</span>
        </span>
        <span className="at-hero__pillar">
          <HiOutlineSparkles className="w-3 h-3" aria-hidden />
          <span>Atelier ۲۰۲۶</span>
        </span>
      </header>

      <h1 className="at-hero__greeting">
        {greeting}
        <span className="at-hero__greeting-sep" aria-hidden>
          ،
        </span>
        <em className="at-hero__name">{user?.name ?? 'کاربر'}</em>
      </h1>

      <div className="at-hero__metric">
        <div className="at-hero__metric-text">
          <span
            className="at-hero__value tabular-nums"
            aria-label={`${fmt(todayViews)} بازدید امروز`}
          >
            <CountUp value={todayViews} duration={1300} />
          </span>
          <span className="at-hero__unit">بازدید امروز</span>
          <div className="at-hero__meta">
            <span className={cn('at-hero__delta', `is-${trend}`)}>
              <TrendIcon className="w-3 h-3" aria-hidden />
              <span className="tabular-nums">{`${delta > 0 ? '+' : ''}${delta.toFixed(1)}٪`}</span>
            </span>
            <span>نسبت به نیمهٔ قبلی</span>
            <span aria-hidden>·</span>
            <span>
              از <strong className="tabular-nums">{fmt(totalViews)}</strong> بازدید کل
            </span>
          </div>
        </div>
        <div className="at-hero__metric-pulse">
          <AtelierPulse
            value={todayViews}
            max={Math.max(totalViews, todayViews, 1)}
            label="پیشرفت بازدید امروز نسبت به کل"
          />
          <span className="at-hero__pulse-cap">سهم امروز</span>
        </div>
      </div>

      <HeroSpark data={spark} gradId={`at-hero-${gradId}`} />

      <div className="at-hero__actions">
        <Link href="/dashboard/posts/create" className="at-hero__cta" aria-label="نوشتن پست جدید">
          <HiOutlinePencilSquare className="w-3.5 h-3.5" aria-hidden />
          <span>نوشتن پست جدید</span>
        </Link>
        <Link href="/dashboard/posts" className="at-hero__ghost">
          <span>همهٔ پست‌ها</span>
          <span className="at-hero__ghost-meta tabular-nums">{fmt(publishedTotal)} مورد</span>
        </Link>
      </div>
    </section>
  );
}
