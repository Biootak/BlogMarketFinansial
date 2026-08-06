'use client';

/**
 * spineModel — تبدیل snapshot به ردیف‌های TimelineSpine.
 *
 *  اینجا زندگی می‌کند چون هم «نمای کلی» و هم «کوئری کند» به همان ردیف منابع
 *  نیاز دارند. یک منبع، دو مصرف‌کننده — بدون کپی.
 */

import { Database, Globe, HardDrive, Inbox, Mail, Phone, Shield, Wifi, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import type { HeatRow, ServiceHealth, ServiceKey, SourceStat } from '@/lib/observability';
import type { SpineCell, SpineRowModel } from './TimelineSpine';
import {
  formatDecimal,
  formatNumber,
  formatShare,
  hourKey,
  hourOffsetShort,
  msMeasure,
  ratio,
  statusLabel,
  statusTone,
} from './format';

export const SERVICE_ICON: Record<ServiceKey, ReactNode> = {
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

export function cellsFromHeat(row: HeatRow): SpineCell[] {
  const peak = Math.max(...row.cells.map((cell) => cell.total), 1);
  const last = row.cells.length - 1;
  return row.cells.map((cell, index) => ({
    key: hourKey(index),
    intensity: ratio(cell.total, peak),
    alert: cell.errors > 0,
    title: cellTitle(last - index, cell.total, cell.errors),
  }));
}

export function cellsFromSparkline(sparkline: number[]): SpineCell[] {
  const last = sparkline.length - 1;
  return sparkline.map((value, index) => ({
    key: hourKey(index),
    intensity: ratio(value, 100),
    alert: false,
    title: `${hourOffsetShort(last - index)} · شدت نسبی ${formatNumber(value)}٪`,
  }));
}

export function buildServiceRows(services: ServiceHealth[], heat: HeatRow[]): SpineRowModel[] {
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

export function buildSourceRows(heat: HeatRow[], sources: SourceStat[]): SpineRowModel[] {
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
