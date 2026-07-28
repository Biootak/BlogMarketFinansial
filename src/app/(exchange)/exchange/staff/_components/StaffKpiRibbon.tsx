'use client';

/**
 * StaffKpiRibbon — 4 KPI tiles برای نوار بالای داشبورد تیم.
 * داده‌ها از StaffMetrics می‌آیند (server aggregate).
 */

import {
  Activity,
  ShieldCheck,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import type { StaffMetrics } from '@/actions/exchanges';
import { formatNumber } from '@/lib/customer-format';
import s from './StaffCockpit.module.css';

interface Props {
  metrics: StaffMetrics;
}

export function StaffKpiRibbon({ metrics }: Props) {
  const tiles = [
    {
      label: 'کل اعضا',
      value: metrics.total,
      sub:
        metrics.byRole.OWNER > 0
          ? `${formatNumber(metrics.byRole.OWNER)} مالک`
          : 'صرافی بدون مالک',
      icon: ShieldCheck,
      tone: 'emerald' as const,
      trend: 'flat' as const,
    },
    {
      label: 'مدیران',
      value: metrics.byRole.MANAGER,
      sub:
        metrics.byRole.STAFF > 0
          ? `${formatNumber(metrics.byRole.STAFF)} کارمند`
          : 'بدون کارمند',
      icon: UserPlus,
      tone: 'gold' as const,
      trend: 'flat' as const,
    },
    {
      label: 'فعال ۳۰ روز',
      value: metrics.activeLast30d,
      sub:
        metrics.total > 0
          ? `${formatNumber(Math.round((metrics.activeLast30d / Math.max(metrics.total, 1)) * 100))}٪ تیم`
          : '—',
      icon: Activity,
      tone: 'info' as const,
      trend: metrics.activeLast30d > 0 ? ('up' as const) : ('flat' as const),
    },
    {
      label: 'لغو ۳۰ روز',
      value: metrics.revokedLast30d,
      sub:
        metrics.revokedLast30d === 0
          ? 'پایدار'
          : 'نیاز به بازنگری دسترسی',
      icon: UserMinus,
      tone: 'rose' as const,
      trend: metrics.revokedLast30d > 0 ? ('down' as const) : ('flat' as const),
    },
  ];

  return (
    <div className={s.kpiRow} aria-label="آمار کلی تیم">
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        return (
          <div key={tile.label} className={s.kpi} data-i={i}>
            <div className={s.kpiHead}>
              <span className={s.kpiLabel}>{tile.label}</span>
              <span className={s.kpiIcon} data-tone={tile.tone} aria-hidden>
                <Icon size={14} strokeWidth={2} />
              </span>
            </div>
            <span className={s.kpiValue}>
              {tile.value.toLocaleString('fa-IR')}
            </span>
            <div className={s.row} style={{ justifyContent: 'space-between' }}>
              <span className={s.kpiSub}>{tile.sub}</span>
              {tile.trend !== 'flat' && (
                <span className={s.kpiTrend} data-trend={tile.trend}>
                  {tile.trend === 'up' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
