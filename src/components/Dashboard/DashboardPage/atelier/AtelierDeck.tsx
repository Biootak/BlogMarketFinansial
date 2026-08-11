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
import MarketRatesTicker from '@/components/MarketRates/MarketRatesTicker';
import type { MarketRateItem } from '@/lib/market-rates';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import AtelierActivity, { type ActivityItem } from './tiles/AtelierActivity';
import AtelierAuthors from './tiles/AtelierAuthors';
import AtelierChart from './tiles/AtelierChart';
import AtelierEngagement from './tiles/AtelierEngagement';
import AtelierHero from './tiles/AtelierHero';
import AtelierPosts from './tiles/AtelierPosts';
import AtelierWeekRhythm from './tiles/AtelierWeekRhythm';

/**
 * AtelierTileBoundary — هر کاشی داشبورد را ایزوله می‌کند.
 * اگر دادهٔ یک کاشی shape اشتباه داشته باشد یا خطای runtime بدهد،
 * فقط همان کاشی fallback نشان می‌دهد و کل داشبورد crash نمی‌شود.
 */
class AtelierTileBoundary extends Component<
  { name: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  private retry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="at-tile-fallback"
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '1.5rem',
            margin: '0.75rem',
            borderRadius: 'var(--ds-radius-md, 12px)',
            background: 'var(--ds-surface, #fff)',
            border: '1px dashed var(--ds-border-strong, #d4d8e0)',
            color: 'var(--ds-text-muted, #667)',
            fontSize: 'var(--ds-text-sm, 13px)',
            textAlign: 'center',
          }}
        >
          <span aria-hidden>⚠️</span>
          <span>این بخش موقتاً در دسترس نیست.</span>
          <button
            type="button"
            onClick={this.retry}
            style={{
              padding: '0.3rem 0.9rem',
              borderRadius: '999px',
              border: '1px solid var(--ds-border-strong, #d4d8e0)',
              background: 'var(--ds-surface-recessed, #f1f2f5)',
              cursor: 'pointer',
            }}
          >
            تلاش مجدد
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
          <AtelierTileBoundary name="ticker">
            <MarketRatesTicker rates={props.marketRates} maxItems={14} />
          </AtelierTileBoundary>
        </div>

        <div className="at-grid">
          {/* Row 1: Hero (anchor + radial pulse + quick access grid embedded) */}
          <AtelierTileBoundary name="hero">
            <AtelierHero
              todayViews={viewStats.todayViews}
              totalViews={viewStats.totalViews}
              spark={viewStats.data}
              publishedTotal={stats.publishedPosts.total}
              userRole={props.userRole}
            />
          </AtelierTileBoundary>

          {/* Row 2: Engagement console (heart + comments + shares + rate) */}
          <AtelierTileBoundary name="engagement">
            <AtelierEngagement stats={stats} />
          </AtelierTileBoundary>

          {/* Row 3: Week rhythm (ضرباهنگ هفته) — 2026-07-04 redesign. */}
          {/* «تقویم کامل» link در سرصفحه‌اش به /dashboard/posts/calendar می‌رود. */}
          <AtelierTileBoundary name="week-rhythm">
            <AtelierWeekRhythm scheduledPosts={props.scheduledPosts} />
          </AtelierTileBoundary>

          {/* Row 4: Chart (full width) — دیتای عمیق بعد از تصمیم‌گیری عملی. */}
          <AtelierTileBoundary name="chart">
            <AtelierChart viewStats={viewStats} statsData={stats.views.data} />
          </AtelierTileBoundary>

          {/* Row 5: Editorial Posts (8/12) | Pulse Activity (4/12) — real-time */}
          {/* content. Posts عریض‌تر چون Featured card جدید دارد. Activity کم‌عرض */}
          {/* چون فقط timeline + avatar است. */}
          <AtelierTileBoundary name="posts">
            <AtelierPosts popularPosts={props.popularPosts} recentDrafts={props.recentDrafts} />
          </AtelierTileBoundary>
          <AtelierTileBoundary name="activity">
            <AtelierActivity items={props.recentActivity} />
          </AtelierTileBoundary>

          {/* Row 6: Authors Leaderboard — full-width compact. metadata هست */}
          {/* و real-time نیست؛ بعد از real-time می‌آید. عرض کامل برای */}
          {/* sparkline + posts column + views/post column بدون overflow. */}
          <AtelierTileBoundary name="authors">
            <AtelierAuthors topAuthors={props.topAuthors} />
          </AtelierTileBoundary>
        </div>
      </main>
    </>
  );
};

export default AtelierDeck;
