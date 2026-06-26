'use client';

/**
 * DashboardShell — 2026 (June 22 → June 25 refresh) workspace orchestrator.
 *
 * Replaces the v1 DashboardPage. The composition is:
 *
 *   ┌─ skip-link + main ──────────────────────────────────────┐
 *   │  WorkspaceToolbar (sticky, range + density — home-only)  │
 *   │  ┌─────────────────────── main canvas ─────────┬─ rail ─┐│
 *   │  │ HeroSection (greeting + KPI + actions)      │ Sch.  ││
 *   │  │ KpiGrid (12-col bento + hero sparkline)     │ SysH  ││
 *   │  │ EngagementDonut (range-driven)              │        ││
 *   │  │ ActivityRail (range-driven, day-grouped)    │        ││
 *   │  │ AnalyticsCanvas (traffic/calendar + URL)    │        ││
 *   │  │ PostsSpotlight (tab-style filter)           │        ││
 *   │  └────────────────────────────────────────────┴────────┘│
 *   │  CommandPalette (⌘K — renders the global modal)         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * 2026 refresh notes:
 *   • The persistent `Header` (DashboardPage/Header.tsx) now owns the
 *     search field, theme switcher, avatar, and notifications. The
 *     WorkspaceToolbar below the header is strictly home-only context:
 *     range + density + a page-context anchor.
 *   • The `range` state is unified: the same value drives both the
 *     engagement donut and the activity rail (previously they had
 *     independent ranges). Selection is persisted in the URL via
 *     `?range=…` so reload / back navigation restore the state.
 *
 * Modern techniques used:
 *   • CSS subgrid + container queries via .dash-bento2
 *   • View Transitions API for the analytics tab cross-fade
 *   • content-visibility: auto on every pane for cheap off-screen paint
 *   • URL search-param persistence (?range=…&tab=…&period=…)
 *   • scroll-driven animations gated by prefers-reduced-motion
 *   • Logical CSS properties throughout (RTL integrity)
 *
 * Backend contract is unchanged: the same server action results (stats,
 * scheduledPosts, popularPosts, recentDrafts, viewStats, recentActivity)
 * are mapped 1:1 to the new subcomponents.
 */

import CommandPalette from '@/components/Dashboard/DashboardPage/CommandPalette';
import { AmbientBackground } from '@/components/Dashboard/primitives';
import { useSearchParams } from 'next/navigation';
import { memo, useEffect, useRef, useState } from 'react';
import ActivityRail from './ActivityRail';
import AnalyticsCanvas from './AnalyticsCanvas';
import EngagementDonut, { type EngagementSlice } from './EngagementDonut';
import HeroSection from './HeroSection';
import KpiGrid from './KpiGrid';
import PostsSpotlight from './PostsSpotlight';
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
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'AUTHOR';
}

function buildSlices(props: DashboardShellProps): EngagementSlice[] {
  const { stats, viewStats } = props;
  const today = stats.views.today;
  const viewsAll = viewStats.totalViews;
  const viewsWeek = viewStats.data.reduce((a, b) => a + b, 0);

  // The server actions already give us a 7-day series. Map "today" to the
  // last bucket and "week" to the full series so the range chips swap the
  // donut without a network round-trip.
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

  // Sync URL → state on back/forward navigation only.
  // Next.js 16 returns a new ReadonlyURLSearchParams reference on every
  // render, so depending on the object directly would loop. Key off the
  // serialized value instead, and only fire when the key actually changes.
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
      <main
        id="dash-main"
        className="min-h-screen py-3 sm:py-5 lg:py-8 px-3 sm:px-4 lg:px-6 xl:px-8 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto"
        aria-label="داشبورد"
        data-density={density}
      >
        <AmbientBackground intensity="low" />
        <WorkspaceToolbar
          range={range}
          density={density}
          onRangeChange={setRange}
          onDensityChange={setDensity}
        />

        <div className="dash-shell">
          <div className="dash-shell__main">
            <HeroSection />

            <KpiGrid stats={props.stats} viewStats={props.viewStats} range={range} />

            <div className="dash-shell__pair">
              <EngagementDonut slices={slices} range={range} caption="سهم تعامل" />
              <ActivityRail items={props.recentActivity} range={range} />
            </div>

            <AnalyticsCanvas scheduledPosts={props.scheduledPosts} />

            <PostsSpotlight popularPosts={props.popularPosts} recentDrafts={props.recentDrafts} />
          </div>

          <aside className="dash-shell__rail" aria-label="میان‌برها و تقویم">
            <ScheduledRail scheduledPosts={props.scheduledPosts} />
            <SystemHealth />
          </aside>
        </div>
      </main>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default memo(DashboardShell);
