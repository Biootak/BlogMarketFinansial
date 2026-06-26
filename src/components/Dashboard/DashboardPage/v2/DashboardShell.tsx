'use client';

/**
 * DashboardShell — 2026 (June 26) unified bento layout.
 *
 * Single-flow redesign: the separate rail column is gone. Calendar and
 * SystemHealth now participate in the main bento grid as regular cards,
 * so there are no empty voids under narrow columns. The layout is a
 * 12-column asymmetric bento where every card earns its span.
 *
 *   Row 1 — Hero greeting (full)
 *   Row 2 — [North Star KPI 8/12]  [Activity 4/12]
 *   Row 3 — [Likes 3/12] [Comments 3/12] [Shares 3/12] [Drafts 3/12]
 *   Row 4 — [Engagement Donut 4/12] [Analytics 8/12]
 *   Row 5 — [Calendar 4/12] [System Health 4/12] [Quick links 4/12]
 *   Row 6 — Posts Spotlight (full)
 *
 * On tablet (≥640px): the grid collapses to 6 columns with proportional
 * spans. On mobile: single column, cards stack vertically.
 */

import CommandPalette from '@/components/Dashboard/DashboardPage/CommandPalette';
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
      <main
        id="dash-main"
        className="dash-shell min-h-full py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-5"
        aria-label="داشبورد"
        data-density={density}
      >
        <AmbientBackground intensity="low" />

        {/* Row 0 — Toolbar strip (full width, compact) */}
        <div className="dash-span-12">
          <WorkspaceToolbar
            range={range}
            density={density}
            onRangeChange={setRange}
            onDensityChange={setDensity}
          />
        </div>

        {/* Row 1 — Hero greeting (full width) */}
        <div className="dash-span-12">
          <HeroSection />
        </div>

        {/* Row 2 — North Star KPI (8/12) + Activity (4/12) */}
        <div className="dash-span-12 dash-span-md-6 dash-span-lg-8">
          <KpiGrid stats={props.stats} viewStats={props.viewStats} range={range} />
        </div>
        <div className="dash-span-12 dash-span-md-6 dash-span-lg-4">
          <ActivityRail items={props.recentActivity} range={range} />
        </div>

        {/* Row 3 — Engagement Donut (4/12) + Analytics (8/12) */}
        <div className="dash-span-12 dash-span-md-6 dash-span-lg-4">
          <EngagementDonut slices={slices} range={range} caption="سهم تعامل" />
        </div>
        <div className="dash-span-12 dash-span-md-6 dash-span-lg-8">
          <AnalyticsCanvas scheduledPosts={props.scheduledPosts} />
        </div>

        {/* Row 4 — Calendar + Health */}
        <div className="dash-span-12 dash-span-md-6 dash-span-lg-6">
          <ScheduledRail scheduledPosts={props.scheduledPosts} />
        </div>
        <div className="dash-span-12 dash-span-md-6 dash-span-lg-6">
          <SystemHealth />
        </div>

        {/* Row 5 — Posts Spotlight (full width) */}
        <div className="dash-span-12">
          <PostsSpotlight popularPosts={props.popularPosts} recentDrafts={props.recentDrafts} />
        </div>
      </main>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default memo(DashboardShell);
