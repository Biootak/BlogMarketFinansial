'use client';

/**
 * TideShell — TIDE 2026 (July 1) newsroom dashboard composition.
 *
 * A different top-to-bottom composition than ATLAS. The shell assembles
 * six discrete "stations" instead of one big editorial canvas:
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  LiveTicker (rates + status, marquee)                          │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │  TideCover (60/40 split — editorial + satellite)               │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │  QuickStage (2×2 primary action modules)                       │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │  DataRoom (60/40 — analytics canvas + activity stream)         │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │  ConstellationGrid (1:2:1 — calendar, health, quote)           │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │  PostsRail (horizontal scroller + drafts sidebar)              │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │  StatusFloor (5-station persistent footer)                     │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Design language:
 *   • Each "station" is its own panel — never one giant canvas.
 *   • Panels are separated by hairline rules, not big gaps, so the eye
 *     treats the whole thing as one newsroom layout.
 *   • Color: emerald/cyan/amber accents on a cool slate base.
 *   • Motion: gentle fade-in + 6px rise; no bounce.
 *
 * Accessibility:
 *   • Skip link to the main content (#tide-main).
 *   • Every station is a labelled <section> with aria-label.
 *   • The whole shell is keyboard-navigable (CommandPalette handles ⌘K).
 *
 * Public API matches DashboardShell 1:1 so the server page can swap
 * implementations without touching the data layer.
 */

import CommandPalette from '@/components/Dashboard/DashboardPage/CommandPalette';
import { motion } from '@/lib/motion-shim';
import { useSearchParams } from 'next/navigation';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Range } from '../overview/WorkspaceToolbar';
import ConstellationGrid from './ConstellationGrid';
import DataRoom from './DataRoom';
import LiveTicker, { type TickerItem } from './LiveTicker';
import PostsRail from './PostsRail';
import QuickStage from './QuickStage';
import StatusFloor from './StatusFloor';
import TideCover from './TideCover';

interface TideShellProps {
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
  recentActivity: import('../overview/ActivityRail').ActivityItem[];
  userRole: 'OWNER' | 'ADMIN' | 'AUTHOR';
}

function fmtFa(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function useTickerItems(viewStats: TideShellProps['viewStats']): TickerItem[] {
  return useMemo(() => {
    const lastIdx = viewStats.data.length - 1;
    const last = viewStats.data[lastIdx] ?? 0;
    const prev = viewStats.data[lastIdx - 1] ?? last;
    const deltaPct = prev === 0 ? 0 : ((last - prev) / prev) * 100;
    const tone: TickerItem['tone'] = deltaPct > 0.5 ? 'up' : deltaPct < -0.5 ? 'down' : 'flat';

    return [
      {
        id: 'usd-toman',
        label: 'دلار',
        value: '۶۹۲,۰۰۰',
        delta: '+۰.۴٪',
        tone: 'up',
        href: '/dashboard/exchange-rates',
      },
      {
        id: 'eur-toman',
        label: 'یورو',
        value: '۷۴۸,۰۰۰',
        delta: '−۰.۲٪',
        tone: 'down',
        href: '/dashboard/exchange-rates',
      },
      {
        id: 'gold-gram',
        label: 'طلای ۱۸',
        value: '۴,۲۵۰,۰۰۰',
        delta: '+۱.۱٪',
        tone: 'up',
        href: '/dashboard/exchange-rates',
      },
      {
        id: 'coin-emami',
        label: 'سکه‌ی امامی',
        value: '۴۲,۸۰۰,۰۰۰',
        delta: '۰.۰٪',
        tone: 'flat',
        href: '/dashboard/exchange-rates',
      },
      {
        id: 'views-today',
        label: 'بازدید امروز',
        value: fmtFa(viewStats.todayViews),
        delta: `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}٪`,
        tone,
        href: '/dashboard/reports',
      },
      {
        id: 'total-views',
        label: 'بازدید کل',
        value: fmtFa(viewStats.totalViews),
        tone: 'info',
        href: '/dashboard/reports',
      },
      {
        id: 'bazaar-sync',
        label: 'کرون بازار',
        value: '۱۰ دقیقه پیش',
        tone: 'info',
        href: '/dashboard/settings',
      },
      {
        id: 'db-latency',
        label: 'تأخیر پایگاه‌داده',
        value: '۳۲ms',
        tone: 'info',
        href: '/dashboard/settings',
      },
    ];
  }, [viewStats]);
}

const TideShell: React.FC<TideShellProps> = (props) => {
  const searchParams = useSearchParams();
  const [range, setRange] = useState<Range>(() => (searchParams?.get('range') as Range) || 'all');

  const lastUrlKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = searchParams?.toString() ?? '';
    if (key === lastUrlKeyRef.current) return;
    lastUrlKeyRef.current = key;
    const r = (searchParams?.get('range') as Range) || 'all';
    setRange(r);
  }, [searchParams]);

  const tickerItems = useTickerItems(props.viewStats);

  return (
    <>
      <a className="tide-skip" href="#tide-main">
        پرش به محتوای اصلی
      </a>

      <motion.div
        id="tide-main"
        className="tide-shell"
        aria-label="داشبورد"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Ambient aurora — a slow, GPU-friendly light field behind every
            station. Purely decorative; CSS pauses it under reduced-motion. */}
        <div className="tide-aurora" aria-hidden>
          <span className="tide-aurora__blob tide-aurora__blob--a" />
          <span className="tide-aurora__blob tide-aurora__blob--b" />
          <span className="tide-aurora__blob tide-aurora__blob--c" />
        </div>

        {/* ── 0. Live ticker ────────────────────────────────────────── */}
        <LiveTicker items={tickerItems} />

        {/* ── 1. Cover (60/40) ─────────────────────────────────────── */}
        <TideCover
          stats={props.stats}
          viewStats={props.viewStats}
          range={range}
          userRole={props.userRole}
        />

        {/* ── 2. Quick stage (2×2) ─────────────────────────────────── */}
        <QuickStage userRole={props.userRole} />

        {/* ── 3. Data room (60/40) ─────────────────────────────────── */}
        <DataRoom
          scheduledPosts={props.scheduledPosts}
          recentActivity={props.recentActivity}
          range={range}
        />

        {/* ── 4. Constellation (1:2:1) ─────────────────────────────── */}
        <ConstellationGrid scheduledPosts={props.scheduledPosts} />

        {/* ── 5. Posts rail ────────────────────────────────────────── */}
        <PostsRail popularPosts={props.popularPosts} recentDrafts={props.recentDrafts} />

        {/* ── 6. Status floor ──────────────────────────────────────── */}
        <StatusFloor />
      </motion.div>

      <CommandPalette role={props.userRole} />
    </>
  );
};

export default memo(TideShell);
