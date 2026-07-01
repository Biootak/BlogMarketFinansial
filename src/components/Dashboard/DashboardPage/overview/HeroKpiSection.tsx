'use client';

/**
 * HeroKpiSection — 2026 (July 1) ATLAS editorial spread.
 *
 * Renders the LEFT (φ²-width) column of the hero composition. The
 * editorial layout is a vertical rhythm of:
 *
 *   1. Eyebrow + headline (greeting + user name)
 *   2. Subtitle (one-sentence context)
 *   3. Massive anchor number (today's views) — the geometric centerpiece
 *      of the entire dashboard, sized at clamp(3.4rem, 9.2vw, 6.8rem).
 *   4. Sparkline (mini trend, 64px tall)
 *   5. Primary CTA cluster
 *
 * Mini-KPIs (likes / comments / shares / drafts) live in HeroRail
 * (inside DashboardShell) so the editorial column stays editorial.
 *
 * Modern techniques
 *   • @starting-style + CSS transitions for the anchor number entry
 *     animation (no JS measurement, declarative fade-in).
 *   • OKLCH colors via relative color syntax in the CSS layer.
 *   • Gradient-text via background-clip for the user-name accent.
 *   • prefers-reduced-motion: animation durations collapse to 0ms.
 *
 * Accessibility
 *   • Real <h1> for the greeting so screen readers announce the page
 *     title.
 *   • The KPI number is wrapped in a <p> with `aria-label` so the
 *     spoken form is "X بازدید امروز" rather than "X".
 *   • All actions are <button> / <Link> with visible focus rings.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { GeometricField, MagneticButton, NoiseTexture } from '@/components/Dashboard/primitives';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineMinus,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import type { Range } from './WorkspaceToolbar';

interface Stats {
  views: { today: number; data: number[] };
  comments: { new: number; data: number[] };
  shares: { total: number; data: number[] };
  likes: { total: number; data: number[] };
  publishedPosts: { total: number; data: number[] };
  drafts: { total: number; data: number[] };
}

interface ViewStats {
  labels: string[];
  data: number[];
  totalViews: number;
  todayViews: number;
}

interface HeroKpiSectionProps {
  stats: Stats;
  viewStats: ViewStats;
  range: Range;
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

type Trend = 'up' | 'down' | 'flat';

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

/* ─── Mini sparkline (inline SVG, no chart.js) ─────────────────────── */

interface MiniSparklineProps {
  data: number[];
  stroke: string;
  gradId: string;
  width?: number;
  height?: number;
}

function MiniSparkline({ data, stroke, gradId, width = 420, height = 64 }: MiniSparklineProps) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!data.length) return;
    if (typeof window === 'undefined') return;
    const el = pathRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.strokeDashoffset = '0';
      return;
    }
    el.style.strokeDashoffset = '1';
    const duration = 1200;
    let raf = 0;
    let start: number | null = null;
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      el.style.strokeDashoffset = String(1 - easeOutExpo(t));
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
    const y = height - 4 - ((v - min) / span) * (height - 8);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="dash-atlas__hero-sparkline"
      role="img"
      aria-label="نمودار روند بازدید"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        ref={pathRef}
        d={line}
        fill="none"
        stroke={stroke}
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

function DeltaBadge({ trend, delta }: { trend: Trend; delta: number }) {
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const Icon = isUp ? HiOutlineArrowUpRight : isDown ? HiOutlineArrowDownRight : HiOutlineMinus;
  const tone = isUp
    ? 'dash-atlas__rail-stat-delta--up'
    : isDown
      ? 'dash-atlas__rail-stat-delta--down'
      : '';
  return (
    <span className={cn('dash-atlas__rail-stat-delta tabular-nums gap-1', tone)}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      <span>{`${delta > 0 ? '+' : ''}${delta.toFixed(1)}٪`}</span>
    </span>
  );
}

/* ─── Hero main ────────────────────────────────────────────────────── */

export default function HeroKpiSection({ stats: _stats, viewStats }: HeroKpiSectionProps) {
  const user = useCurrentUser();
  const [hour, setHour] = useState<number>(12);
  const gradId = useId();

  useEffect(() => {
    const update = () => setHour(new Date().getHours());
    update();
    const t = window.setInterval(update, 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Detect prefers-reduced-motion on mount.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const greeting = timeOfDay(hour);
  const { trend, delta } = pickTrend(viewStats.data);

  return (
    <motion.section
      id="dash-hero-kpi"
      aria-label="خلاصه وضعیت"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-full flex flex-col gap-4"
    >
      {/* Floating geometric primitives — Fibonacci punctuation */}
      <GeometricField density="rich" />

      <header className="dash-atlas__hero-headline relative z-10">
        <span className="dash-atlas__hero-eyebrow">
          <span>۰۱ · پیشخوان</span>
        </span>
        <h1
          className="dash-atlas__hero-title"
          style={
            reduceMotion
              ? undefined
              : { animation: 'atlas-reveal 520ms var(--atlas-ease-out) 60ms both' }
          }
        >
          <span style={{ opacity: 0.78 }}>{greeting}،&nbsp;</span>
          <em>{user?.name ?? 'کاربر'}</em>
        </h1>
        <p className="dash-atlas__hero-sub">
          یک نمای ۳۰ ثانیه‌ای از وبلاگ — شاخص‌ها، فعالیت‌های اخیر و برنامه‌ی انتشار. کلید{' '}
          <kbd className="font-mono text-[0.7rem] mx-1 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15">
            ⌘ K
          </kbd>{' '}
          برای جستجوی سریع.
        </p>
      </header>

      {/* Anchor number — the geometric centerpiece of the dashboard */}
      <div className="dash-atlas__hero-anchor relative z-10">
        <p
          className="dash-atlas__hero-number"
          aria-label={`${viewStats.todayViews.toLocaleString('fa-IR')} بازدید امروز`}
        >
          <CountUp value={viewStats.todayViews} duration={900} />
        </p>
        <div className="dash-atlas__hero-number-meta">
          <span className="dash-atlas__hero-number-label">بازدید امروز</span>
          <DeltaBadge trend={trend} delta={delta} />
          <span className="dash-atlas__hero-number-trend">
            از {viewStats.totalViews.toLocaleString('fa-IR')} بازدید کل
          </span>
        </div>
      </div>

      <div className="relative z-10">
        <MiniSparkline
          data={viewStats.data}
          stroke="oklch(from var(--atlas-accent) l c h)"
          gradId={`hero-spark-${gradId}`}
        />
      </div>

      <div className="dash-atlas__hero-actions relative z-10 mt-auto">
        <MagneticButton
          asChild
          magnetRange={5}
          type="button"
          className={cn(
            'group inline-flex items-center gap-2.5 ps-2.5 pe-3.5 h-11 rounded-xl font-semibold text-sm text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(18%_0.045_260)]',
            '!hover:scale-100 active:!scale-100',
          )}
          style={{
            background: 'linear-gradient(135deg, oklch(64% 0.16 280) 0%, oklch(72% 0.14 60) 100%)',
            boxShadow:
              '0 1px 0 oklch(100% 0 0 / 0.18) inset, 0 8px 24px -10px oklch(55% 0.18 280 / 0.45)',
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
      </div>

      <NoiseTexture opacity={0.025} />
    </motion.section>
  );
}
