'use client';

/**
 * ChartTile — NOVA analytics tile (traffic + publishing calendar).
 *
 * Reuses the existing data-bound `TrafficChart` and `PublishingCalendar`
 * (both lazy, ssr:false) inside a deep-glass panel with a segmented tab
 * switch and a period radio group. `.nova-embed` neutralises the reused
 * components' own card chrome so they read as one NOVA surface.
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { HiOutlineCalendarDays, HiOutlineChartBar } from 'react-icons/hi2';

const TrafficChart = dynamic(() => import('@/components/Dashboard/DashboardPage/TrafficChart'), {
  ssr: false,
  loading: () => <div className="nova-skeleton" aria-hidden />,
});

const PublishingCalendar = dynamic(
  () => import('@/components/Dashboard/Calendar/PublishingCalendar'),
  { ssr: false, loading: () => <div className="nova-skeleton" aria-hidden /> },
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

interface ChartTileProps {
  scheduledPosts: PostWithRelations[];
}

export default function ChartTile({ scheduledPosts }: ChartTileProps) {
  const [tab, setTab] = useState<TabId>('traffic');
  const [period, setPeriod] = useState<PeriodId>('7d');
  const tabId = useId();

  return (
    <section className="nova-tile nova-tile--chart" data-tone="primary" aria-label="تحلیل بازدید و تقویم">
      <Spotlight tone="indigo" size={440} />
      <header className="nova-panel__head">
        <div className="nova-panel__head-title">
          <span className="nova-panel__head-ico" aria-hidden>
            <HiOutlineChartBar className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h2 className="nova-panel__title">تحلیل بازدید و تقویم</h2>
            <p className="nova-panel__sub">
              روند {PERIODS.find((p) => p.id === period)?.label} اخیر + برنامهٔ انتشار
            </p>
          </div>
        </div>

        {tab === 'traffic' && (
          // biome-ignore lint/a11y/useSemanticElements: ARIA radiogroup on styled buttons is the correct pattern
          <div className="nova-seg" role="radiogroup" aria-label="بازهٔ زمانی">
            {PERIODS.map((p) => (
              // biome-ignore lint/a11y/useSemanticElements: ARIA radio inside radiogroup
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === period}
                onClick={() => setPeriod(p.id)}
                className={cn('nova-seg__btn', p.id === period && 'is-active')}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="nova-tabs" role="tablist" aria-label="نمای داده">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`${tabId}-${t.id}`}
            id={`${tabId}-trigger-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn('nova-tab', tab === t.id && 'is-active')}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="nova-embed nova-chart__canvas">
        {tab === 'traffic' ? (
          <div role="tabpanel" id={`${tabId}-traffic`} aria-labelledby={`${tabId}-trigger-traffic`}>
            <TrafficChart key={`traffic-${period}`} period={period} />
          </div>
        ) : (
          <div role="tabpanel" id={`${tabId}-calendar`} aria-labelledby={`${tabId}-trigger-calendar`}>
            <PublishingCalendar scheduledPosts={scheduledPosts} />
          </div>
        )}
      </div>
    </section>
  );
}
