'use client';

/**
 * DashboardShell — 2026 (July) Meridian Canvas.
 *
 * Radical redesign: the layout is no longer a uniform grid of equal cards.
 * Instead, it's a COMPOSITION where:
 *   - The hero greeting + KPI merge into one dramatic section
 *   - Analytics takes up 2 rows (taller than other cards)
 *   - Cards have VARYING heights based on importance
 *   - Geometric accents frame the composition
 *
 * The visual hierarchy:
 *   1. Hero + KPI (dominant, full width)
 *   2. Analytics (tall, prominent)
 *   3. Engagement + Activity (medium)
 *   4. Calendar + Health + Quick (compact)
 *   5. Posts Spotlight (full width, masonry-like)
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
      <main
        id="dash-main"
        className="dash-canvas min-h-full py-2.5 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-5"
        aria-label="داشبورد"
        data-density={density}
      >
        {/* Toolbar */}
        <div className="dash-canvas__toolbar">
          <WorkspaceToolbar
            range={range}
            density={density}
            onRangeChange={setRange}
            onDensityChange={setDensity}
          />
        </div>

        {/* Hero + KPI — merged into one dramatic section */}
        <div className="dash-canvas__hero">
          <HeroKpiSection
            stats={props.stats}
            viewStats={props.viewStats}
            range={range}
            userRole={props.userRole}
          />
        </div>

        {/* Analytics — tall, prominent, spans 2 rows */}
        <div className="dash-canvas__analytics">
          <AnalyticsCanvas scheduledPosts={props.scheduledPosts} />
        </div>

        {/* Engagement donut */}
        <div className="dash-canvas__engagement">
          <EngagementDonut slices={slices} range={range} caption="سهم تعامل" />
        </div>

        {/* Activity timeline */}
        <div className="dash-canvas__activity">
          <ActivityRail items={props.recentActivity} range={range} />
        </div>

        {/* Calendar */}
        <div className="dash-canvas__calendar">
          <ScheduledRail scheduledPosts={props.scheduledPosts} />
        </div>

        {/* System health */}
        <div className="dash-canvas__health">
          <SystemHealth />
        </div>

        {/* Quick actions */}
        <div className="dash-canvas__quick">
          <QuickActionsCard userRole={props.userRole} />
        </div>

        {/* Posts spotlight — full width */}
        <div className="dash-canvas__posts">
          <PostsSpotlight popularPosts={props.popularPosts} recentDrafts={props.recentDrafts} />
        </div>

        {/* Geometric accent — subtle diagonal line */}
        <div className="dash-canvas__geo" aria-hidden />
      </main>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default memo(DashboardShell);
