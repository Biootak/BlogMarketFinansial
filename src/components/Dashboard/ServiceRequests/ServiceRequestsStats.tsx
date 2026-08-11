'use client';

/**
 * ServiceRequestsStats — 2026-07-04 redesign · 2026-07-28 QA pass
 *
 * Compact KPI grid that follows the at-kpi pattern from the Atelier 2026
 * dashboard system. Six cells, hairline borders, no glassmorphism.
 * Pulls a refined payload from `getServiceRequestStats` that now
 * includes the real `urgent` and `pendingUrgent` counts (not just an
 * approximation).
 *
 * 2026-07-28: stagger animation on bar-fill via CSS custom property delay.
 */

import { getServiceRequestStats } from '@/actions/serviceRequestActions';
import CountUp from '@/components/Dashboard/primitives/CountUp';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  SquareStack,
  TriangleAlert,
  Zap,
} from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  todayCount: number;
  urgent: number;
  pendingUrgent: number;
}

interface CellDef {
  key: keyof Stats;
  label: string;
  Icon: typeof SquareStack;
  /** Tone used for the value color + bar fill. */
  tone: 'emerald' | 'amber' | 'rose' | 'info' | 'violet' | 'slate';
  /** Suffix appended after the value, e.g. "مورد" or "٪". */
  suffix?: string;
  /** Sub-label below the value (one short sentence). */
  sub?: (s: Stats) => string;
  /** Returns 0..1 to render the bottom bar. */
  barRatio?: (s: Stats) => number;
}

const CELLS: CellDef[] = [
  {
    key: 'total',
    label: 'کل درخواست‌ها',
    Icon: SquareStack,
    tone: 'info',
    sub: () => 'تا امروز ثبت شده',
    barRatio: () => 1,
  },
  {
    key: 'pending',
    label: 'در انتظار',
    Icon: Clock,
    tone: 'amber',
    sub: (s) =>
      s.pendingUrgent > 0
        ? `${s.pendingUrgent.toLocaleString('fa-IR')} فوری در صف`
        : 'بدون مورد فوری',
    barRatio: (s) => (s.total > 0 ? s.pending / s.total : 0),
  },
  {
    key: 'inProgress',
    label: 'در حال انجام',
    Icon: Zap,
    tone: 'violet',
    sub: (s) => (s.total > 0 ? `${Math.round((s.inProgress / s.total) * 100)}٪ سهم` : '—'),
    barRatio: (s) => (s.total > 0 ? s.inProgress / s.total : 0),
  },
  {
    key: 'completed',
    label: 'تکمیل شده',
    Icon: CheckCircle,
    tone: 'emerald',
    sub: (s) =>
      s.total - s.cancelled > 0
        ? `${Math.round((s.completed / (s.total - s.cancelled)) * 100)}٪ نرخ`
        : '—',
    barRatio: (s) => (s.total - s.cancelled > 0 ? s.completed / (s.total - s.cancelled) : 0),
  },
  {
    key: 'urgent',
    label: 'فوری',
    Icon: TriangleAlert,
    tone: 'rose',
    sub: (s) =>
      s.pendingUrgent > 0
        ? `${s.pendingUrgent.toLocaleString('fa-IR')} در صف پاسخ`
        : 'هیچ مورد فوری',
    barRatio: (s) => (s.total > 0 ? s.urgent / s.total : 0),
  },
  {
    key: 'todayCount',
    label: 'ثبت امروز',
    Icon: CalendarDays,
    tone: 'emerald',
    sub: (s) =>
      s.total > 0 ? `${Math.round((s.todayCount / Math.max(s.total, 1)) * 100)}٪ کل` : '—',
    // no barRatio — the renderer skips the bar for todayCount (see render below)
  },
];

interface ServiceRequestsStatsProps {
  refreshKey?: number;
}

export default function ServiceRequestsStats({ refreshKey = 0 }: ServiceRequestsStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional external signal prop
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await getServiceRequestStats();
      if (cancelled) return;
      if (result.success && result.data) {
        setStats(result.data as Stats);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const toneColor = useMemo(
    () =>
      ({
        emerald: 'var(--at-accent)',
        amber: 'var(--at-warning)',
        rose: 'var(--at-danger)',
        info: 'var(--at-info)',
        violet: 'oklch(55% 0.16 285)',
        slate: 'var(--at-fg-muted)',
      }) as const,
    [],
  );

  const valueClass = (cell: CellDef): string => {
    if (cell.key === 'pending') return 'at-srq-stats__value is-pending';
    if (cell.key === 'urgent') return 'at-srq-stats__value is-urgent';
    return 'at-srq-stats__value';
  };

  return (
    <section className="at-tile at-srq-stats" aria-label="خلاصه آمار درخواست‌ها">
      {loading
        ? [0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={`sk-stats-${i}`}
              className="at-srq-stats__cell"
              style={{
                background: 'var(--at-bg-elevated)',
                opacity: 0.6,
                minHeight: 84,
              }}
              aria-hidden
            >
              <span
                className="block h-3 rounded"
                style={{
                  width: '50%',
                  background: 'var(--at-line)',
                  marginBottom: 10,
                }}
              />
              <span
                className="block h-6 rounded"
                style={{
                  width: '70%',
                  background: 'var(--at-line)',
                }}
              />
            </div>
          ))
        : !stats
          ? null
          : CELLS.map((cell, idx) => {
              const value = stats[cell.key];
              const ratio =
                cell.key !== 'todayCount' && cell.barRatio ? cell.barRatio(stats) : null;
              return (
                <div key={cell.key} className="at-srq-stats__cell">
                  <div className="at-srq-stats__head">
                    <span className="at-srq-stats__label">
                      <cell.Icon className="w-3.5 h-3.5" aria-hidden />
                      {cell.label}
                    </span>
                    <span
                      className="at-srq-stats__ico"
                      style={{ color: toneColor[cell.tone] }}
                      aria-hidden
                    >
                      <cell.Icon className="w-3 h-3" />
                    </span>
                  </div>
                  <p className={valueClass(cell)}>
                    <CountUp value={value} duration={500 + idx * 60} />
                  </p>
                  {cell.sub && stats && <p className="at-srq-stats__sub">{cell.sub(stats)}</p>}
                  {ratio !== null && (
                    <div className="at-srq-stats__bar" aria-hidden>
                      <div
                        className="at-srq-stats__bar-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, ratio * 100))}%`,
                          background: toneColor[cell.tone],
                          /* Stagger the bar animation — each cell starts 80ms later */
                          transitionDelay: `${idx * 80}ms`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
    </section>
  );
}
