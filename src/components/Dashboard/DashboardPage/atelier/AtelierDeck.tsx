'use client';

/**
 * AtelierDeck — Atelier 2026 (2026-07-04) — dashboard home redesign.
 *
 * Visual identity: Persian-modern. Hairline borders, single emerald
 * accent (with a single gold accent for "lead" elements only), zero
 * glassmorphism. A live market ticker band rides the top of the page;
 * the hero carries a radial pulse chart (today vs total) and an
 * eight-point brand mark; KPIs sit in a clean 4-up strip; the chart
 * sits full-width on its own row; posts + activity fill row 4;
 * authors + actions fill row 5.
 *
 * 2026-07-04: کاشی `AtelierMarket` («نبض بازار») حذف شد تا یک بخش
 * واحد برای نمایش نرخ‌های بازار در داشبورد باقی بماند. نوار
 * `MarketRatesTicker` (ردیف ۰) تنها منبع نمایش زنده است و درصد
 * تغییر هر نماد در خودش دارد؛ نیازی به کاشی جداگانه نیست.
 *
 * Layout (desktop ≥1280px):
 *   ┌────────────────────────────────────────────────────────┐
 *   │  TICKER (live market rates, full-bleed)                │
 *   ├───────────────────────────────────┬────────────────────┤
 *   │  HERO (anchor + radial pulse)     │                    │
 *   ├──────────┬──────────┬─────────────┴────────────────────┤
 *   │  KPI 1   │  KPI 2   │  KPI 3   │  KPI 4              │
 *   ├──────────┴──────────┴──────────┴──────────────────────┤
 *   │  WEEK STRIP — 7 days (Sat→Fri) + density              │
 *   ├────────────────────────────────────────────────────────┤
 *   │  CHART (analytics + tabs + period)                    │
 *   ├────────────────────────────┬───────────────────────────┤
 *   │  POPULAR POSTS             │  ACTIVITY (day-grouped)   │
 *   ├────────────────────────────┴───────────────────────────┤
 *   │  AUTHORS (wider)              │  ACTIONS               │
 *   └───────────────────────────────┴────────────────────────┘
 */

import type { TopAuthor } from '@/actions/getTopAuthors';
import CommandPalette from '@/components/Dashboard/DashboardPage/CommandPalette';
import MarketRatesTicker from '@/components/MarketRates/MarketRatesTicker';
import type { MarketRateItem } from '@/lib/market-rates';
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineEye,
  HiOutlineHeart,
  HiOutlineShare,
} from 'react-icons/hi2';
import type { ActivityItem } from '../overview/ActivityRail';
import AtelierActions from './tiles/AtelierActions';
import AtelierActivity from './tiles/AtelierActivity';
import AtelierAuthors from './tiles/AtelierAuthors';
import AtelierChart from './tiles/AtelierChart';
import AtelierHero from './tiles/AtelierHero';
import AtelierKpi from './tiles/AtelierKpi';
import AtelierPosts from './tiles/AtelierPosts';
import AtelierWeekStrip from './tiles/AtelierWeekStrip';

interface AtelierDeckProps {
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

const AtelierDeck: React.FC<AtelierDeckProps> = (props) => {
  const { stats, viewStats } = props;

  const kpis = [
    {
      label: 'بازدید امروز',
      value: stats.views.today,
      data: stats.views.data,
      icon: <HiOutlineEye className="w-3.5 h-3.5" />,
    },
    {
      label: 'لایک‌ها',
      value: stats.likes.total,
      data: stats.likes.data,
      icon: <HiOutlineHeart className="w-3.5 h-3.5" />,
    },
    {
      label: 'نظرات',
      value: stats.comments.new,
      data: stats.comments.data,
      icon: <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" />,
    },
    {
      label: 'اشتراک‌گذاری',
      value: stats.shares.total,
      data: stats.shares.data,
      icon: <HiOutlineShare className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <>
      <a className="at-skip" href="#at-main">
        پرش به محتوای اصلی
      </a>

      <main id="at-main" className="at-canvas" aria-label="داشبورد">
        {/* Row 0: live market ticker (full-bleed) — single source for the project */}
        <div className="px-4 pt-4 sm:px-6 lg:px-8">
          <MarketRatesTicker rates={props.marketRates} maxItems={14} />
        </div>

        <div className="at-grid">
          {/* Row 1: Hero (anchor + radial pulse) */}
          <AtelierHero
            todayViews={viewStats.todayViews}
            totalViews={viewStats.totalViews}
            spark={viewStats.data}
            publishedTotal={stats.publishedPosts.total}
          />

          {/* Row 2: KPI strip */}
          {kpis.map((k) => (
            <AtelierKpi key={k.label} label={k.label} value={k.value} data={k.data} icon={k.icon} />
          ))}

          {/* Row 3: Week strip (7 days) */}
          <AtelierWeekStrip scheduledPosts={props.scheduledPosts} />

          {/* Row 4: Chart (full width) */}
          <AtelierChart scheduledPosts={props.scheduledPosts} />

          {/* Row 5: Popular posts + Activity feed */}
          <AtelierPosts popularPosts={props.popularPosts} />
          <AtelierActivity items={props.recentActivity} />

          {/* Row 6: Authors + Actions (نرخ‌های بازار در نوار بالا نمایش داده می‌شود) */}
          <AtelierAuthors topAuthors={props.topAuthors} />
          <AtelierActions userRole={props.userRole} />
        </div>
      </main>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default AtelierDeck;
