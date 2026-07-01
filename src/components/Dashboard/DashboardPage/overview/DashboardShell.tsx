'use client';

/**
 * DashboardShell — 2026 (July 1) ATLAS COMPOSITION.
 *
 * A harmonic asymmetric redesign that treats the dashboard as a painter's
 * canvas. The composition uses a φ² : 1 : 1/φ column ratio (2.618 : 1 :
 * 0.618) and places widgets at Fibonacci positions so the page reads as
 * "designed", not "templated".
 *
 * Layout (desktop ≥1180px):
 *
 *   ┌────────── toolbar (full width, sticky hairline) ──────────┐
 *   ├───────────────────────────────────────────────────────────┤
 *   │  HERO (φ² : hairline : 1)                                 │
 *   │   ┌─ HeroKpiSection editorial spread ──┬─ RailStats ───┐ │
 *   │   │  eyebrow + massive anchor number   │  mini KPIs    │ │
 *   │   │  + sparkline + CTAs                │  live indicator│ │
 *   │   └────────────────────────────────────┴───────────────┘ │
 *   ├───────────────────────────────────┬───────────────────────┤
 *   │  VITRUVIAN CENTERPIECE (φ² × 2r)  │  QuickActions (1/φ)   │
 *   │  AnalyticsCanvas                  │  rail spanning 2 rows │
 *   ├───────────────────┬───────────────┤                       │
 *   │ Engagement donut  │ Activity rail │                       │
 *   ├───────────────────┴───────────────┴───────────────────────┤
 *   │  HARMONIC TRIAD                                          │
 *   │   Calendar (φ)    Health (1)    Punctuation (1/φ)        │
 *   ├───────────────────────────────────────────────────────────┤
 *   │  POSTS SPOTLIGHT (editorial 3-up, first card spans 2r)    │
 *   └───────────────────────────────────────────────────────────┘
 *
 * On smaller viewports the composition collapses gracefully: tablet
 * uses a 6-col asymmetric stack, mobile goes to a single column.
 */

import CommandPalette from '@/components/Dashboard/DashboardPage/CommandPalette';
import { useSearchParams } from 'next/navigation';
import { memo, useEffect, useRef, useState } from 'react';
import ActivityRail from './ActivityRail';
import AnalyticsCanvas from './AnalyticsCanvas';
import EngagementDonut, { type EngagementSlice } from './EngagementDonut';
import HeroKpiSection from './HeroKpiSection';
import PostsSpotlight from './PostsSpotlight';
import QuickActionsCard from './QuickActionsCard';
import ScheduledRail from './ScheduledRail';
import SystemHealth from './SystemHealth';
import WorkspaceToolbar, { type Range } from './WorkspaceToolbar';

interface DashboardShellProps {
  stats: {
    views: { today: number; data: number[] };
    comments: { new: number; data: number[] };
    shares: { total: number; data: number[] };
    likes: { total: number; data: number[] };
    publishedPosts: { total: number; data: number[] };
    drafts: { total: number; data: number[] };
  };
  scheduledPosts: import('@/types/types').PostWithRelations[];
  popularPosts: Array<{
    id: string;
    title: string;
    views: number;
    publishDate: string;
    author: string;
    slug: string;
  }>;
  recentDrafts: Array<{ id: string; title: string; date: string; author: string }>;
  viewStats: {
    labels: string[];
    data: number[];
    totalViews: number;
    todayViews: number;
  };
  recentActivity: import('./ActivityRail').ActivityItem[];
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

function buildSlices(props: DashboardShellProps): EngagementSlice[] {
  const { stats, viewStats } = props;
  const today = stats.views.today;
  const viewsAll = viewStats.totalViews;
  const viewsWeek = viewStats.data.reduce((a, b) => a + b, 0);
  const likesToday = stats.likes.data.at(-1) ?? 0;
  const likesWeek = stats.likes.data.reduce((a, b) => a + b, 0);
  const commentsToday = stats.comments.data.at(-1) ?? 0;
  const commentsWeek = stats.comments.data.reduce((a, b) => a + b, 0);
  const sharesToday = stats.shares.data.at(-1) ?? 0;
  const sharesWeek = stats.shares.data.reduce((a, b) => a + b, 0);
  return [
    {
      key: 'views',
      label: 'بازدید',
      values: { all: viewsAll, today, week: viewsWeek },
      color: 'oklch(70% 0.16 270)',
    },
    {
      key: 'likes',
      label: 'لایک',
      values: { all: stats.likes.total, today: likesToday, week: likesWeek },
      color: 'oklch(70% 0.18 20)',
    },
    {
      key: 'comments',
      label: 'نظر',
      values: { all: stats.comments.new, today: commentsToday, week: commentsWeek },
      color: 'oklch(70% 0.14 165)',
    },
    {
      key: 'shares',
      label: 'اشتراک‌گذاری',
      values: { all: stats.shares.total, today: sharesToday, week: sharesWeek },
      color: 'oklch(70% 0.13 215)',
    },
  ];
}

const DashboardShell: React.FC<DashboardShellProps> = (props) => {
  const searchParams = useSearchParams();
  const [range, setRange] = useState<Range>(() => (searchParams?.get('range') as Range) || 'all');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const lastUrlKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = searchParams?.toString() ?? '';
    if (key === lastUrlKeyRef.current) return;
    lastUrlKeyRef.current = key;
    const r = (searchParams?.get('range') as Range) || 'all';
    setRange(r);
  }, [searchParams]);

  const slices = buildSlices(props);

  return (
    <>
      <a className="dash-skip" href="#dash-main">
        پرش به محتوای اصلی
      </a>
      <main id="dash-main" className="dash-atlas" aria-label="داشبورد" data-density={density}>
        {/* ---- Toolbar ----------------------------------------------------- */}
        <div className="dash-atlas__toolbar">
          <WorkspaceToolbar
            range={range}
            density={density}
            onRangeChange={setRange}
            onDensityChange={setDensity}
          />
        </div>

        {/* ---- Hero (φ² : hairline : 1) ----------------------------------- */}
        <section className="dash-atlas__hero" aria-label="نوار خوش‌آمدگویی و شاخص‌های کلیدی">
          <div className="dash-atlas__hero-main dash-atlas__reveal dash-atlas__reveal--d1">
            <HeroKpiSection
              stats={props.stats}
              viewStats={props.viewStats}
              range={range}
              userRole={props.userRole}
            />
          </div>
          {/* The vertical hairline divider is a real grid column at ≥1180px.
              On smaller viewports it collapses (no separator rendered). */}
          <div
            className="dash-atlas__hero-divider hidden [@media(min-width:1180px)]:block"
            aria-hidden
          />
          <aside
            className="dash-atlas__hero-rail dash-atlas__reveal dash-atlas__reveal--d2"
            aria-label="شاخص‌های مینی"
          >
            <HeroRail stats={props.stats} />
          </aside>
        </section>

        {/* ---- Vitruvian centerpiece + sats + rail ----------------------- */}
        <section className="dash-atlas__vitruvian" aria-label="مرکز تحلیل">
          <div className="dash-atlas__vitruvian-centerpiece dash-atlas__center dash-atlas__reveal dash-atlas__reveal--d2">
            <AnalyticsCanvas scheduledPosts={props.scheduledPosts} />
          </div>
          <div className="dash-atlas__vitruvian-sats">
            <div className="dash-atlas-pane dash-atlas__reveal dash-atlas__reveal--d3">
              <EngagementDonut slices={slices} range={range} caption="سهم تعامل" />
            </div>
            <div className="dash-atlas-pane dash-atlas__reveal dash-atlas__reveal--d3">
              <ActivityRail items={props.recentActivity} range={range} />
            </div>
          </div>
          <aside className="dash-atlas__vitruvian-rail" aria-label="اقدامات سریع">
            <div className="dash-atlas-pane dash-atlas-pane--pillar dash-atlas__reveal dash-atlas__reveal--d3">
              <QuickActionsCard userRole={props.userRole} />
            </div>
          </aside>
        </section>

        {/* ---- Harmonic triad (Calendar · Health · Punctuation) ---------- */}
        <section className="dash-atlas__triad" aria-label="تقویم، سلامت سیستم و سخن روز">
          <div className="dash-atlas__triad-calendar dash-atlas-pane dash-atlas__reveal dash-atlas__reveal--d4">
            <ScheduledRail scheduledPosts={props.scheduledPosts} />
          </div>
          <div className="dash-atlas__triad-health dash-atlas-pane dash-atlas__reveal dash-atlas__reveal--d4">
            <SystemHealth />
          </div>
          <aside
            className="dash-atlas__triad-punct dash-atlas__reveal dash-atlas__reveal--d4"
            aria-label="نقل‌قول"
          >
            <EditorialPunct />
          </aside>
        </section>

        {/* ---- Posts spotlight (editorial 3-up, asymmetric) -------------- */}
        <section className="dash-atlas__posts" aria-label="پست‌های ویژه">
          <div className="dash-atlas-pane dash-atlas-pane--soft">
            <PostsSpotlight popularPosts={props.popularPosts} recentDrafts={props.recentDrafts} />
          </div>
        </section>
      </main>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default memo(DashboardShell);

import { GeometricField } from '@/components/Dashboard/primitives';
/* ---------------------------------------------------------------------------
 * HeroRail — vertical mini-KPI stack on the END side of the hero. Pure
 * presentation; receives the same stats payload as the hero so values stay
 * in lock-step.
 *
 * Inline-defined rather than its own file because:
 *   1. It's only used by DashboardShell
 *   2. Keeping it next to the layout makes the asymmetric composition
 *      self-documenting (open one file, see the whole hero column)
 * ------------------------------------------------------------------------- */
import { cn } from '@/lib/utils';

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

function fmtNumber(n: number): string {
  // Persian digits for readability
  return new Intl.NumberFormat('fa-IR').format(n);
}

interface HeroRailProps {
  stats: DashboardShellProps['stats'];
}

function HeroRail({ stats }: HeroRailProps) {
  const items: Array<{
    key: string;
    label: string;
    value: number;
    series: number[];
    color: string;
  }> = [
    {
      key: 'likes',
      label: 'لایک‌ها',
      value: stats.likes.total,
      series: stats.likes.data,
      color: 'var(--atlas-accent-warm)',
    },
    {
      key: 'comments',
      label: 'نظرات',
      value: stats.comments.new,
      series: stats.comments.data,
      color: 'var(--atlas-accent-leaf)',
    },
    {
      key: 'shares',
      label: 'اشتراک‌ها',
      value: stats.shares.total,
      series: stats.shares.data,
      color: 'var(--atlas-accent-cool)',
    },
    {
      key: 'drafts',
      label: 'پیش‌نویس',
      value: stats.drafts.total,
      series: stats.drafts.data,
      color: 'var(--atlas-accent)',
    },
  ];

  return (
    <div className="relative h-full">
      <GeometricField density="med" />
      <div className="relative z-10 flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between gap-2">
          <span className="dash-atlas__rail-label">شاخص‌های مینی</span>
          <LiveIndicator />
        </div>
        <div className="flex flex-col gap-0">
          {items.map((item) => {
            const { trend, delta } = pickTrend(item.series);
            return (
              <div key={item.key} className="dash-atlas__rail-stat">
                <span className="dash-atlas__rail-stat-label">
                  <span
                    aria-hidden
                    className="inline-block size-2 rounded-full"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className="dash-atlas__rail-stat-value">{fmtNumber(item.value)}</span>
                  <span
                    className={cn(
                      'dash-atlas__rail-stat-delta',
                      trend === 'up' && 'dash-atlas__rail-stat-delta--up',
                      trend === 'down' && 'dash-atlas__rail-stat-delta--down',
                    )}
                  >
                    {trend === 'flat' ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}٪`}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LiveIndicator() {
  const [time, setTime] = useState<string>('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      );
    };
    update();
    const t = window.setInterval(update, 30_000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="dash-atlas__live" aria-label="نشانگر زنده">
      <span className="dash-atlas__live-dot" aria-hidden />
      <span dir="ltr">{time}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
 * EditorialPunct — the third (1/φ) slot of the harmonic triad. Pure editorial
 * space: a Persian quote + metadata. The empty zone IS the design.
 * ------------------------------------------------------------------------- */
const PUNCT_QUOTES: ReadonlyArray<{ text: string; author: string }> = [
  { text: 'بازار، آینه‌ای است که فقط صبوران را به‌درستی نشان می‌دهد.', author: 'وارن بافت' },
  { text: 'موفقیت در تحلیل، ترکیبی از دانش، صبر و شهامت است.', author: 'بنجامین گراهام' },
  { text: 'داده، نفت جدید است؛ اما تنها زمانی که پالایش شود.', author: 'کلود شانون' },
  { text: 'هر پست، فرصتی است برای گفتن یک داستان تازه.', author: 'تیم محتوا' },
];

function EditorialPunct() {
  // Deterministic per-day selection so the quote changes daily, not per render.
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const fallback: { text: string; author: string } = { text: '', author: '' };
  const quote = PUNCT_QUOTES[dayIndex % PUNCT_QUOTES.length] ?? fallback;
  const date = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <>
      <span className="dash-atlas-label">
        <span className="dash-atlas-label__num">۰۳</span>
        <span className="dash-atlas-label__text">سخن روز</span>
      </span>
      <GeometricField density="min" />
      <blockquote className="dash-atlas__punct-quote" dir="rtl">
        {quote.text}
      </blockquote>
      <div className="dash-atlas__punct-meta">
        <span>— {quote.author}</span>
        <span dir="ltr">{date}</span>
      </div>
    </>
  );
}
