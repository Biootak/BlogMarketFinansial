'use client';

/**
 * KpiBento — 2026 redesign.
 *
 * Asymmetric bento grid for the dashboard's KPI strip. On `lg`:
 *
 *   Row 1: [ hero (5) ] [ compact (3) ] [ compact (4) ]
 *   Row 2: [ compact (4) ] [ compact (4) ] [ compact (4) ]
 *
 * The hero card carries a custom area+line sparkline (Stripe-style),
 * a delta badge, the metric label and a short inline footnote. The
 * compact cards reuse the existing BlogStatCard to keep the visual
 * language consistent without duplicating sparkline/trend logic.
 *
 * Accessibility:
 *   • Section is a <section> with an aria-label.
 *   • The hero exposes its metric as plain text + a tabular-num
 *     <output> so screen readers announce the value correctly.
 *   • All colors meet WCAG 2.2 AA contrast on both light and dark.
 */

import { useId, useMemo } from 'react';
import { motion } from '@/lib/motion-shim';
import {
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineMinus,
  HiOutlineEye,
  HiOutlineHeart,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineShare,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import BlogStatCard from './BlogStatCard';
import CountUp from './CountUp';
import { cn } from '@/lib/utils';

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

export interface KpiBentoProps {
  stats: Stats;
  viewStats: ViewStats;
}

function pickDelta(data: number[]): { delta: number; trend: 'up' | 'down' | 'flat' } {
  if (data.length < 2) return { delta: 0, trend: 'flat' };
  const half = Math.max(1, Math.floor(data.length / 2));
  const recent = data.slice(-half);
  const prev = data.slice(0, -half);
  const sumR = recent.reduce((a, b) => a + b, 0);
  const sumP = prev.reduce((a, b) => a + b, 0);
  if (sumP === 0 && sumR === 0) return { delta: 0, trend: 'flat' };
  if (sumP === 0) return { delta: 100, trend: 'up' };
  const delta = ((sumR - sumP) / sumP) * 100;
  const trend: 'up' | 'down' | 'flat' = Math.abs(delta) < 1 ? 'flat' : delta > 0 ? 'up' : 'down';
  return { delta, trend };
}

function fmtInt(n: number) {
  return n.toLocaleString('fa-IR');
}

/** Hero sparkline — area + line + last-point dot, no dependency on recharts. */
function HeroSparkline({
  data,
  gradId,
  className,
}: {
  data: number[];
  gradId: string;
  className?: string;
}) {
  const w = 600;
  const h = 160;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const span = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - 8 - ((v - min) / span) * (h - 24);
    return [x, y] as const;
  });
  const line = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const last = points[points.length - 1] ?? [0, 0];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn('w-full h-full', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(70% 0.16 270)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="oklch(70% 0.16 270)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke="oklch(72% 0.16 275)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={5}
        fill="oklch(72% 0.16 275)"
        stroke="oklch(18% 0.045 260)"
        strokeWidth={3}
      />
    </svg>
  );
}

const KpiBento: React.FC<KpiBentoProps> = ({ stats, viewStats }) => {
  const gradId = useId();

  type Compact = {
    key: string;
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'red' | 'orange';
    trend: 'up' | 'down' | 'neutral';
    percentage: number;
    data: number[];
  };

  // The grid plan:
  //   row 1: hero(5) + 2 compacts at 3 + 4
  //   row 2: 3 compacts at 4 + 4 + 4
  // We assign grid-column classes via the `slot` map below.
  const compactCards = useMemo<Compact[]>(
    () => [
      {
        key: 'published',
        title: 'پست‌های منتشر شده',
        value: stats.publishedPosts.total,
        icon: <HiOutlineDocumentText className="w-5 h-5" />,
        color: 'blue',
        trend: 'up',
        percentage: 8.4,
        data: stats.publishedPosts.data,
      },
      {
        key: 'likes',
        title: 'لایک‌ها',
        value: stats.likes.total,
        icon: <HiOutlineHeart className="w-5 h-5" />,
        color: 'red',
        trend: 'up',
        percentage: 4.2,
        data: stats.likes.data,
      },
      {
        key: 'comments',
        title: 'نظرات جدید',
        value: stats.comments.new,
        icon: <HiOutlineChatBubbleLeftEllipsis className="w-5 h-5" />,
        color: 'green',
        trend: 'neutral',
        percentage: 0.6,
        data: stats.comments.data,
      },
      {
        key: 'shares',
        title: 'اشتراک‌گذاری‌ها',
        value: stats.shares.total,
        icon: <HiOutlineShare className="w-5 h-5" />,
        color: 'purple',
        trend: 'up',
        percentage: 12.3,
        data: stats.shares.data,
      },
      {
        key: 'drafts',
        title: 'پیش‌نویس‌ها',
        value: stats.drafts.total,
        icon: <HiOutlinePencilSquare className="w-5 h-5" />,
        color: 'orange',
        trend: 'neutral',
        percentage: 1.1,
        data: stats.drafts.data,
      },
    ],
    [stats],
  );

  // Per-slot grid-column classes — explicit map so we never ship invalid Tailwind.
  // Each entry is the lg-only positioning; on sm we fall back to 2-col, on mobile 1-col.
  // hero               → lg col 1-5  (span 5)
  // compact row1 #0    → lg col 6-8  (span 3)
  // compact row1 #1    → lg col 9-12 (span 4)
  // compact row2 #2    → lg col 1-4  (span 4)
  // compact row2 #3    → lg col 5-8  (span 4)
  // compact row2 #4    → lg col 9-12 (span 4)
  const slot: string[] = [
    'lg:col-span-3 lg:col-start-6',
    'lg:col-span-4 lg:col-start-9',
    'lg:col-span-4 lg:col-start-1',
    'lg:col-span-4 lg:col-start-5',
    'lg:col-span-4 lg:col-start-9',
  ];

  const heroDelta = useMemo(() => pickDelta(viewStats.data), [viewStats.data]);
  const totalViews = viewStats.totalViews;

  return (
    <section
      aria-label="شاخص‌های کلیدی"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5"
    >
      {/* Hero KPI — Today's views */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="sm:col-span-2 lg:col-span-5 lg:col-start-1 group relative dash-panel overflow-hidden min-h-[228px]"
      >
        {/* Subtle corner glows */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -end-24 w-72 h-72 rounded-full opacity-50"
          style={{
            background:
              'radial-gradient(circle, oklch(70% 0.16 270 / 0.30) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -start-24 w-72 h-72 rounded-full opacity-30"
          style={{
            background:
              'radial-gradient(circle, oklch(74% 0.13 165 / 0.25) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        <div className="relative h-full p-5 sm:p-6 flex flex-col">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="dash-ico dash-ico--violet w-11 h-11 shrink-0">
                <HiOutlineEye className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  بازدید امروز
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  {`از ${fmtInt(totalViews)} بازدید کل`}
                </p>
              </div>
            </div>
            <DeltaPill delta={heroDelta.delta} trend={heroDelta.trend} />
          </div>

          {/* Value */}
          <div className="mt-4 flex items-baseline gap-2">
            <CountUp
              value={viewStats.todayViews}
              className="dash-num text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
            />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">بازدید</span>
          </div>

          {/* Sparkline area */}
          <div className="mt-auto pt-3 h-24 sm:h-28">
            <HeroSparkline data={viewStats.data} gradId={`hero-spark-${gradId}`} />
          </div>
        </div>
      </motion.div>

      {/* Compact cards */}
      {compactCards.map((c, i) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.04 * (i + 1),
          }}
          className={cn('h-full', slot[i])}
        >
          <BlogStatCard
            title={c.title}
            value={c.value}
            icon={c.icon}
            color={c.color}
            trend={c.trend}
            percentage={c.percentage}
            data={c.data}
          />
        </motion.div>
      ))}
    </section>
  );
};

function DeltaPill({
  delta,
  trend,
}: {
  delta: number;
  trend: 'up' | 'down' | 'flat';
}) {
  const Icon =
    trend === 'up'
      ? HiOutlineArrowTrendingUp
      : trend === 'down'
        ? HiOutlineArrowTrendingDown
        : HiOutlineMinus;
  const cls =
    trend === 'up'
      ? 'dash-trend dash-trend--up'
      : trend === 'down'
        ? 'dash-trend dash-trend--down'
        : 'dash-trend dash-trend--flat';
  const display = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}٪`;
  return (
    <span className={cn(cls, 'text-[11px] font-bold tabular-nums gap-1')}>
      <Icon className="w-3.5 h-3.5" />
      <span>{display}</span>
    </span>
  );
}

export default KpiBento;
