'use client';

/**
 * NovaDeck — NOVA 2026 bento command deck (dashboard home redesign).
 *
 * A ground-up replacement for the TIDE vertical-station composition. Instead
 * of seven stacked panels separated by hairlines, NOVA is ONE asymmetric
 * bento mosaic (CSS Grid, grid-template-areas) of deep-glass tiles floating
 * over a mesh-depth background:
 *
 *   ┌───────────────┬─────┬─────┐
 *   │  HERO (3D)    │ KPI │ KPI │
 *   │               ├─────┼─────┤
 *   │               │ KPI │ KPI │
 *   ├───────────┬───┴─────┴─────┤
 *   │  CHART     │  STREAM       │
 *   ├─────┬──────┤  (tall)       │
 *   │ ACT │ PULSE│               │
 *   ├─────┴───┬──┴───────────────┤
 *   │  POSTS   │  ASIDE           │
 *   └──────────┴──────────────────┘
 *
 * 2026 techniques (distinct from TIDE):
 *   • Bento grid — spatial weight per metric, one unified mosaic.
 *   • Spatial depth — frosted-glass tiles, colored soft shadows, cursor 3D
 *     tilt on the hero (useTilt), gradient-mask borders.
 *   • Scroll-driven CSS reveal — `animation-timeline: view()` drives tile
 *     entrances with zero JS (graceful time-based fallback + reduced-motion
 *     off-switch, both in dashboard.css).
 *   • Interactive tiles — cursor Spotlight + hover-reveal affordances.
 *
 * Public API is identical to TideShell so the server page swaps them 1:1
 * without touching the data layer.
 */

import CommandPalette from '@/components/Dashboard/DashboardPage/CommandPalette';
import { motion } from '@/lib/motion-shim';
import { memo } from 'react';
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineHeart,
  HiOutlineEye,
  HiOutlineShare,
} from 'react-icons/hi2';
import ActionsTile from './tiles/ActionsTile';
import AsideTile from './tiles/AsideTile';
import ChartTile from './tiles/ChartTile';
import HeroTile from './tiles/HeroTile';
import KpiTile, { type KpiTone } from './tiles/KpiTile';
import MarketPulseTile from './tiles/MarketPulseTile';
import PostsTile from './tiles/PostsTile';
import StreamTile from './tiles/StreamTile';

interface NovaDeckProps {
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
  viewStats: { labels: string[]; data: number[]; totalViews: number; todayViews: number };
  recentActivity: import('../overview/ActivityRail').ActivityItem[];
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

const NovaDeck: React.FC<NovaDeckProps> = (props) => {
  const { stats, viewStats } = props;

  const kpis: Array<{
    label: string;
    value: number;
    data: number[];
    tone: KpiTone;
    icon: React.ReactNode;
    area: string;
  }> = [
    { label: 'بازدید امروز', value: stats.views.today, data: stats.views.data, tone: 'cyan', icon: <HiOutlineEye className="w-4 h-4" />, area: 'kpi1' },
    { label: 'لایک‌ها', value: stats.likes.total, data: stats.likes.data, tone: 'rose', icon: <HiOutlineHeart className="w-4 h-4" />, area: 'kpi2' },
    { label: 'نظرات', value: stats.comments.new, data: stats.comments.data, tone: 'emerald', icon: <HiOutlineChatBubbleLeftRight className="w-4 h-4" />, area: 'kpi3' },
    { label: 'اشتراک‌گذاری', value: stats.shares.total, data: stats.shares.data, tone: 'amber', icon: <HiOutlineShare className="w-4 h-4" />, area: 'kpi4' },
  ];

  return (
    <>
      <a className="nova-skip" href="#nova-main">
        پرش به محتوای اصلی
      </a>

      <motion.div
        id="nova-main"
        className="nova-deck"
        aria-label="داشبورد"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Mesh-depth backdrop — GPU-friendly, paused under reduced-motion. */}
        <div className="nova-deck__bg" aria-hidden>
          <span className="nova-deck__mesh nova-deck__mesh--a" />
          <span className="nova-deck__mesh nova-deck__mesh--b" />
          <span className="nova-deck__mesh nova-deck__mesh--c" />
          <span className="nova-deck__grid" />
        </div>

        <div className="nova-grid">
          <HeroTile
            todayViews={viewStats.todayViews}
            totalViews={viewStats.totalViews}
            spark={viewStats.data}
          />

          {kpis.map((k) => (
            <KpiTile key={k.label} {...k} />
          ))}

          <ChartTile scheduledPosts={props.scheduledPosts} />
          <StreamTile items={props.recentActivity} />
          <ActionsTile userRole={props.userRole} />
          <MarketPulseTile />
          <PostsTile popularPosts={props.popularPosts} recentDrafts={props.recentDrafts} />
          <AsideTile />
        </div>
      </motion.div>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default memo(NovaDeck);
