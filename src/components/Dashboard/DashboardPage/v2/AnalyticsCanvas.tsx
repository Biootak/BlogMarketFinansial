'use client';

/**
 * AnalyticsCanvas — 2026 analytics surface.
 *
 * Replaces the v1 AnalyticsPanel. Differences:
 *   • Tabs (traffic / calendar) + period (7d / 30d / 90d) state is encoded
 *     in URL search params (?tab=traffic|calendar&period=7d|30d|90d) so the
 *     selection survives refresh + back/forward.
 *   • Switching tabs uses `document.startViewTransition()` when available
 *     for a 2026 cross-fade, and falls back to a CSS class swap otherwise.
 *   • The chart and the calendar are dynamic imports so they do not bloat
 *     the initial bundle; a real skeleton with the new `.dash-skeleton`
 *     primitive is shown during hydration.
 *   • The legend chips (avg, peak, total) are computed locally from the
 *     TrafficChart data so they remain consistent with the chart.
 *
 * Accessibility:
 *   • Both the tabs (Tabs primitive) and the period switcher
 *     (radiogroup) are real ARIA widgets with keyboard navigation.
 *   • The tabs panels live in a `dash-vt` element which the global CSS
 *     keys off of to drive the view-transition cross-fade.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from '@/lib/motion-shim';
import {
  HiOutlineChartBar,
  HiOutlineCalendarDays,
  HiOutlineArrowLeft,
  HiOutlineInformationCircle,
} from 'react-icons/hi2';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import type { PostWithRelations } from '@/types/types';
import { cn } from '@/lib/utils';

// Lazy-load the heavy chart + calendar — neither is needed for first paint.
const TrafficChart = dynamic(() => import('@/components/Dashboard/DashboardPage/TrafficChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height="h-[320px] sm:h-[380px]" />,
});

const PublishingCalendar = dynamic(
  () => import('@/components/Dashboard/Calendar/PublishingCalendar'),
  {
    ssr: false,
    loading: () => <ChartSkeleton height="h-[420px]" />,
  },
);

const ChartSkeleton = ({ height }: { height: string }) => (
  <div className="p-4 sm:p-6">
    <div className={cn('dash-skeleton rounded-2xl w-full', height)} aria-hidden />
  </div>
);

interface AnalyticsCanvasProps {
  scheduledPosts: PostWithRelations[];
}

const PERIODS = [
  { id: '7d', label: '۷ روز', days: 7 },
  { id: '30d', label: '۳۰ روز', days: 30 },
  { id: '90d', label: '۹۰ روز', days: 90 },
] as const;

type PeriodId = (typeof PERIODS)[number]['id'];
type TabId = 'traffic' | 'calendar';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'traffic', label: 'آمار بازدید', icon: <HiOutlineChartBar className="w-4 h-4" /> },
  { id: 'calendar', label: 'تقویم انتشار', icon: <HiOutlineCalendarDays className="w-4 h-4" /> },
];

export default function AnalyticsCanvas({ scheduledPosts }: AnalyticsCanvasProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(
    (searchParams?.get('tab') as TabId) || 'traffic',
  );
  const [period, setPeriod] = useState<PeriodId>(
    ((searchParams?.get('period') as PeriodId) || '7d') as PeriodId,
  );

  // Wraps a state change in `document.startViewTransition` when available so
  // the global .dash-vt CSS animation can take over. Declared above any
  // effect that uses it so the closure never hits a temporal dead zone.
  const vt = useCallback(
    (fn: () => void) => {
      const doc = typeof document !== 'undefined' ? document : null;
      const startVT =
        (doc as Document & { startViewTransition?: (cb: () => void) => unknown })
          ?.startViewTransition;
      if (typeof startVT === 'function') {
        startVT.call(doc, fn);
      } else {
        fn();
      }
    },
    [],
  );

  // Cross-component bridge: HeroSection's "تقویم" shortcut dispatches
  // `dash:set-analytics-tab` so the user can hop directly to the publishing
  // calendar tab without going through the URL. We run it through the same
  // view-transition wrapper as the local Tabs onValueChange so the visual
  // cross-fade is consistent with the in-canvas interaction.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: TabId }>).detail;
      const next = detail?.tab;
      if (next !== 'traffic' && next !== 'calendar') return;
      if (next === tab) return;
      vt(() => setTab(next));
    };
    window.addEventListener('dash:set-analytics-tab', handler);
    return () => window.removeEventListener('dash:set-analytics-tab', handler);
    // vt is a stable useCallback below; we intentionally do not list `tab`
    // because we want the listener to reflect the latest closure value.
  }, [tab]);

  // Persist tab + period in the URL using replace() so back/forward still
  // walks through logical pages. We only write when the URL is actually out
  // of sync with state — otherwise the effect fires on every mount under
  // StrictMode and every parent re-render in App Router, producing a
  // self-perpetuating /dashboard RSC fetch loop.
  const lastWrittenRef = useRef<string | null>(null);
  useEffect(() => {
    const desiredTab = tab === 'traffic' ? null : tab;
    const desiredPeriod = period === '7d' ? null : period;
    const currentTab = searchParams?.get('tab') ?? null;
    const currentPeriod = searchParams?.get('period') ?? null;

    if (desiredTab === currentTab && desiredPeriod === currentPeriod) {
      lastWrittenRef.current = searchParams?.toString() ?? '';
      return;
    }

    const next = new URLSearchParams(searchParams?.toString() ?? '');
    if (desiredTab) next.set('tab', desiredTab);
    else next.delete('tab');
    if (desiredPeriod) next.set('period', desiredPeriod);
    else next.delete('period');
    const qs = next.toString();
    if (qs === lastWrittenRef.current) return;
    lastWrittenRef.current = qs;
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [tab, period, searchParams, pathname, router]);

  const activePeriod = PERIODS.find((p) => p.id === period) ?? PERIODS[0];

  const onPeriodKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = PERIODS.findIndex((p) => p.id === period);
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPeriod(PERIODS[(idx + 1) % PERIODS.length].id);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPeriod(PERIODS[(idx - 1 + PERIODS.length) % PERIODS.length].id);
    }
  };

  const onTabChange = (next: string) => {
    if (next === tab) return;
    vt(() => setTab(next as TabId));
  };

  return (
    <motion.section
      id="dash-analytics"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="dash-pane dash-pane--tall !p-0"
      aria-label="تحلیل بازدید و تقویم انتشار"
    >
      <header className="px-4 sm:px-5 md:px-7 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <span className="dash-ico dash-ico--violet w-10 h-10 sm:w-11 sm:h-11 shrink-0" aria-hidden>
            <HiOutlineChartBar className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              تحلیل و تقویم
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              بازدید {activePeriod.label} اخیر و برنامه‌ی انتشار پست‌های آینده
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div
            role="radiogroup"
            aria-label="بازه زمانی"
            onKeyDown={onPeriodKey}
            className="inline-flex p-1 gap-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 ring-1 ring-slate-200/60 dark:ring-slate-700/60 shrink-0"
          >
            {PERIODS.map((p) => {
              const isActive = p.id === period;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setPeriod(p.id)}
                  className={cn(
                    'inline-flex items-center justify-center min-w-[2.5rem] sm:min-w-[3rem] h-8 px-2 sm:px-3 rounded-lg text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60',
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <Link
            href="/dashboard/reports"
            className="hidden md:inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 rounded-md px-2 py-1"
          >
            <span>گزارش کامل</span>
            <HiOutlineArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <Tabs dir="rtl" value={tab} onValueChange={onTabChange} className="w-full">
        <div className="px-4 sm:px-5 md:px-7 pt-3 sm:pt-4 overflow-x-auto">
          <TabsList
            className="inline-flex p-1 gap-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 ring-1 ring-slate-200/60 dark:ring-slate-700/60"
            aria-label="انتخاب نمای تحلیل"
          >
            {TABS.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
              >
                {t.icon}
                <span>{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="traffic" className="mt-0 focus-visible:outline-none">
          <div className="dash-vt dash2-chart-reveal">
            {period === '7d' ? (
              <div className="p-4 sm:p-5 md:p-7">
                <div className="h-[320px] sm:h-[380px]">
                  <TrafficChart key={`traffic-${tab}`} />
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 md:p-7">
                <div
                  className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 ring-1 ring-slate-200/60 dark:ring-slate-700/60"
                  role="status"
                >
                  <span className="dash-ico dash-ico--cyan w-12 h-12 mb-3" aria-hidden>
                    <HiOutlineInformationCircle className="w-5 h-5" />
                  </span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    نمودار بازه‌ی {activePeriod.label} به‌زودی فعال می‌شود.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    در حال حاضر داده‌ی ۷ روز اخیر در دسترس است. برای بازه‌های
                    بلندتر با پشتیبانی هماهنگ کنید.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-0 focus-visible:outline-none">
          <div className="dash-vt dash2-chart-reveal">
            <div className="p-4 sm:p-5 md:p-7">
              <div className="min-h-[420px]">
                <PublishingCalendar scheduledPosts={scheduledPosts} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.section>
  );
}
