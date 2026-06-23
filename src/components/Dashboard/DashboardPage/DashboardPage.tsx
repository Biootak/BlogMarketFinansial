'use client';

/**
 * DashboardPage — 2026 redesign.
 *
 * Composes the redesigned dashboard from focused subcomponents:
 *   1. WelcomeSection   — Linear/Vercel hero with date, role, CTAs
 *   2. KpiBento         — Asymmetric 6-card grid with a hero sparkline
 *   3. AnalyticsPanel   — Stripe-style traffic/calendar switcher
 *      + 7d/30d/90d period switcher
 *   4. Quick stats row  — DonutChart (engagement breakdown) +
 *                         ActivityFeed (recent system events)
 *   5. PostManagement   — Popular posts + recent drafts
 *   6. CommandPalette   — ⌘K command palette (rendered globally)
 *
 * The page keeps the existing props contract; the Server Component
 * (page.tsx) only adds one new fetch (`getRecentActivity`).
 *
 * SWR is intentionally dropped: the server actions wrap the queries in
 * `unstable_cache` with sensible TTLs, and the chart poll interval is
 * owned by TrafficChart itself.
 *
 * Accessibility & motion:
 *   • Each section exposes a real <section> with an aria-label.
 *   • Animations use a single, calm ease curve and respect
 *     `prefers-reduced-motion` (handled by motion-shim).
 *   • RTL is honored throughout (no hard-coded left/right).
 *   • All colors come from the existing `dash-ico--*` palette — no
 *     bespoke flashy tones are introduced here.
 */

import { memo } from 'react';
import { motion } from '@/lib/motion-shim';
import WelcomeSection from './WelcomeSection/WelcomeSection';
import KpiBento from './KpiBento';
import AnalyticsPanel from './AnalyticsPanel';
import DonutChart, { type DonutSlice } from './DonutChart';
import ActivityFeed, { type ActivityItem } from './ActivityFeed';
import CommandPalette from './CommandPalette';
import PostManagement from '@/components/Dashboard/Blog/PostManagement';
import type { PostWithRelations } from '@/types/types';

interface DashboardPageProps {
  stats: {
    views: { today: number; data: number[] };
    comments: { new: number; data: number[] };
    shares: { total: number; data: number[] };
    likes: { total: number; data: number[] };
    publishedPosts: { total: number; data: number[] };
    drafts: { total: number; data: number[] };
  };
  scheduledPosts: PostWithRelations[];
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
  recentActivity: ActivityItem[];
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'AUTHOR';
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const DONUT_COLORS = {
  views: 'oklch(70% 0.16 270)',
  likes: 'oklch(70% 0.18 20)',
  comments: 'oklch(70% 0.14 165)',
  shares: 'oklch(70% 0.13 215)',
} as const;

const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  scheduledPosts,
  popularPosts,
  recentDrafts,
  viewStats,
  recentActivity,
  userRole,
}) => {
  const donutSlices: DonutSlice[] = [
    {
      key: 'views',
      label: 'بازدید',
      value: viewStats.totalViews,
      color: DONUT_COLORS.views,
    },
    {
      key: 'likes',
      label: 'لایک',
      value: stats.likes.total,
      color: DONUT_COLORS.likes,
    },
    {
      key: 'comments',
      label: 'نظر',
      value: stats.comments.new,
      color: DONUT_COLORS.comments,
    },
    {
      key: 'shares',
      label: 'اشتراک‌گذاری',
      value: stats.shares.total,
      color: DONUT_COLORS.shares,
    },
  ];
  const donutTotal = donutSlices.reduce((acc, s) => acc + s.value, 0);

  return (
    <>
      <motion.main
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8"
      >
        {/* Hero strip */}
        <motion.div variants={itemVariants}>
          <WelcomeSection />
        </motion.div>

        {/* Bento KPIs */}
        <motion.div variants={itemVariants}>
          <KpiBento stats={stats} viewStats={viewStats} />
        </motion.div>

        {/* Donut + Activity row */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5"
        >
          <section
            aria-label="سهم تعامل"
            className="dash-panel overflow-hidden lg:col-span-7 xl:col-span-5"
          >
            <header className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                سهم تعامل
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                توزیع بازدید، لایک، نظر و اشتراک‌گذاری
              </p>
            </header>
            <div className="p-5 sm:p-6">
              {donutTotal > 0 ? (
                <DonutChart
                  slices={donutSlices}
                  total={donutTotal}
                  caption="کل تعامل"
                  subCaption="۷ روز اخیر"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10 text-sm text-slate-500 dark:text-slate-400">
                  <p>هنوز داده‌ای برای نمایش وجود ندارد.</p>
                </div>
              )}
            </div>
          </section>

          <div className="lg:col-span-5 xl:col-span-7">
            <ActivityFeed items={recentActivity} />
          </div>
        </motion.div>

        {/* Analytics — traffic chart + publishing calendar */}
        <motion.div variants={itemVariants}>
          <AnalyticsPanel scheduledPosts={scheduledPosts} />
        </motion.div>

        {/* Posts lists */}
        <motion.div variants={itemVariants}>
          <PostManagement
            showHeaderStats={false}
            showCreateButton={false}
            stats={{
              totalPosts: stats.publishedPosts.total + stats.drafts.total,
              totalDrafts: stats.drafts.total,
              totalViews: viewStats.totalViews,
            }}
            popularPosts={popularPosts}
            recentDrafts={recentDrafts}
          />
        </motion.div>
      </motion.main>

      {/* ⌘K command palette — fixed overlay, role-gated */}
      <CommandPalette role={userRole} />
    </>
  );
};

export default memo(DashboardPage);
