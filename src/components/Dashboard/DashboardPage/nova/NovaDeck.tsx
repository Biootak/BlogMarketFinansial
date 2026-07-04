'use client';

/**
 * NovaDeck — NOVA 2026 bento command deck (dashboard home).
 *
 * v2 "Quiet Confidence" redesign (2026-07-03):
 *   • Solid surfaces replace glassmorphism — no blur, no transparency.
 *   • Typography-driven hierarchy — weight and size create structure.
 *   • Mesh background removed — clean canvas, no decorative blobs.
 *   • Spotlight/NoiseTexture/3D-tilt removed from all tiles.
 *   • MarketPulseTile wired to real exchange rates.
 *   • AsideTile shows top authors instead of a static quote.
 *
 * Layout (unchanged — the bento grid is still strong):
 *   ┌───────────────┬─────┬─────┐
 *   │  HERO          │ KPI │ KPI │
 *   │                ├─────┼─────┤
 *   │                │ KPI │ KPI │
 *   ├───────────┬───┴─────┴─────┤
 *   │  CHART     │  STREAM       │
 *   ├─────┬──────┤  (tall)       │
 *   │ ACT │ PULSE│               │
 *   ├─────┴───┬──┴───────────────┤
 *   │  POSTS   │  ASIDE           │
 *   └──────────┴──────────────────┘
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
import type { MarketRateItem } from '@/lib/market-rates';
import type { TopAuthor } from '@/actions/getTopAuthors';
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
  marketRates: MarketRateItem[];
  topAuthors: TopAuthor[];
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
          <MarketPulseTile rates={props.marketRates} />
          <PostsTile popularPosts={props.popularPosts} recentDrafts={props.recentDrafts} />
          <AsideTile topAuthors={props.topAuthors} />
        </div>
      </motion.div>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default memo(NovaDeck);
