'use client';

/**
 * HeroTile — NOVA bento anchor tile (2026 spatial-depth command deck).
 *
 * The largest tile in the mosaic. Unlike TIDE's two-column magazine cover,
 * this is a single deep-glass panel that tilts in 3D toward the cursor
 * (`useTilt`), carries the day's anchor number (CountUp), a live sparkline,
 * and the primary "write post" CTA. The tilt gives the deck genuine spatial
 * depth without a 3D engine — a signature 2026 move.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { MagneticButton, NoiseTexture, Spotlight } from '@/components/Dashboard/primitives';
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
import { useTilt } from '../hooks/useTilt';

type Trend = 'up' | 'down' | 'flat';

interface HeroTileProps {
  todayViews: number;
  totalViews: number;
  spark: number[];
}

function pickTrend(data: number[]): { trend: Trend; delta: number } {
  if (data.length < 2) return { trend: 'flat', delta: 0 };
  const half = Math.max(1, Math.floor(data.length / 2));
  const recent = data.slice(-half).reduce((a, b) => a + b, 0);
  const prev = data.slice(0, -half).reduce((a, b) => a + b, 0);
  if (prev === 0 && recent === 0) return { trend: 'flat', delta: 0 };
  if (prev === 0) return { trend: 'up', delta: 100 };
  const d = ((recent - prev) / prev) * 100;
  const t: Trend = Math.abs(d) < 1 ? 'flat' : d > 0 ? 'up' : 'down';
  return { trend: t, delta: d };
}

function timeOfDay(hour: number) {
  if (hour < 5) return 'بامداد بخیر';
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'بعدازظهر بخیر';
  if (hour < 20) return 'عصر بخیر';
  return 'شب بخیر';
}

function fmt(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n);
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
  const tiltRef = useTilt<HTMLDivElement>({ max: 5 });
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

  return (
    <section className="nova-tile nova-tile--hero" data-tone="primary" aria-label="خلاصهٔ امروز">
      <div ref={tiltRef} className="nova-hero__tilt">
        <Spotlight tone="indigo" size={560} />
        <NoiseTexture opacity={0.02} />
        <div className="nova-hero__wash" aria-hidden />

        <div className="nova-hero__top">
          <span className="nova-hero__eyebrow">
            <HiOutlineBolt className="w-3.5 h-3.5" />
            <span>پیشخوان زنده · ۱۴۰۵</span>
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
          <MagneticButton
            asChild
            magnetRange={6}
            className={cn(
              'group inline-flex items-center gap-2.5 ps-3 pe-4 h-11 rounded-2xl font-semibold text-sm text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2',
              '!hover:scale-100 active:!scale-100',
            )}
            style={{
              background: 'linear-gradient(135deg, oklch(60% 0.2 285) 0%, oklch(68% 0.16 232) 100%)',
              boxShadow:
                '0 1px 0 oklch(100% 0 0 / 0.2) inset, 0 14px 34px -14px oklch(58% 0.2 285 / 0.6)',
            }}
          >
            <Link href="/dashboard/posts/create" aria-label="نوشتن پست جدید">
              <span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-white/15 group-hover:bg-white/25 transition-colors">
                <HiOutlinePencilSquare className="w-3.5 h-3.5" />
              </span>
              <span>نوشتن پست جدید</span>
              <span
                aria-hidden
                className="hidden sm:inline-flex items-center gap-0.5 ms-1 text-[10px] font-mono text-white/70"
              >
                <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">⌘</kbd>
                <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5">N</kbd>
              </span>
            </Link>
          </MagneticButton>

          <Link href="/dashboard/posts" className="nova-hero__ghost">
            <span>همهٔ پست‌ها</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
