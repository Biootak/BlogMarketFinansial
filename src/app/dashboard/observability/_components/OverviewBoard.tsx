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

import {
  Database,
  Globe,
  HardDrive,
  Inbox,
  Mail,
  Phone,
  Shield,
  Wifi,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import type {
  HeatRow,
  ObservabilitySnapshot,
  ServiceHealth,
  ServiceKey,
  SourceStat,
} from '@/lib/observability';
import { EventRibbon } from './EventRibbon';
import { LiveBar } from './LiveBar';
import { SignalRail } from './SignalRail';
import { TimelineSpine } from './TimelineSpine';
import type { SpineCell, SpineGroupModel, SpineRowModel } from './TimelineSpine';
import {
  cssVars,
  formatDecimal,
  formatNumber,
  formatShare,
  hourKey,
  hourOffsetShort,
  msMeasure,
  ratio,
  statusLabel,
  statusTone,
  toneVar,
} from './format';
import { useObservabilityFeed } from './useObservabilityFeed';
import s from './OverviewBoard.module.css';

const SERVICE_ICON: Record<ServiceKey, ReactNode> = {
  api: <Globe size={15} strokeWidth={1.75} />,
  db: <Database size={15} strokeWidth={1.75} />,
  cache: <HardDrive size={15} strokeWidth={1.75} />,
  queue: <Zap size={15} strokeWidth={1.75} />,
  auth: <Shield size={15} strokeWidth={1.75} />,
  edge: <Wifi size={15} strokeWidth={1.75} />,
  email: <Mail size={15} strokeWidth={1.75} />,
  sms: <Phone size={15} strokeWidth={1.75} />,
  storage: <Inbox size={15} strokeWidth={1.75} />,
};

function cellTitle(offset: number, total: number, errors: number): string {
  return `${hourOffsetShort(offset)} · ${formatNumber(total)} رویداد · ${formatNumber(errors)} خطا`;
}

function cellsFromHeat(row: HeatRow): SpineCell[] {
  const peak = Math.max(...row.cells.map((cell) => cell.total), 1);
  return row.cells.map((cell, index) => ({
    key: hourKey(index),
    intensity: ratio(cell.total, peak),
    alert: cell.errors > 0,
    title: cellTitle(row.cells.length - 1 - index, cell.total, cell.errors),
  }));
}

function cellsFromSparkline(sparkline: number[]): SpineCell[] {
  return sparkline.map((value, index) => ({
    key: hourKey(index),
    intensity: ratio(value, 100),
    alert: false,
    title: `${hourOffsetShort(sparkline.length - 1 - index)} · شدت نسبی ${formatNumber(value)}٪`,
  }));
}

function buildServiceRows(services: ServiceHealth[], heat: HeatRow[]): SpineRowModel[] {
  const heatBySource = new Map(heat.map((row) => [row.source, row]));
  return services.map((service) => {
    const heatRow = heatBySource.get(service.id);
    const latency = msMeasure(service.latencyMs);
    return {
      key: service.id,
      label: service.name,
      caption: service.desc,
      href: service.href,
      icon: SERVICE_ICON[service.id],
      tone: statusTone(service.status),
      badge: statusLabel(service.status),
      cells: heatRow ? cellsFromHeat(heatRow) : cellsFromSparkline(service.sparkline),
      stats: [
        { key: 'latency', label: 'تأخیر', value: latency.value, unit: latency.unit },
        { key: 'uptime', label: 'در دسترس', value: `${formatDecimal(service.uptime24h, 2)}٪` },
        { key: 'errors', label: 'خطای ۲۴س', value: formatNumber(service.errors24h) },
      ],
    };
  });
}

function buildSourceRows(heat: HeatRow[], sources: SourceStat[]): SpineRowModel[] {
  const statBySource = new Map(sources.map((item) => [item.source, item]));
  return heat.map((row) => {
    const stat = statBySource.get(row.source);
    const errors = stat?.errors ?? 0;
    const warns = stat?.warns ?? 0;
    return {
      key: `source-${row.source}`,
      label: row.source,
      latin: true,
      caption: `${formatNumber(errors)} خطا · ${formatNumber(warns)} هشدار`,
      tone: errors > 0 ? 'rose' : 'cyan',
      cells: cellsFromHeat(row),
      stats: [
        { key: 'total', label: 'رویداد', value: formatNumber(row.total) },
        { key: 'share', label: 'سهم حجم', value: formatShare(stat?.share ?? 0) },
      ],
    };
  });
}

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
