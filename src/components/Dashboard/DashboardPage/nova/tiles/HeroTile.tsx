'use client';

/**
 * HeroTile — NOVA bento anchor tile (v2 "Quiet Confidence").
 *
 * The largest tile in the mosaic. Clean solid surface with typography-
 * driven hierarchy. No glassmorphism, no 3D tilt, no Spotlight, no
 * NoiseTexture. Just the day's anchor number, a sparkline, and a
 * clear CTA.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
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
} from 'react-icons/hi2';
import { pickTrend, fmt, timeOfDay } from '../utils';

interface HeroTileProps {
  todayViews: number;
  totalViews: number;
  spark: number[];
}

/** Animated area sparkline that draws itself on mount. */
function HeroSpark({ data, gradId }: { data: number[]; gradId: string }) {
  const pathRef = useRef<SVGPathElement>(null);
  const width = 560;
  const height = 96;

  useEffect(() => {
    if (!data.length || typeof window === 'undefined') return;
    const el = pathRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.strokeDashoffset = '0';
      return;
    }
    el.style.strokeDashoffset = '1';
    const duration = 1500;
    let raf = 0;
    let start: number | null = null;
    const ease = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
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
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const span = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = height - 6 - ((v - min) / span) * (height - 14);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="nova-hero__spark"
      role="img"
      aria-label="روند بازدید"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--nova-primary)" stopOpacity={0.4} />
          <stop offset="100%" stopColor="var(--nova-primary)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        ref={pathRef}
        d={line}
        fill="none"
        stroke="var(--nova-primary)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
      />
    </svg>
  );
}

export default function HeroTile({ todayViews, totalViews, spark }: HeroTileProps) {
  const user = useCurrentUser();
  const gradId = useId();
  const [hour, setHour] = useState(12);

  useEffect(() => {
    const update = () => setHour(new Date().getHours());
    update();
    const t = window.setInterval(update, 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  const greeting = timeOfDay(hour);
  const { trend, delta } = pickTrend(spark);
  const TrendIcon =
    trend === 'up' ? HiOutlineArrowUpRight : trend === 'down' ? HiOutlineArrowDownRight : HiOutlineMinus;

  // Dynamic Jalali year
  const jalaliYear = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date());

  return (
    <section className="nova-tile nova-tile--hero" data-tone="primary" aria-label="خلاصهٔ امروز">
      <div className="nova-hero__content">
        <div className="nova-hero__top">
          <span className="nova-hero__eyebrow">
            <HiOutlineBolt className="w-3.5 h-3.5" />
            <span>پیشخوان زنده · {jalaliYear}</span>
          </span>
          <h1 className="nova-hero__greeting">
            {greeting}،<em className="nova-hero__name">{user?.name ?? 'کاربر'}</em>
          </h1>
        </div>

        <div className="nova-hero__anchor">
          <p className="nova-hero__number" aria-label={`${fmt(todayViews)} بازدید امروز`}>
            <CountUp value={todayViews} duration={1200} />
          </p>
          <div className="nova-hero__anchor-meta">
            <span className="nova-hero__anchor-label">بازدید امروز</span>
            <span className={cn('nova-hero__delta', `is-${trend}`)}>
              <TrendIcon className="w-3.5 h-3.5" aria-hidden />
              <span className="tabular-nums">{`${delta > 0 ? '+' : ''}${delta.toFixed(1)}٪`}</span>
            </span>
            <span className="nova-hero__anchor-total">از {fmt(totalViews)} بازدید کل</span>
          </div>
        </div>

        <div className="nova-hero__chart">
          <HeroSpark data={spark} gradId={`nova-hero-${gradId}`} />
        </div>

        <div className="nova-hero__actions">
          <Link
            href="/dashboard/posts/create"
            className="nova-hero__cta"
            aria-label="نوشتن پست جدید"
          >
            <span className="nova-hero__cta-icon">
              <HiOutlinePencilSquare className="w-3.5 h-3.5" />
            </span>
            <span>نوشتن پست جدید</span>
            <span
              aria-hidden
              className="hidden sm:inline-flex items-center gap-0.5 ms-1 text-[10px] font-mono opacity-70"
            >
              <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">⌘</kbd>
              <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">N</kbd>
            </span>
          </Link>

          <Link href="/dashboard/posts" className="nova-hero__ghost">
            <span>همهٔ پست‌ها</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
