'use client';

/**
 * EditorialDeck — Editorial Command (2026-07-04).
 *
 * Typography-anchored 5-row layout. Replaces the NOVA "Aurora Command"
 * bento. Design language: Linear / Stripe / Notion — hairline borders,
 * one accent (emerald), generous whitespace, zero glass.
 *
 * Layout (desktop ≥1280px):
 *   ┌──────────────────────────────────────┬─────────────┐
 *   │ HERO   greeting + 1 anchor number    │  ANCHOR     │
 *   │         + sparkline + CTA            │  3 metrics  │
 *   ├──────┬───────┬───────┬───────┬───────┴─────────────┤
 *   │ KPI1 │ KPI2  │ KPI3  │ KPI4                       │
 *   ├──────┴───────┴───────┴─────────────────────────────┤
 *   │  CHART  (analytics canvas + tabs + period)         │
 *   ├──────────────────────────────┬──────────────────────┤
 *   │  POPULAR POSTS (ranked list) │  ACTIVITY FEED       │
 *   ├──────────────┬───────────────┴──────────────────────┤
 *   │ MARKET RATES │ TOP AUTHORS       │ QUICK ACTIONS     │
 *   └──────────────┴──────────────────────────────────────┘
 */

import CommandPalette from '@/components/Dashboard/DashboardPage/CommandPalette';
import type { MarketRateItem } from '@/lib/market-rates';
import type { TopAuthor } from '@/actions/getTopAuthors';
import type { ActivityItem } from '../overview/ActivityRail';
import EditorialActions from './tiles/EditorialActions';
import EditorialActivity from './tiles/EditorialActivity';
import EditorialAnchor from './tiles/EditorialAnchor';
import EditorialAuthors from './tiles/EditorialAuthors';
import EditorialChart from './tiles/EditorialChart';
import EditorialHero from './tiles/EditorialHero';
import EditorialKpi from './tiles/EditorialKpi';
import EditorialMarket from './tiles/EditorialMarket';
import EditorialPosts from './tiles/EditorialPosts';

interface EditorialDeckProps {
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
  recentActivity: ActivityItem[];
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
  marketRates: MarketRateItem[];
  topAuthors: TopAuthor[];
}

const EditorialDeck: React.FC<EditorialDeckProps> = (props) => {
  const { stats, viewStats } = props;

  const kpis = [
    { label: 'بازدید امروز', value: stats.views.today, data: stats.views.data },
    { label: 'لایک‌ها', value: stats.likes.total, data: stats.likes.data },
    { label: 'نظرات', value: stats.comments.new, data: stats.comments.data },
    { label: 'اشتراک‌گذاری', value: stats.shares.total, data: stats.shares.data },
  ];

  return (
    <>
      <a className="ec-skip" href="#ec-main">
        پرش به محتوای اصلی
      </a>

      <main id="ec-main" className="ec-canvas" aria-label="داشبورد">
        <div className="ec-grid">
          {/* Row 1: Hero (primary anchor) + Anchor side panel */}
          <EditorialHero
            todayViews={viewStats.todayViews}
            totalViews={viewStats.totalViews}
            spark={viewStats.data}
          />
          <EditorialAnchor
            publishedTotal={stats.publishedPosts.total}
            draftsTotal={stats.drafts.total}
            commentsNew={stats.comments.new}
          />

          {/* Row 2: KPI strip */}
          {kpis.map((k) => (
            <EditorialKpi key={k.label} label={k.label} value={k.value} data={k.data} />
          ))}

          {/* Row 3: Chart (full width) */}
          <EditorialChart scheduledPosts={props.scheduledPosts} />

          {/* Row 4: Popular posts + Activity feed */}
          <EditorialPosts
            popularPosts={props.popularPosts}
            recentDrafts={props.recentDrafts}
          />
          <EditorialActivity items={props.recentActivity} />

          {/* Row 5: Market pulse + Top authors + Quick actions */}
          <EditorialMarket rates={props.marketRates} />
          <EditorialAuthors topAuthors={props.topAuthors} />
          <EditorialActions userRole={props.userRole} />
        </div>
      </main>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default EditorialDeck;
