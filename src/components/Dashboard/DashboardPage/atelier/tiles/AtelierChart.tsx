'use client';

/**
 * AtelierChart — analytics tile with tab switcher + period selector.
 *
 * Wraps the existing TrafficChart and PublishingCalendar lazy components
 * (the same one EditorialChart reuses) in the new atelier shell.
 */

import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { HiOutlineCalendarDays, HiOutlineChartBar } from 'react-icons/hi2';

const TrafficChart = dynamic(() => import('@/components/Dashboard/DashboardPage/TrafficChart'), {
  ssr: false,
  loading: () => (
    <div className="at-chart__skeleton" aria-hidden />
  ),
});

const PublishingCalendar = dynamic(
  () => import('@/components/Dashboard/Calendar/PublishingCalendar'),
  {
    ssr: false,
    loading: () => (
      <div className="at-chart__skeleton" aria-hidden />
    ),
  },
);

const PERIODS = [
  { id: '7d', label: '۷ روز' },
  { id: '30d', label: '۳۰ روز' },
  { id: '90d', label: '۹۰ روز' },
] as const;

type PeriodId = (typeof PERIODS)[number]['id'];
type TabId = 'traffic' | 'calendar';

const TABS: ReadonlyArray<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'traffic', label: 'آمار بازدید', icon: <HiOutlineChartBar className="w-4 h-4" /> },
  { id: 'calendar', label: 'تقویم انتشار', icon: <HiOutlineCalendarDays className="w-4 h-4" /> },
];

interface AtelierChartProps {
  scheduledPosts: PostWithRelations[];
}

export default function AtelierChart({ scheduledPosts }: AtelierChartProps) {
  const [tab, setTab] = useState<TabId>('traffic');
  const [period, setPeriod] = useState<PeriodId>('7d');
  const tabId = useId();

  return (
    <section className="at-tile at-chart" aria-label="تحلیل بازدید و تقویم">
      <header className="at-chart__head">
        <div className="at-head">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineChartBar className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">تحلیل بازدید و تقویم</h2>
            <p className="at-head__sub">
              روند {PERIODS.find((p) => p.id === period)?.label} اخیر + برنامهٔ انتشار
            </p>
          </div>
        </div>

        <div className="at-chart__controls">
          <div className="at-chart__tabs" role="tablist" aria-label="نمای داده">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`${tabId}-${t.id}`}
                id={`${tabId}-trigger-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn('at-chart__tab', tab === t.id && 'is-active')}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {tab === 'traffic' && (
            <div className="at-chart__segs" role="radiogroup" aria-label="بازهٔ زمانی">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={p.id === period}
                  onClick={() => setPeriod(p.id)}
                  className={cn('at-chart__seg', p.id === period && 'is-active')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="at-chart__canvas">
        {tab === 'traffic' ? (
          <div
            role="tabpanel"
            id={`${tabId}-traffic`}
            aria-labelledby={`${tabId}-trigger-traffic`}
          >
            <TrafficChart key={`traffic-${period}`} period={period} />
          </div>
        ) : (
          <div
            role="tabpanel"
            id={`${tabId}-calendar`}
            aria-labelledby={`${tabId}-trigger-calendar`}
          >
            <PublishingCalendar scheduledPosts={scheduledPosts} />
          </div>
        )}
      </div>
    </section>
  );
}
