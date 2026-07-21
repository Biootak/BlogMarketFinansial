'use client';

/**
 * KpiGrid — 2026 bento.
 *
 * Asymmetric 12-column layout with a hero pane (Today views + sparkline)
 * and four compact panes (Likes, Comments, Shares, Drafts). Each compact
 * pane shows:
 *   • A subtle 12-point sparkline (no library)
 *   • A delta badge with Persian numerals
 *   • The metric label (overload-tolerant, ellipsises)
 *
 * Modern techniques:
 *   • CSS subgrid is used inside each compact pane so the label / value /
 *     sparkline / delta lines up across cards regardless of label length.
 *   • The grid container is a *container query* itself (`dash-bento2`) so
 *     each pane can switch its inner typography based on width.
 *   • `.dash-pane` uses `content-visibility: auto` so off-screen KPIs do
 *     not pay paint cost on first scroll.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import {
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineHeart,
  HiOutlinePencilSquare,
  HiOutlineShare,
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

interface KpiGridProps {
  stats: Stats;
  viewStats: ViewStats;
  range?: Range;
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

function MiniSparkline({
  data,
  stroke,
  gradId,
  range,
}: {
  data: number[];
  stroke: string;
  gradId: string;
  range?: Range;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const w = 100;
  const h = 28;

  // Compute derived values — needed for useEffect dependency below
  const min = data.length ? Math.min(...data, 0) : 0;
  const max = data.length ? Math.max(...data, 1) : 1;
  const span = max - min || 1;
  const stepW = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => {
    const x = i * stepW;
    const y = h - 2 - ((v - min) / span) * (h - 4);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;

  // useEffect must be before early return (Rules of Hooks)
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
    const duration = 800;
    let raf = 0;
    let start: number | null = null;
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

    const animate = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      el.style.strokeDashoffset = String(1 - easeOutExpo(t));
      if (t < 1) {
        raf = window.requestAnimationFrame(animate);
      }
    };

    raf = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(raf);
  }, [range, line, data.length]);

  if (!data.length) {
    return <div className="dash-skeleton h-7 w-full" aria-hidden />;
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-7" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        ref={pathRef}
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
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
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  // 2026-06-26: monochrome — semantic meaning lives in the arrow icon
  // (ArrowUpRight / ArrowDownRight / Minus) and the +/- glyph, not in the
  // pill color. dash-trend--{up,down,flat} collapse to a single slate tone
  // in both light and dark modes (see globals.css §1.6).
  return (
    <span className={cn('dash-trend dash-trend--flat text-[11px] gap-1 tabular-nums')}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      <span>{`${delta > 0 ? '+' : ''}${delta.toFixed(1)}٪`}</span>
    </span>
  );
}

interface CompactProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string; // dash-ico--*
  stroke: string; // oklch()
  data: number[];
  suffix?: string;
  range?: Range;
}

function CompactPane({ title, value, icon, iconClass, stroke, data, suffix, range }: CompactProps) {
  const gradId = useId();
  const { trend, delta } = pickTrend(data);
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="dash-pane dash-pane--compact"
      aria-label={`${title}: ${value.toLocaleString('fa-IR')}`}
    >
      <header className="dash-pane__head">
        <span className={cn('dash-pane__title')}>
          <span className={cn('dash-ico', iconClass, 'w-9 h-9 shrink-0')} aria-hidden>
            {icon}
          </span>
          <span className="dash-pane__title-text">{title}</span>
        </span>
        <DeltaBadge trend={trend} delta={delta} />
      </header>

      <div>
        <p className="dash-pane__value">
          <CountUp value={value} duration={600} />
          {suffix && (
            <span className="text-base font-medium text-slate-500 dark:text-slate-400 ms-1.5">
              {suffix}
            </span>
          )}
        </p>
        <p className="dash-pane__sub">هفت روز اخیر</p>
      </div>

      <div className="-mx-2">
        <MiniSparkline data={data} stroke={stroke} gradId={`g-${gradId}`} range={range} />
      </div>
    </motion.article>
  );
}

export default function KpiGrid({ stats, viewStats, range }: KpiGridProps) {
  const { trend: heroTrend, delta: heroDelta } = pickTrend(viewStats.data);

  return (
    <section id="dash-kpis" aria-label="شاخص‌های کلیدی" className="dash-bento2">
      {/* Hero pane — Today views with full sparkline + delta badge */}
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="dash-pane dash-pane--hero"
        aria-label={`بازدید امروز: ${viewStats.todayViews.toLocaleString('fa-IR')}`}
      >
        <header className="dash-pane__head">
          <span className="dash-pane__title">
            <span className="dash-ico dash-ico--cyan w-11 h-11 shrink-0" aria-hidden>
              <HiOutlineHeart className="w-5 h-5" />
            </span>
            <span className="dash-pane__title-text">بازدید امروز</span>
          </span>
          <DeltaBadge trend={heroTrend} delta={heroDelta} />
        </header>

        <div>
          <p className="dash-pane__value text-5xl sm:text-6xl">
            <CountUp value={viewStats.todayViews} duration={600} />
          </p>
          <p className="dash-pane__sub mt-1">
            از {viewStats.totalViews.toLocaleString('fa-IR')} بازدید کل — میانگین روزانه{' '}
            {Math.round(viewStats.totalViews / 30).toLocaleString('fa-IR')}
          </p>
        </div>

        <div className="-mx-3 h-24 sm:h-28">
          <MiniSparkline
            data={viewStats.data}
            stroke="oklch(72% 0.13 220)"
            gradId="hero-spark"
            range={range}
          />
        </div>
      </motion.article>

      <CompactPane
        title="لایک‌ها"
        value={stats.likes.total}
        icon={<HiOutlineHeart className="w-5 h-5" />}
        iconClass="dash-ico--rose"
        stroke="oklch(68% 0.18 20)"
        data={stats.likes.data}
        range={range}
      />

      <CompactPane
        title="نظرات جدید"
        value={stats.comments.new}
        icon={<HiOutlineChatBubbleLeftEllipsis className="w-5 h-5" />}
        iconClass="dash-ico--emerald"
        stroke="oklch(72% 0.14 165)"
        data={stats.comments.data}
        range={range}
      />

      <CompactPane
        title="اشتراک‌گذاری‌ها"
        value={stats.shares.total}
        icon={<HiOutlineShare className="w-5 h-5" />}
        iconClass="dash-ico--violet"
        stroke="oklch(66% 0.17 300)"
        data={stats.shares.data}
        range={range}
      />

      <CompactPane
        title="پیش‌نویس‌ها"
        value={stats.drafts.total}
        icon={<HiOutlinePencilSquare className="w-5 h-5" />}
        iconClass="dash-ico--amber"
        stroke="oklch(80% 0.14 80)"
        data={stats.drafts.data}
        range={range}
      />
    </section>
  );
}
