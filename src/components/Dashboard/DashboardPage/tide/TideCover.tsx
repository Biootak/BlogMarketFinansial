'use client';

/**
 * TideCover — TIDE 2026 (July 1) editorial split hero.
 *
 * A magazine-cover-style hero. The layout is a 12-column asymmetric
 * split:
 *
 *   ┌──────────────────────────────┬──────────────────────────┐
 *   │  Editorial masthead          │  Satellite KPI chips     │
 *   │  ─ greeting                  │  ┌──────┬──────┐         │
 *   │  ─ today's headline number   │  │ views│ likes│         │
 *   │  ─ live sparkline + delta    │  ├──────┼──────┤         │
 *   │  ─ primary CTA cluster       │  │ comm │share │         │
 *   │  ─ footer: meta + nav hint   │  └──────┴──────┘         │
 *   └──────────────────────────────┴──────────────────────────┘
 *
 * Differentiation from ATLAS:
 *   - Cover puts greeting + headline + sparkline + CTAs in ONE column
 *     (not split across hero/hero-rail).
 *   - Satellite chips are 2×2, not a vertical stack.
 *   - Background uses a layered radial wash instead of inline gradient.
 *   - The headline number uses `font-feature-settings: 'tnum'` for
 *     perfectly tabular numerals even at extreme sizes.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { MagneticButton, NoiseTexture } from '@/components/Dashboard/primitives';
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
  HiOutlineSparkles,
} from 'react-icons/hi2';
import type { Range } from '../overview/WorkspaceToolbar';

type Trend = 'up' | 'down' | 'flat';

interface TideCoverProps {
  stats: {
    views: { today: number; data: number[] };
    comments: { new: number; data: number[] };
    shares: { total: number; data: number[] };
    likes: { total: number; data: number[] };
    publishedPosts: { total: number; data: number[] };
    drafts: { total: number; data: number[] };
  };
  viewStats: {
    labels: string[];
    data: number[];
    totalViews: number;
    todayViews: number;
  };
  range: Range;
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
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

/* ─── Inline sparkline ───────────────────────────────────────────── */

interface CoverSparklineProps {
  data: number[];
  stroke: string;
  gradId: string;
  width?: number;
  height?: number;
}

function CoverSparkline({ data, stroke, gradId, width = 520, height = 88 }: CoverSparklineProps) {
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
    const duration = 1400;
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
    const y = height - 6 - ((v - min) / span) * (height - 12);
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
      className="tide-cover__spark"
      role="img"
      aria-label="نمودار روند بازدید"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.42} />
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

/* ─── Satellite KPI chip ─────────────────────────────────────────── */

interface ChipProps {
  label: string;
  value: number;
  tone: 'rose' | 'emerald' | 'cyan' | 'amber';
  idx: number;
}

function fmtNumber(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function SatelliteChip({ label, value, tone, idx }: ChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 + idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={cn('tide-chip', `tide-chip--${tone}`)}
    >
      <span className="tide-chip__dot" aria-hidden />
      <span className="tide-chip__label">{label}</span>
      <span className="tide-chip__value tabular-nums">
        <CountUp value={value} duration={900} />
      </span>
    </motion.div>
  );
}

/* ─── Cover ──────────────────────────────────────────────────────── */

export default function TideCover({ stats, viewStats, userRole: _userRole }: TideCoverProps) {
  const user = useCurrentUser();
  const [hour, setHour] = useState<number>(12);
  const gradId = useId();

  useEffect(() => {
    const update = () => setHour(new Date().getHours());
    update();
    const t = window.setInterval(update, 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  const greeting = timeOfDay(hour);
  const { trend, delta } = pickTrend(viewStats.data);

  const TrendIcon =
    trend === 'up'
      ? HiOutlineArrowUpRight
      : trend === 'down'
        ? HiOutlineArrowDownRight
        : HiOutlineMinus;

  // 2x2 chip grid driven by stats
  const chipData: ChipProps[] = [
    { label: 'بازدید امروز', value: stats.views.today, tone: 'cyan', idx: 0 },
    { label: 'لایک‌ها', value: stats.likes.total, tone: 'rose', idx: 1 },
    { label: 'نظرات', value: stats.comments.new, tone: 'emerald', idx: 2 },
    { label: 'اشتراک‌گذاری', value: stats.shares.total, tone: 'amber', idx: 3 },
  ];

  return (
    <section className="tide-cover" aria-label="خلاصه وضعیت">
      {/* Layered ambient wash */}
      <div className="tide-cover__wash" aria-hidden />
      <NoiseTexture opacity={0.022} />

      <div className="tide-cover__inner">
        {/* ── Editorial column ────────────────────────────────────── */}
        <div className="tide-cover__editorial">
          <header className="tide-cover__masthead">
            <span className="tide-cover__eyebrow">
              <HiOutlineSparkles className="w-3.5 h-3.5" />
              <span>پیشخوان · ۱۴۰۵</span>
            </span>
            <h1 className="tide-cover__title">
              <span className="tide-cover__title-greeting">{greeting}،&nbsp;</span>
              <em className="tide-cover__title-name">{user?.name ?? 'کاربر'}</em>
            </h1>
            <p className="tide-cover__subtitle">
              نمای زنده از وبلاگ — شاخص‌های کلیدی، جریان فعالیت و برنامه‌ی انتشار در یک نگاه. کلید{' '}
              <kbd className="tide-cover__kbd">⌘</kbd>
              <kbd className="tide-cover__kbd">K</kbd> برای جستجوی سریع.
            </p>
          </header>

          {/* Headline number */}
          <div className="tide-cover__anchor">
            <p
              className="tide-cover__number"
              aria-label={`${viewStats.todayViews.toLocaleString('fa-IR')} بازدید امروز`}
            >
              <CountUp value={viewStats.todayViews} duration={1100} />
            </p>
            <div className="tide-cover__anchor-meta">
              <span className="tide-cover__anchor-label">بازدید امروز</span>
              <span className={cn('tide-cover__anchor-delta', `is-${trend}`)}>
                <TrendIcon className="w-3.5 h-3.5" aria-hidden />
                <span>{`${delta > 0 ? '+' : ''}${delta.toFixed(1)}٪`}</span>
              </span>
              <span className="tide-cover__anchor-total">
                از {fmtNumber(viewStats.totalViews)} کل
              </span>
            </div>
          </div>

          <div className="tide-cover__chart">
            <CoverSparkline
              data={viewStats.data}
              stroke="oklch(from var(--tide-accent) l c h)"
              gradId={`cover-spark-${gradId}`}
            />
          </div>

          <div className="tide-cover__actions">
            <MagneticButton
              asChild
              magnetRange={6}
              type="button"
              className={cn(
                'group inline-flex items-center gap-2.5 ps-3 pe-4 h-11 rounded-2xl font-semibold text-sm text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(18%_0.045_260)]',
                '!hover:scale-100 active:!scale-100',
              )}
              style={{
                background:
                  'linear-gradient(135deg, oklch(60% 0.18 175) 0%, oklch(72% 0.14 220) 100%)',
                boxShadow:
                  '0 1px 0 oklch(100% 0 0 / 0.18) inset, 0 12px 32px -14px oklch(55% 0.18 175 / 0.55)',
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

            <Link href="/dashboard/posts" className="tide-cover__ghost">
              <span>مشاهده همه پست‌ها</span>
            </Link>
          </div>
        </div>

        {/* ── Satellite column ────────────────────────────────────── */}
        <aside className="tide-cover__satellite" aria-label="شاخص‌های ماهواره‌ای">
          <div className="tide-cover__satellite-grid">
            {chipData.map((chip) => (
              <SatelliteChip key={chip.label} {...chip} />
            ))}
          </div>

          <div className="tide-cover__satellite-foot">
            <span className="tide-cover__satellite-foot-dot" aria-hidden />
            <span>به‌روزرسانی زنده</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
