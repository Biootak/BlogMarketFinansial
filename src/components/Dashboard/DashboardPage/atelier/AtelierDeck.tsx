'use client';

/**
 * AtelierDeck — Atelier 2026 (2026-07-04) — dashboard home redesign.
 *
 * 2026-07-04 (night pass 2) — ادغام کامل «دسترسی سریع» در کارت پیشخوان:
 *   1. کاشی جداگانهٔ AtelierActions حذف شد. دلیل: کاربر به محض ورود به
 *      پیشخوان نباید برای رسیدن به «نوشتن پست / نرخ ارز / کاربران /
 *      تنظیمات» scroll کند؛ این‌ها باید داخل خود کارت Hero (پیشخوان)
 *      به‌صورت کارت‌های کوچک دیده شوند.
 *   2. Hero اکنون `userRole` می‌گیرد و یک گرید کوچک ۴ تایی از
 *      Quick Access در پایین خودش نشان می‌دهد (compact، هم‌عرض با
 *      sparkline و CTAs).
 *   3. چیدمان deck به ۶ ردیف کاهش یافت (Hero+QuickAccess یکپارچه
 *      شد، یک ردیف آزاد شد). ردیف‌های باقی‌مانده دست‌نخورده‌اند.
 *
 * Layout (desktop ≥1280px):
 *   ┌────────────────────────────────────────────────────────┐
 *   │  ROW 0: TICKER (live market rates, full-bleed)        │
 *   ├────────────────────────────────────────────────────────┤
 *   │  ROW 1: HERO + QUICK ACCESS (یکپارچه، full)            │
 *   │        • greeting + بازدید امروز + radial pulse        │
 *   │        • sparkline + CTAs                              │
 *   │        • گرید ۴ تایی Quick Access (کارت‌های کوچک)       │
 *   ├────────────────────────────────────────────────────────┤
 *   │  ROW 2: ENGAGEMENT (heart focal + 3 satellites) — full│
 *   ├────────────────────────────────────────────────────────┤
 *   │  ROW 3: WEEK RHYTHM — 7-day bars + spotlight + agenda │
 *   ├────────────────────────────────────────────────────────┤
 *   │  ROW 4: CHART (analytics + tabs + period) — full      │
 *   ├─────────────────────────────┬──────────────────────────┤
 *   │  ROW 5: EDITORIAL POSTS     │  PULSE ACTIVITY           │
 *   │   (Featured + ranked, 8/12)│   (filter + avatar, 4/12) │
 *   ├─────────────────────────────┴──────────────────────────┤
 *   │  ROW 6: AUTHORS LEADERBOARD — full-width compact      │
 *   └────────────────────────────────────────────────────────┘
 */

import type { TopAuthor } from '@/actions/getTopAuthors';
import CommandPalette from '@/components/Dashboard/DashboardPage/CommandPalette';
import MarketRatesTicker from '@/components/MarketRates/MarketRatesTicker';
import type { MarketRateItem } from '@/lib/market-rates';
import AtelierActivity, { type ActivityItem } from './tiles/AtelierActivity';
import AtelierAuthors from './tiles/AtelierAuthors';
import AtelierChart from './tiles/AtelierChart';
import AtelierEngagement from './tiles/AtelierEngagement';
import AtelierHero from './tiles/AtelierHero';
import AtelierPosts from './tiles/AtelierPosts';
import AtelierWeekRhythm from './tiles/AtelierWeekRhythm';

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
  userRole: 'OWNER' | 'SUPERADMIN' | 'ADMIN' | 'AUTHOR';
  marketRates: MarketRateItem[];
  topAuthors: TopAuthor[];
}

const AtelierDeck: React.FC<AtelierDeckProps> = (props) => {
  const { stats, viewStats } = props;

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
          {/* Row 1: Hero (anchor + radial pulse + quick access grid embedded) */}
          <AtelierHero
            todayViews={viewStats.todayViews}
            totalViews={viewStats.totalViews}
            spark={viewStats.data}
            publishedTotal={stats.publishedPosts.total}
            userRole={props.userRole}
          />

          {/* Row 2: Engagement console (heart + comments + shares + rate) */}
          <AtelierEngagement stats={stats} />

          {/* Row 3: Week rhythm (ضرباهنگ هفته) — 2026-07-04 redesign. */}
          {/* «تقویم کامل» link در سرصفحه‌اش به /dashboard/posts/calendar می‌رود. */}
          <AtelierWeekRhythm scheduledPosts={props.scheduledPosts} />

          {/* Row 4: Chart (full width) — دیتای عمیق بعد از تصمیم‌گیری عملی. */}
          <AtelierChart viewStats={viewStats} statsData={stats.views.data} />

          {/* Row 5: Editorial Posts (8/12) | Pulse Activity (4/12) — real-time */}
          {/* content. Posts عریض‌تر چون Featured card جدید دارد. Activity کم‌عرض */}
          {/* چون فقط timeline + avatar است. */}
          <AtelierPosts popularPosts={props.popularPosts} recentDrafts={props.recentDrafts} />
          <AtelierActivity items={props.recentActivity} />

          {/* Row 6: Authors Leaderboard — full-width compact. metadata هست */}
          {/* و real-time نیست؛ بعد از real-time می‌آید. عرض کامل برای */}
          {/* sparkline + posts column + views/post column بدون overflow. */}
          <AtelierAuthors topAuthors={props.topAuthors} />
        </div>
      </main>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default AtelierDeck;
