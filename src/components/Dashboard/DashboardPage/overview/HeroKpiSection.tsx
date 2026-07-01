'use client';

/**
 * HeroKpiSection — 2026 (July) Meridian Canvas.
 *
 * Merges the hero greeting with the KPI section into ONE dramatic
 * composition. The "today's views" number is MASSIVE — it dominates
 * the section like a hero number in a fintech app.
 *
 * Layout:
 *   Left (60%): Greeting + today's views (huge) + sparkline
 *   Right (40%): Mini KPIs (likes, comments, shares, drafts) in a 2x2 grid
 *
 * The golden ratio (φ = 1.618) drives the 60/40 split.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { MagneticButton, NoiseTexture } from '@/components/Dashboard/primitives';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineDocumentText,
  HiOutlineHeart,
  HiOutlineMinus,
  HiOutlinePencilSquare,
  HiOutlineShare,
  HiOutlineSignal,
  HiOutlineSparkles,
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

function MiniSparkline({
  data,
  stroke,
  gradId,
}: {
  data: number[];
  stroke: string;
  gradId: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const w = 200;
  const h = 60;

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
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - 4 - ((v - min) / span) * (h - 8);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full h-16"
      role="img"
      aria-label="نمودار روند"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
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
  return (
    <span className={cn('dash-trend dash-trend--flat text-xs gap-1 tabular-nums')}>
      <Icon className="w-4 h-4" aria-hidden />
      <span>{`${delta > 0 ? '+' : ''}${delta.toFixed(1)}٪`}</span>
    </span>
  );
}

function LiveClock() {
  const [time, setTime] = useState<string>('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
    };
    update();
    const t = window.setInterval(update, 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="dash-hero-kpi__live-time" dir="ltr">
      {time}
    </span>
  );
}

export default function HeroKpiSection({ stats, viewStats }: HeroKpiSectionProps) {
  const user = useCurrentUser();
  const [hour, setHour] = useState<number>(12);
  const gradId = useId();

  useEffect(() => {
    const update = () => setHour(new Date().getHours());
    update();
    const t = window.setInterval(update, 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="dash-hero-kpi"
    >
      {/* Left side — greeting + massive KPI + sparkline */}
      <div className="dash-hero-kpi__main">
        {/* Greeting */}
        <div className="dash-hero-kpi__greeting">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="dash-hero-kpi__headline"
          >
            <span
              className="opacity-80 font-semibold"
              style={reduceMotion ? undefined : { animationDelay: '0ms' }}
            >
              {greeting}،&nbsp;
            </span>
            <span
              className="bg-gradient-to-l from-white via-cyan-100 to-emerald-100 bg-clip-text text-transparent"
              style={reduceMotion ? undefined : { animationDelay: '40ms' }}
            >
              {user?.name ?? 'کاربر'}
            </span>
          </motion.h1>
          <p className="dash-hero-kpi__sub">نمای کلی وبلاگ — شاخص‌ها، فعالیت‌ها و برنامه‌ی انتشار</p>
        </div>

        {/* Massive KPI number */}
        <div className="dash-hero-kpi__kpi">
          <div className="dash-hero-kpi__kpi-head">
            <span className="dash-hero-kpi__kpi-label">بازدید امروز</span>
            <DeltaBadge trend={trend} delta={delta} />
          </div>
          <p className="dash-hero-kpi__kpi-value">
            <CountUp value={viewStats.todayViews} duration={800} />
          </p>
          <p className="dash-hero-kpi__kpi-sub">
            از {viewStats.totalViews.toLocaleString('fa-IR')} بازدید کل
          </p>
        </div>

        {/* Sparkline */}
        <div className="dash-hero-kpi__sparkline">
          <MiniSparkline
            data={viewStats.data}
            stroke="oklch(72% 0.13 220)"
            gradId={`hero-spark-${gradId}`}
          />
        </div>

        {/* Quick actions */}
        <div className="dash-hero-kpi__actions">
          <MagneticButton asChild magnetRange={6} type="button" className="dash-hero-kpi__cta">
            <Link href="/dashboard/posts/create" aria-label="نوشتن پست جدید">
              <span className="dash-hero-kpi__cta-ico">
                <HiOutlinePencilSquare className="w-4 h-4" />
              </span>
              <span>نوشتن پست جدید</span>
            </Link>
          </MagneticButton>
        </div>
      </div>

      {/* Right side — mini KPIs in a 2x2 grid */}
      <div className="dash-hero-kpi__minis">
        <MiniKpi
          title="لایک‌ها"
          value={stats.likes.total}
          data={stats.likes.data}
          icon={<HiOutlineHeart className="w-4 h-4" />}
          tone="rose"
          stroke="oklch(68% 0.18 20)"
          delay={0.1}
        />
        <MiniKpi
          title="نظرات"
          value={stats.comments.new}
          data={stats.comments.data}
          icon={<HiOutlineChatBubbleLeftEllipsis className="w-4 h-4" />}
          tone="emerald"
          stroke="oklch(72% 0.14 165)"
          delay={0.15}
        />
        <MiniKpi
          title="اشتراک‌گذاری"
          value={stats.shares.total}
          data={stats.shares.data}
          icon={<HiOutlineShare className="w-4 h-4" />}
          tone="violet"
          stroke="oklch(66% 0.17 300)"
          delay={0.2}
        />
        <MiniKpi
          title="پیش‌نویس‌ها"
          value={stats.drafts.total}
          data={stats.drafts.data}
          icon={<HiOutlinePencilSquare className="w-4 h-4" />}
          tone="amber"
          stroke="oklch(80% 0.14 80)"
          delay={0.25}
        />
      </div>

      {/* Live pulse */}
      <div className="dash-hero-kpi__live">
        <span className="dash-hero-kpi__live-dot" aria-hidden />
        <span className="dash-hero-kpi__live-text">
          <HiOutlineSignal className="w-3.5 h-3.5" />
          <span>زنده</span>
        </span>
        <LiveClock />
      </div>

      {/* Geometric accents */}
      <div className="dash-hero-kpi__geo dash-hero-kpi__geo--1" aria-hidden />
      <div className="dash-hero-kpi__geo dash-hero-kpi__geo--2" aria-hidden />

      {/* Noise overlay */}
      <NoiseTexture opacity={0.03} />
    </motion.section>
  );
}

/* ─── Mini KPI card ──────────────────────────────────────────────── */

interface MiniKpiProps {
  title: string;
  value: number;
  data: number[];
  icon: React.ReactNode;
  tone: 'rose' | 'emerald' | 'violet' | 'amber';
  stroke: string;
  delay: number;
}

const TONE_MAP: Record<MiniKpiProps['tone'], string> = {
  rose: 'dash-ico--rose',
  emerald: 'dash-ico--emerald',
  violet: 'dash-ico--violet',
  amber: 'dash-ico--amber',
};

function MiniKpi({ title, value, data, icon, tone, stroke, delay }: MiniKpiProps) {
  const { trend, delta } = pickTrend(data);
  const miniGradId = useId();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="dash-mini-kpi"
    >
      <div className="dash-mini-kpi__head">
        <span className={cn('dash-mini-kpi__ico', TONE_MAP[tone])} aria-hidden>
          {icon}
        </span>
        <DeltaBadge trend={trend} delta={delta} />
      </div>
      <p className="dash-mini-kpi__value">
        <CountUp value={value} duration={600} />
      </p>
      <p className="dash-mini-kpi__title">{title}</p>
      <div className="dash-mini-kpi__spark">
        <MiniSparkline data={data} stroke={stroke} gradId={`mini-${miniGradId}`} />
      </div>
    </motion.div>
  );
}
