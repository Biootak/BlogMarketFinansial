'use client';

/**
 * AtelierDeck — Atelier 2026 (2026-07-04) — dashboard home redesign.
 *
 * Visual identity: Persian-modern. Hairline borders, single emerald
 * accent (with a single gold accent for "lead" elements only), zero
 * glassmorphism. A live market ticker band rides the top of the page;
 * the hero carries a radial pulse chart (today vs total) and an
 * eight-point brand mark; the engagement console (likes comments
 * shares + engagement-rate) sits in Row 2 as a single panoramic tile;
 * the chart sits full-width on its own row; posts + activity fill
 * row 4; authors + actions fill row 5.
 *
 * 2026-07-04 (evening): ردیف ۲ — چهار کاشی KPI یکنواخت (بازدید،
 * لایک، نظر، اشتراک) با یک کارت پانورامای واحد «تعامل
 * مخاطبان» جایگزین شد. بازدید امروز قبلاً در Hero با تایپوگرافی
 * غول‌پیکر نشسته و تکراری بود؛ حالا فقط متریک‌های تعامل
 * (لایک، نظر، اشتراک + نرخ تعامل مشتق) در این ردیف می‌نشینند
 * با یک قلب SVG با EKG-اسپارک‌لاین به‌عنوان نقطهٔ کانونی.
 *
 * 2026-07-04 (night): ردیف ۳.۵ — تقویم ماهانهٔ انتشار (`AtelierMonthCalendar`)
 * به‌صورت inline بین `AtelierWeekRhythm` و `AtelierChart` اضافه شد
 * تا داشبورد از پایین‌ترین مقیاس (هفتۀ جاری) تا ماه جاری، همه در
 * یک صفحه قابل مرور باشد.
 *
 * 2026-07-04 (late night): صفحهٔ جداگانهٔ `/dashboard/posts/calendar`
 * ساخته شد. سپس ردیف inline از داشبورد حذف شد چون تقویم کامل فقط
 * در صفحهٔ مستقلش زندگی می‌کند — یک مکان، یک منبع حقیقت. لینک
 * «تقویم کامل» در `AtelierWeekRhythm` کاربر را به آن صفحه می‌برد.
 * `AtelierWeekRhythm` (هفتۀ جاری) همچنان داخل داشبورد است؛ تقویم
 * ماهانه فقط در `/dashboard/posts/calendar`.
 *
 * Layout (desktop ≥1280px):
 *   ┌────────────────────────────────────────────────────────┐
 *   │  TICKER (live market rates, full-bleed)                │
 *   ├─────────────────────────────┬──────────────────────────┤
 *   │  HERO (anchor + radial pulse)                          │
 *   ├─────────────────────────────┴──────────────────────────┤
 *   │  ENGAGEMENT (heart focal + 3 satellite cards)         │
 *   ├────────────────────────────────────────────────────────┤
 *   │  WEEK RHYTHM — 7-day bar chart + spotlight + agenda   │
 *   │   («تقویم کامل» link → /dashboard/posts/calendar)    │
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
import type { ActivityItem } from '../overview/ActivityRail';
import AtelierActions from './tiles/AtelierActions';
import AtelierActivity from './tiles/AtelierActivity';
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
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
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
          {/* Row 1: Hero (anchor + radial pulse) */}
          <AtelierHero
            todayViews={viewStats.todayViews}
            totalViews={viewStats.totalViews}
            spark={viewStats.data}
            publishedTotal={stats.publishedPosts.total}
          />

          {/* Row 2: Engagement console (heart + comments + shares + rate) */}
          <AtelierEngagement stats={stats} />

          {/* Row 3: Week rhythm (ضرباهنگ هفته) — 2026-07-04 redesign. */}
          {/* «تقویم کامل» link در سرصفحه‌اش به /dashboard/posts/calendar می‌رود. */}
          <AtelierWeekRhythm scheduledPosts={props.scheduledPosts} />

          {/* Row 4: Chart (full width) — فقط تحلیل بازدید. تقویم انتشار در */}
          {/* `/dashboard/posts/calendar` زندگی می‌کند، نه اینجا. */}
          <AtelierChart />

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
