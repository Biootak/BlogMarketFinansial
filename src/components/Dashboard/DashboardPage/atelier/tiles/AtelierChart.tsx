'use client';

/**
 * AtelierChart — analytics tile (traffic only) + period selector.
 *
 * 2026-07-04 (late night): تب تقویم حذف شد. تقویم ماهانهٔ انتشار حالا
 * فقط در صفحهٔ مستقل `/dashboard/posts/calendar` زندگی می‌کند (یک
 * مکان، یک منبع حقیقت). این کاشی فقط «تحلیل بازدید» است؛ هدر و
 * aria-label هم به همین نام.
 */

import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { HiOutlineChartBar } from 'react-icons/hi2';

const TrafficChart = dynamic(() => import('@/components/Dashboard/DashboardPage/TrafficChart'), {
  ssr: false,
  loading: () => <div className="at-chart__skeleton" aria-hidden />,
});

const PERIODS = [
  { id: '7d', label: '۷ روز' },
  { id: '30d', label: '۳۰ روز' },
  { id: '90d', label: '۹۰ روز' },
] as const;

type PeriodId = (typeof PERIODS)[number]['id'];

export default function AtelierChart() {
  const [period, setPeriod] = useState<PeriodId>('7d');

  return (
    <section className="at-tile at-chart" aria-label="تحلیل بازدید">
      <header className="at-chart__head">
        <div className="at-head">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineChartBar className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">تحلیل بازدید</h2>
            <p className="at-head__sub">
              روند {PERIODS.find((p) => p.id === period)?.label} اخیر
            </p>
          </div>
        </div>

        <div className="at-chart__controls">
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
        </div>
      </header>

      <div className="at-chart__canvas">
        <TrafficChart key={`traffic-${period}`} period={period} />
      </div>
    </section>
  );
}
