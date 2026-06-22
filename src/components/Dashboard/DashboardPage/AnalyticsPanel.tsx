'use client';

/**
 * AnalyticsPanel — 2026 redesign (v2).
 *
 * Single editorial surface that hosts the traffic chart and the
 * publishing calendar as switchable views. The header carries:
 *   • A leading icon + title + description
 *   • A period switcher (7d / 30d / 90d) — currently a UI switcher;
 *     30d / 90d render a "soon" placeholder until a longer-history
 *     action is added (the data layer is intentionally untouched).
 *   • A "view all" link on the right
 *
 * Visually it's a quiet glass card (no infinite gradients / glows) that
 * matches the rest of the redesigned dashboard. Both the chart and the
 * calendar are dynamic imports; the wrapper renders a real skeleton
 * while they hydrate so the layout never shifts.
 *
 * Accessibility:
 *   • <section> with aria-label.
 *   • The segmented control is a real ARIA tablist (Tabs primitive).
 *   • The period switcher uses a real radiogroup with arrow-key support.
 *   • All buttons and the tab list expose clear focus rings.
 */

import { useState, type KeyboardEvent } from 'react';
import { motion } from '@/lib/motion-shim';
import {
  HiOutlineChartBar,
  HiOutlineCalendarDays,
  HiOutlineArrowLeft,
  HiOutlineInformationCircle,
} from 'react-icons/hi2';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { PostWithRelations } from '@/types/types';
import { cn } from '@/lib/utils';

// Lazy-load the heavy chart + calendar — neither is needed for first paint.
const TrafficChart = dynamic(() => import('./TrafficChart'), {
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
    <div
      className={cn(
        'w-full rounded-xl bg-slate-100/70 dark:bg-slate-800/40 animate-pulse',
        height,
      )}
    />
  </div>
);

interface AnalyticsPanelProps {
  scheduledPosts: PostWithRelations[];
}

const PERIODS = [
  { id: '7d', label: '۷ روز', days: 7 },
  { id: '30d', label: '۳۰ روز', days: 30 },
  { id: '90d', label: '۹۰ روز', days: 90 },
] as const;
type PeriodId = (typeof PERIODS)[number]['id'];

export default function AnalyticsPanel({ scheduledPosts }: AnalyticsPanelProps) {
  const [period, setPeriod] = useState<PeriodId>('7d');
  const activePeriod = PERIODS.find((p) => p.id === period) ?? PERIODS[0];

  const onPeriodKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = PERIODS.findIndex((p) => p.id === period);
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = PERIODS[(idx + 1) % PERIODS.length];
      setPeriod(next.id);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const prev = PERIODS[(idx - 1 + PERIODS.length) % PERIODS.length];
      setPeriod(prev.id);
    }
  };

  return (
    <section
      aria-label="تحلیل بازدید و تقویم انتشار"
      className="dash-panel overflow-hidden"
    >
      {/* Header strip */}
      <header className="px-5 sm:px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <span
            className="dash-ico dash-ico--violet w-11 h-11 shrink-0"
            aria-hidden="true"
          >
            <HiOutlineChartBar className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              تحلیل و تقویم
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              بازدید {activePeriod.label} اخیر و برنامه‌ی انتشار پست‌های آینده
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period switcher */}
          <div
            role="radiogroup"
            aria-label="بازه زمانی"
            onKeyDown={onPeriodKey}
            className="inline-flex p-1 gap-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 ring-1 ring-slate-200/60 dark:ring-slate-700/60"
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
                    'inline-flex items-center justify-center min-w-[3rem] h-8 px-3 rounded-lg text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60',
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* View-all link */}
          <Link
            href="/dashboard/reports"
            className="hidden sm:inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 rounded-md px-2 py-1"
          >
            <span>گزارش کامل</span>
            <HiOutlineArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <Tabs dir="rtl" defaultValue="traffic" className="w-full">
        <div className="px-5 sm:px-7 pt-4">
          <TabsList
            className="inline-flex p-1 gap-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 ring-1 ring-slate-200/60 dark:ring-slate-700/60"
            aria-label="انتخاب نمای تحلیل"
          >
            <TabsTrigger
              value="traffic"
              className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
            >
              <HiOutlineChartBar className="w-4 h-4" />
              <span>آمار بازدید</span>
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
            >
              <HiOutlineCalendarDays className="w-4 h-4" />
              <span>تقویم انتشار</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="traffic" className="mt-0 focus-visible:outline-none">
          {period === '7d' ? (
            <motion.div
              key="traffic-7d"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="p-5 sm:p-7">
                <div className="h-[320px] sm:h-[380px]">
                  <TrafficChart />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`traffic-${period}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="p-5 sm:p-7"
            >
              <div
                className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 ring-1 ring-slate-200/60 dark:ring-slate-700/60"
                role="status"
              >
                <span
                  className="dash-ico dash-ico--cyan w-12 h-12 mb-3"
                  aria-hidden="true"
                >
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
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-0 focus-visible:outline-none">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="p-5 sm:p-7">
              <div className="min-h-[420px]">
                <PublishingCalendar scheduledPosts={scheduledPosts} />
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
