import { heading, space, text } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type * as React from 'react';

/**
 * StatCard — the single source of truth for a stat / KPI tile.
 * Replaces the BlogStatCard, ServiceRequestsStats and the various
 * hand-rolled stat blocks in dashboard pages.
 */
interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
  /** Background color of the value, e.g. "text-amber-700 dark:text-amber-300". */
  valueClassName?: string;
  /** Compact mode (e.g. for a list row) vs full tile. */
  variant?: 'tile' | 'inline';
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  className,
  valueClassName,
  variant = 'tile',
}: StatCardProps) {
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {icon && <div className="text-neutral-400">{icon}</div>}
        <div className="flex-1 min-w-0">
          <p className={text.meta}>{label}</p>
          <p className={cn('text-lg font-bold tabular-nums', valueClassName)}>{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60',
        'bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm',
        'p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={text.meta}>{label}</p>
        {icon && <div className="text-neutral-400">{icon}</div>}
      </div>
      <p className={cn('text-xl font-bold tabular-nums', valueClassName)}>{value}</p>
      {trend && (
        <p
          className={cn(
            text.meta,
            trend.positive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400',
          )}
        >
          {trend.value}
        </p>
      )}
    </div>
  );
}

/**
 * StatGrid — responsive grid wrapper for StatCards.
 */
export function StatGrid({
  children,
  className,
  cols = 4,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}) {
  const colsClass =
    cols === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : cols === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2';
  return <div className={cn('grid gap-3 sm:gap-4', colsClass, className)}>{children}</div>;
}
