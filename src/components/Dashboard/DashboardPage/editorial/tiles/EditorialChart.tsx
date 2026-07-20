'use client';

/**
 * EditorialChart — analytics tile with tab switcher + period selector.
 *
 * Reuses TrafficChart and PublishingCalendar (both lazy) without their
 * internal card chrome. Same data wiring as the former NOVA chart tile;
 * new shell with hairline border and calmer tabs.
 */

import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { HiOutlineCalendarDays, HiOutlineChartBar } from 'react-icons/hi2';

const TrafficChart = dynamic(() => import('@/components/Dashboard/DashboardPage/TrafficChart'), {
  ssr: false,
  loading: () => (
    <div
      className="h-72 w-full rounded-md"
      style={{ background: 'var(--ec-bg-elevated)' }}
      aria-hidden
    />
  ),
});

const PublishingCalendar = dynamic(
  () => import('@/components/Dashboard/Calendar/PublishingCalendar'),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-72 w-full rounded-md"
        style={{ background: 'var(--ec-bg-elevated)' }}
        aria-hidden
      />
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

interface EditorialChartProps {
  scheduledPosts: PostWithRelations[];
}

export default function EditorialChart({ scheduledPosts }: EditorialChartProps) {
  const [tab, setTab] = useState<TabId>('traffic');
  const [period, setPeriod] = useState<PeriodId>('7d');
  const tabId = useId();

  return (
    <section className="ec-tile ec-chart" aria-label="تحلیل بازدید و تقویم">
      <header className="ec-head">
        <div className="ec-head__title">
          <span className="ec-head__ico" aria-hidden>
            <HiOutlineChartBar className="w-3.5 h-3.5" />
          </span>
          <div className="ec-head__text">
            <h2 className="ec-head__title-text">تحلیل بازدید و تقویم</h2>
            <p className="ec-head__sub">
              روند {PERIODS.find((p) => p.id === period)?.label} اخیر + برنامهٔ انتشار
            </p>
          </div>
        </div>
      </header>

      <div className="ec-chart__tabs">
        <div className="ec-chart__tabs-list" role="tablist" aria-label="نمای داده">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`${tabId}-${t.id}`}
              id={`${tabId}-trigger-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn('ec-chart__tab', tab === t.id && 'ec-chart__tab--active')}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'traffic' && (
          <div className="ec-chart__segs" role="radiogroup" aria-label="بازهٔ زمانی">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === period}
                onClick={() => setPeriod(p.id)}
                className={cn('ec-chart__seg', p.id === period && 'ec-chart__seg--active')}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ec-chart__canvas">
        {tab === 'traffic' ? (
          <div role="tabpanel" id={`${tabId}-traffic`} aria-labelledby={`${tabId}-trigger-traffic`}>
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
