'use client';

/**
 * ServiceRequestsCommandBar — 2026-07-04 redesign
 *
 * Focal hero tile for /dashboard/service-requests.
 * Visually aligned with the Atelier 2026 dashboard design system
 * (at-tile chrome, at-head header, at-hero-style metric).
 *
 * Layout (RTL — content reads right-to-left):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  eyebrow  ·  live dot         |     [refresh]  [export]     │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │  Massive pending number              ┌──────────────────┐     │
 *   │  "درخواست‌های در انتظار پاسخ"        │   radial pulse   │     │
 *   │  meta: X فوری · Y لغو شده · delta   │   (radial chart) │     │
 *   │                                      └──────────────────┘     │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │  segmented filter  (All · Pending · In Progress · ...)       │
 *   └──────────────────────────────────────────────────────────────┘
 */

import { exportServiceRequestsCsv, getServiceRequestStats } from '@/actions/serviceRequestActions';
import AtelierPulse from '@/components/Dashboard/DashboardPage/atelier/tiles/AtelierPulse';
import { persianLongDate } from '@/components/Dashboard/DashboardPage/atelier/utils';
import CountUp from '@/components/Dashboard/primitives/CountUp';
import { motion } from '@/lib/motion-shim';
import {
  ArrowUpRight,
  Bolt,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  expired: number;
  todayCount: number;
  urgent: number;
  pendingUrgent: number;
}

export type StatusFilter =
  | 'ALL'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

interface ServiceRequestsCommandBarProps {
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onRefresh?: () => void;
  refreshKey?: number;
}

const STATUS_META: Record<
  StatusFilter,
  { label: string; icon: typeof Sparkles; getCount: (s: Stats) => number }
> = {
  ALL: {
    label: 'همه',
    icon: Sparkles,
    getCount: (s) => s.total,
  },
  PENDING: {
    label: 'در انتظار',
    icon: Clock,
    getCount: (s) => s.pending,
  },
  IN_PROGRESS: {
    label: 'در حال انجام',
    icon: Bolt,
    getCount: (s) => s.inProgress,
  },
  COMPLETED: {
    label: 'تکمیل شده',
    icon: CheckCircle,
    getCount: (s) => s.completed,
  },
  CANCELLED: {
    label: 'لغو شده',
    icon: XCircle,
    getCount: (s) => s.cancelled,
  },
  EXPIRED: {
    label: 'منقضی',
    icon: XCircle,
    getCount: (s) => s.expired,
  },
};

export default function ServiceRequestsCommandBar({
  activeFilter,
  onFilterChange,
  onRefresh,
  refreshKey = 0,
}: ServiceRequestsCommandBarProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState<Date | null>(null);

  const loadStats = () => {
    setLoading(true);
    startTransition(async () => {
      const result = await getServiceRequestStats();
      if (result.success && result.data) {
        setStats(result.data as Stats);
      }
      setLoading(false);
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey signal + loadStats is stable
  useEffect(() => {
    setNow(new Date());
    loadStats();
  }, [refreshKey]);

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportServiceRequestsCsv({
        status: activeFilter === 'ALL' ? undefined : activeFilter,
      });
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `service-requests-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  // Pending ratio of total (for the radial pulse)
  const pendingTotal = stats?.total ?? 1;
  const pendingRatio = stats ? stats.pending / Math.max(pendingTotal, 1) : 0;
  const closedTotal = (stats?.completed ?? 0) + (stats?.cancelled ?? 0);
  const conversionRate =
    stats && pendingTotal - (stats?.cancelled ?? 0) > 0
      ? Math.round((stats.completed / (pendingTotal - stats.cancelled)) * 100)
      : 0;

  return (
    <section className="at-tile at-srq-hero" aria-label="مدیریت درخواست‌ها">
      {/* Brand mark — eight-point star like the dashboard at-hero */}
      <div className="at-srq-hero__mark" aria-hidden>
        <svg
          viewBox="0 0 200 200"
          className="at-srq-hero__mark-svg"
          role="presentation"
          aria-hidden="true"
        >
          <title>{'decorative'}</title>
          <defs>
            <radialGradient id="at-srq-mark-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.16" />
              <stop offset="60%" stopColor="var(--at-gold)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--at-gold)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#at-srq-mark-grad)" />
        </svg>
      </div>

      {/* Header — eyebrow + actions */}
      <header className="at-head at-srq-hero__head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <Clock size={14} />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">
              <span className="at-hero__eyebrow">
                <span className="at-hero__dot" aria-hidden />
                <Bolt size={12} aria-hidden />
                <span>عملیات · {now ? persianLongDate(now) : persianLongDate()}</span>
              </span>
              <span className="at-srq-hero__title">مدیریت درخواست‌ها</span>
            </h2>
            <p className="at-head__sub">
              {stats
                ? `${stats.todayCount.toLocaleString('fa-IR')} درخواست امروز ثبت شد · ${stats.pendingUrgent.toLocaleString('fa-IR')} مورد فوری در صف پاسخ`
                : 'در حال بارگذاری آمار…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadStats();
              onRefresh?.();
            }}
            disabled={isPending}
            className="at-head__btn"
            aria-label="به‌روزرسانی"
          >
            <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
            <span>به‌روزرسانی</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            className="at-head__btn at-head__btn--primary"
          >
            <Download size={14} />
            <span>خروجی CSV</span>
          </button>
        </div>
      </header>

      {/* Metric block — massive number + meta + pulse */}
      <div className="at-srq-hero__metric">
        <div className="at-srq-hero__metric-text">
          <span className="at-hero__eyebrow">
            <Clock size={12} aria-hidden />
            <span>درخواست‌های در انتظار پاسخ</span>
          </span>
          <div className="at-srq-hero__value-row">
            <span className="at-hero__value tabular-nums">
              {loading || !stats ? (
                <span className="at-kpi__zero">—</span>
              ) : (
                <CountUp value={stats.pending} duration={1100} />
              )}
            </span>
            <span className="at-hero__unit">درخواست</span>
          </div>
          <div className="at-srq-hero__meta">
            {stats && (
              <>
                <span
                  className={`at-hero__delta ${stats.pendingUrgent > 0 ? 'is-down' : 'is-flat'}`}
                >
                  {stats.pendingUrgent > 0 ? (
                    <>
                      <TriangleAlert size={12} aria-hidden />
                      <span className="tabular-nums">
                        {stats.pendingUrgent.toLocaleString('fa-IR')} فوری
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={12} aria-hidden />
                      <span>بدون فوری</span>
                    </>
                  )}
                </span>
                <span aria-hidden>·</span>
                <span>
                  از <strong className="tabular-nums">{stats.total.toLocaleString('fa-IR')}</strong>{' '}
                  کل درخواست‌ها
                </span>
                <span aria-hidden>·</span>
                <span>
                  <strong className="tabular-nums">{closedTotal.toLocaleString('fa-IR')}</strong>{' '}
                  بسته شده
                </span>
              </>
            )}
          </div>
        </div>
        <div className="at-srq-hero__metric-pulse">
          <AtelierPulse
            value={stats?.pending ?? 0}
            max={Math.max(pendingTotal, 1)}
            label="نسبت در انتظار به کل درخواست‌ها"
          />
          <span className="at-hero__pulse-cap">
            <ArrowUpRight size={12} className="inline-block" />
            {(pendingRatio * 100).toFixed(1)}٪ صف
          </span>
        </div>
      </div>

      {/* Divider + segmented filter */}
      <div className="at-srq-hero__divider" aria-hidden />
      <div className="at-srq-hero__filter">
        <div role="tablist" aria-label="فیلتر وضعیت" className="at-srq-hero__segmented">
          {(Object.keys(STATUS_META) as StatusFilter[]).map((key) => {
            const meta = STATUS_META[key];
            const isActive = activeFilter === key;
            const Icon = meta.icon;
            const count = stats ? meta.getCount(stats) : 0;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onFilterChange(key)}
                className={`at-srq-hero__segment ${isActive ? 'is-active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.label}</span>
                <span className="at-srq-hero__segment-count tabular-nums">
                  {loading ? '—' : count.toLocaleString('fa-IR')}
                </span>
                {isActive && (
                  <motion.span
                    layoutId="at-srq-hero-segment-pill"
                    className="at-srq-hero__segment-pill"
                    aria-hidden
                    transition={{ type: 'spring', duration: 0.45, bounce: 0.18 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {stats && (
          <span className="at-srq-hero__conversion tabular-nums" title="نرخ تکمیل">
            <CheckCircle size={12} />
            نرخ تکمیل {conversionRate}٪
          </span>
        )}
      </div>
    </section>
  );
}
