'use client';

/**
 * OverviewBoard — ترکیب‌کنندهٔ نمای کلی.
 * ─────────────────────────────────────────────────────────────
 *  چهار ناحیه، نه بیشتر:
 *   ۱. نوار فرمان + نوار سلامت سرویس‌ها (به‌جای شش کارت KPI هم‌شکل)
 *   ۲. قهرمان: خط زمان رویدادها
 *   ۳. ستون فقرات: سرویس‌ها و منابع لاگ روی همان محور ۲۴ ساعته
 *   ۴. ستون ابزار: صدک‌ها، ترکیب سطح، پروسه
 */

import { useMemo } from 'react';

import type { ObservabilitySnapshot } from '@/lib/observability';
import { EventRibbon } from './EventRibbon';
import { LiveBar } from './LiveBar';
import { SignalRail } from './SignalRail';
import { TimelineSpine } from './TimelineSpine';
import type { SpineGroupModel } from './TimelineSpine';
import { cssVars, formatNumber, toneVar } from './format';
import { buildServiceRows, buildSourceRows } from './spineModel';
import { useObservabilityFeed } from './useObservabilityFeed';
import s from './OverviewBoard.module.css';

interface Props {
  initialData: ObservabilitySnapshot;
}

export function OverviewBoard({ initialData }: Props) {
  const { data, now, status, refresh } = useObservabilityFeed(initialData);

  const health = useMemo(() => {
    const counters = { healthy: 0, degraded: 0, down: 0, idle: 0 };
    for (const service of data.services) {
      if (service.status === 'healthy') counters.healthy += 1;
      else if (service.status === 'degraded') counters.degraded += 1;
      else if (service.status === 'down') counters.down += 1;
      else counters.idle += 1;
    }
    return counters;
  }, [data.services]);

  const groups = useMemo<SpineGroupModel[]>(
    () => [
      {
        key: 'services',
        title: 'سرویس‌ها',
        caption: 'وضعیت از لاگ ۱۵ دقیقهٔ اخیر همان منبع محاسبه می‌شود',
        emptyLabel: 'هیچ سرویسی تعریف نشده است.',
        rows: buildServiceRows(data.services, data.heat),
      },
      {
        key: 'sources',
        title: 'منابع لاگ',
        caption: 'پرحجم‌ترین منابع SystemLog در ۲۴ ساعت گذشته',
        emptyLabel: 'هنوز هیچ منبعی لاگ ننوشته است.',
        rows: buildSourceRows(data.heat, data.sources),
      },
    ],
    [data.services, data.heat, data.sources],
  );

  const segments = [
    { key: 'healthy', label: 'سالم', tone: 'emerald' as const, count: health.healthy },
    { key: 'degraded', label: 'کند', tone: 'amber' as const, count: health.degraded },
    { key: 'down', label: 'قطع', tone: 'rose' as const, count: health.down },
    { key: 'idle', label: 'بی‌ترافیک', tone: 'slate' as const, count: health.idle },
  ].filter((segment) => segment.count > 0);

  return (
    <div className={s.board}>
      <LiveBar
        generatedAt={data.generatedAt}
        now={now}
        status={status}
        onRefresh={refresh}
        sampled={data.totals.sampled}
      >
        <span className={s.healthBar} aria-hidden>
          {segments.map((segment) => (
            <span
              key={segment.key}
              className={s.healthPart}
              style={cssVars({ '--tone': toneVar(segment.tone), '--w': segment.count })}
            />
          ))}
        </span>
        <span className={s.healthText}>
          {segments.map((segment) => (
            <span key={segment.key} className={s.healthChip}>
              <span
                className={s.healthDot}
                style={cssVars({ '--tone': toneVar(segment.tone) })}
                aria-hidden
              />
              {formatNumber(segment.count)} {segment.label}
            </span>
          ))}
          <span className={s.healthChip} data-strong="true">
            {formatNumber(data.totals.errors)} خطا در ۲۴ ساعت
          </span>
        </span>
      </LiveBar>

      <EventRibbon
        hourly={data.hourly}
        hourlyErrors={data.hourlyErrors}
        incidents={data.incidents}
      />

      <div className={s.split}>
        <div className={s.column}>
          <TimelineSpine
            title="ستون فقرات زمانی"
            caption="هر نوار همان ۲۴ ساعت نمودار بالاست؛ یک ساعت شلوغ را عمودی تا منبعش دنبال کنید."
            groups={groups}
          />
        </div>
        <div className={s.rail}>
          <SignalRail data={data} />
        </div>
      </div>
    </div>
  );
}
