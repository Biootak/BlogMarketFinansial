'use client';

/**
 * DashboardShell — 2026 (June 22) workspace orchestrator.
 *
 * Replaces the v1 DashboardPage. The composition is:
 *
 *   ┌─ skip-link + main ──────────────────────────────────────┐
 *   │  WorkspaceToolbar (sticky, search + range chips)         │
 *   │  ┌─────────────────────── main canvas ─────────┬─ rail ─┐│
 *   │  │ HeroSection (greeting + headline KPI + CTA) │ Sch.  ││
 *   │  │ KpiGrid (12-col bento + hero sparkline)     │ SysH  ││
 *   │  │ EngagementDonut (range-aware)               │        ││
 *   │  │ ActivityRail (range-aware, day-grouped)     │        ││
 *   │  │ AnalyticsCanvas (traffic/calendar + URL)    │        ││
 *   │  │ PostsSpotlight (featured + popular+drafts)  │        ││
 *   │  └────────────────────────────────────────────┴────────┘│
 *   │  CommandPalette (⌘K — renders the global modal)         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Modern 2026 techniques used:
 *   • CSS subgrid + container queries via .dash-bento2
 *   • View Transitions API for the analytics tab cross-fade
 *   • content-visibility: auto on every pane for cheap off-screen paint
 *   • URL search-param persistence (?range=…&tab=…&period=…)
 *   • scroll-driven animations gated by prefers-reduced-motion
 *   • field-sizing: content on the toolbar search field
 *   • Logical CSS properties throughout (RTL integrity)
 *
 * Backend contract is unchanged: the same server action results (stats,
 * scheduledPosts, popularPosts, recentDrafts, viewStats, recentActivity)
 * are mapped 1:1 to the new subcomponents.
 */

import { memo, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import HeroSection from './HeroSection';
import KpiGrid from './KpiGrid';
import WorkspaceToolbar, { type Range } from './WorkspaceToolbar';
import EngagementDonut, { type EngagementSlice } from './EngagementDonut';
import ActivityRail from './ActivityRail';
import AnalyticsCanvas from './AnalyticsCanvas';
import ScheduledRail from './ScheduledRail';
import SystemHealth from './SystemHealth';
import PostsSpotlight from './PostsSpotlight';
import CommandPalette from '@/components/Dashboard/DashboardPage/CommandPalette';

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
  const [range, setRange] = useState<Range>(
    () => (searchParams?.get('range') as Range) || 'all',
  );
  const [activityRange, setActivityRange] = useState<'today' | 'week' | 'all'>(
    () => ((searchParams?.get('activity') as 'today' | 'week' | 'all') || 'today'),
  );
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Sync URL → state on back/forward navigation.
  useEffect(() => {
    const r = (searchParams?.get('range') as Range) || 'all';
    const a = (searchParams?.get('activity') as 'today' | 'week' | 'all') || 'today';
    setRange(r);
    setActivityRange(a);
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
      >
        <WorkspaceToolbar
          range={range}
          density={density}
          onRangeChange={setRange}
          onDensityChange={setDensity}
        />

        <div className="dash-shell">
          <div className="dash-shell__main">
            <HeroSection
              sparkData={props.viewStats.data}
              todayViews={props.viewStats.todayViews}
              totalViews={props.viewStats.totalViews}
            />

            <KpiGrid stats={props.stats} viewStats={props.viewStats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <EngagementDonut
                slices={slices}
                range={range}
                onRangeChange={setRange}
                caption="سهم تعامل"
              />
              <ActivityRail
                items={props.recentActivity}
                range={activityRange}
                onRangeChange={setActivityRange}
              />
            </div>

            <AnalyticsCanvas scheduledPosts={props.scheduledPosts} />

            <PostsSpotlight
              popularPosts={props.popularPosts}
              recentDrafts={props.recentDrafts}
            />
          </div>

          <aside
            className="dash-shell__rail"
            aria-label="میان‌برها و تقویم"
          >
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