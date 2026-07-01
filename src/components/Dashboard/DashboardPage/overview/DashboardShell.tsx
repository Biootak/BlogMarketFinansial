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
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { memo, useEffect, useRef, useState } from 'react';
import { HiOutlineArrowUpRight, HiOutlineEye } from 'react-icons/hi2';
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
      <div id="dash-main" className="dash-atlas" aria-label="داشبورد" data-density={density}>
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
            aria-label="پست برتر امروز"
          >
            <TopPostLive popularPosts={props.popularPosts} viewStats={props.viewStats} />
          </aside>
        </section>

        {/* ---- Operations Band (Activity · QuickActions) -------------------
            Pulled out of Vitruvian so the day-grouped activity feed gets
            horizontal room to breathe, and QuickActions becomes one of the
            first things the user sees after the greeting. Both children
            keep their natural height. */}
        <section className="dash-atlas__operations" aria-label="عملیات">
          <div className="dash-atlas__operations-activity dash-atlas-pane dash-atlas__reveal dash-atlas__reveal--d2">
            <ActivityRail items={props.recentActivity} range={range} />
          </div>
          <aside
            className="dash-atlas__operations-quick dash-atlas__reveal dash-atlas__reveal--d3"
            aria-label="دسترسی سریع"
          >
            <div className="dash-atlas-pane dash-atlas-pane--pillar">
              <QuickActionsCard userRole={props.userRole} />
            </div>
          </aside>
        </section>

        {/* ---- Vitruvian centerpiece + donut -----------------------------
            Simplified: the centerpiece chart + the engagement donut.
            Activity & QuickActions moved to the Operations band above. */}
        <section className="dash-atlas__vitruvian" aria-label="مرکز تحلیل">
          <div className="dash-atlas__vitruvian-centerpiece dash-atlas__center dash-atlas__reveal dash-atlas__reveal--d3">
            <AnalyticsCanvas scheduledPosts={props.scheduledPosts} />
          </div>
          <div className="dash-atlas-pane dash-atlas__reveal dash-atlas__reveal--d3">
            <EngagementDonut slices={slices} range={range} caption="سهم تعامل" />
          </div>
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
      </div>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default memo(DashboardShell);

import { GeometricField } from '@/components/Dashboard/primitives';
/* ---------------------------------------------------------------------------
 * TopPostLive — the END-side slot of the hero (replaces the old mini-KPI
 * stack). Shows the post that's getting the most traffic RIGHT NOW, with
 * a live pulse indicator, view count, momentum sparkline, and a quick
 * link to open the post.
 *
 * Design language:
 *   • Single, focused subject — not a list of metrics.
 *   • Live feeling via pulse + clock, no fabricated "real-time" data.
 *   • Visual hierarchy: post title > views > meta > sparkline > CTA.
 *   • Empty state handled gracefully (DashboardEmpty from primitives).
 *
 * Inline-defined (not its own file) so the hero composition stays
 * self-documenting in a single read.
 * ------------------------------------------------------------------------- */

function fmtNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

interface TopPostLiveProps {
  popularPosts: DashboardShellProps['popularPosts'];
  viewStats: DashboardShellProps['viewStats'];
}

function TopPostLive({ popularPosts, viewStats }: TopPostLiveProps) {
  const top = popularPosts[0];

  if (!top) {
    return (
      <div className="dash-atlas__top-post dash-atlas__top-post--empty">
        <GeometricField density="min" />
        <span className="dash-atlas__top-post-empty-label">هنوز پستی برای نمایش وجود ندارد</span>
      </div>
    );
  }

  return (
    <article className="dash-atlas__top-post">
      <GeometricField density="med" />

      <header className="dash-atlas__top-post-head">
        <span className="dash-atlas__top-post-eyebrow">
          <span className="dash-atlas__top-post-eyebrow-dot" aria-hidden />
          <span>پست برتر امروز</span>
        </span>
        <LiveIndicator />
      </header>

      <Link
        href={`/blog/${top.slug}`}
        className="dash-atlas__top-post-title-link"
        aria-label={`باز کردن پست: ${top.title}`}
      >
        <h3 className="dash-atlas__top-post-title" dir="rtl">
          {top.title}
        </h3>
      </Link>

      <p className="dash-atlas__top-post-meta">
        <span className="dash-atlas__top-post-meta-author">{top.author}</span>
        <span className="dash-atlas__top-post-meta-dot" aria-hidden>
          ·
        </span>
        <span className="dash-atlas__top-post-meta-date">{top.publishDate}</span>
      </p>

      <footer className="dash-atlas__top-post-foot">
        <div className="dash-atlas__top-post-views">
          <HiOutlineEye className="dash-atlas__top-post-views-ico" aria-hidden />
          <span className="dash-atlas__top-post-views-num">{fmtNumber(top.views)}</span>
          <span className="dash-atlas__top-post-views-label">بازدید</span>
        </div>
        <TopPostSparkline data={viewStats.data} />
      </footer>

      <Link
        href={`/blog/${top.slug}`}
        className="dash-atlas__top-post-cta"
        aria-label={`ادامه‌ی مطلب: ${top.title}`}
      >
        <span>خواندن پست</span>
        <HiOutlineArrowUpRight aria-hidden />
      </Link>
    </article>
  );
}

interface TopPostSparklineProps {
  data: number[];
}

function TopPostSparkline({ data }: TopPostSparklineProps) {
  if (data.length < 2) return null;
  const width = 84;
  const height = 28;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = height - 3 - ((v - min) / span) * (height - 6);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const lastPt = pts[pts.length - 1] ?? [0, 0];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="dash-atlas__top-post-spark"
      role="img"
      aria-label="نمودار روند بازدید"
    >
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastPt[0]} cy={lastPt[1]} r={2.5} fill="currentColor" opacity={0.9} />
    </svg>
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
