'use client';

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Info, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import React, { type ReactNode, useEffect, useState } from 'react';
import s from './StatCard.module.css';

export interface StatCardProps {
  label: string;
  value: number | string;
  delta?: { value: number; trend: 'up' | 'down' };
  icon?: LucideIcon | ReactNode;
  href?: string;
  info?: string;
  format?: 'persian' | 'latin' | 'compact' | 'percent';
  loading?: boolean;
  /** Optional slot for a sparkline rendered above the value. */
  spark?: ReactNode;
  className?: string;
}

/**
 * Format a numeric value using the requested locale + notation.
 */
const _faNum = new Intl.NumberFormat('fa-IR');
const _enNum = new Intl.NumberFormat('en-US');
const _faCompact = new Intl.NumberFormat('fa-IR', { notation: 'compact' });
const _faPercent = new Intl.NumberFormat('fa-IR', { style: 'percent', maximumFractionDigits: 1 });

const formatValue = (value: number, format: NonNullable<StatCardProps['format']>): string => {
  switch (format) {
    case 'latin':
      return _enNum.format(value);
    case 'compact':
      return _faCompact.format(value);
    case 'percent':
      return _faPercent.format(value / 100);
    default:
      return _faNum.format(value);
  }
};

const isCountUpCompatible = (
  format: NonNullable<StatCardProps['format']>,
): format is 'persian' | 'latin' => format === 'persian' || format === 'latin';

export function StatCard({
  label,
  value,
  delta,
  icon,
  href,
  info,
  format = 'persian',
  loading = false,
  spark,
  className,
}: StatCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cardClass = cn('dash2-statcard', s.card, href && 'cursor-pointer', className);

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return <div className={cn('size-4 text-muted-foreground', s.iconWrap)}>{icon}</div>;
    }
    if (typeof icon === 'string') return null;
    const Icon = icon as LucideIcon;
    return (
      <div className={cn('size-4 text-muted-foreground', s.iconWrap)}>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  };

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {renderIcon()}
          {info && (
            <span title={info} aria-label={info} className={s.info}>
              <Info className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      {spark && <div className={s.spark}>{spark}</div>}

      <div className="dash2-statcard__value text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {loading ? (
          <span className="inline-block h-9 w-24 rounded bg-[color:var(--ds-color-surface-2)] motion-safe:animate-pulse" />
        ) : typeof value === 'string' ? (
          value
        ) : mounted && isCountUpCompatible(format) ? (
          <CountUp value={value} duration={600} locale={format === 'latin' ? 'en-US' : 'fa-IR'} />
        ) : (
          formatValue(value, format)
        )}
      </div>

      {delta && (
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(s.delta, delta.trend === 'up' ? s.deltaUp : s.deltaDown)}
            data-trend={delta.trend}
          >
            {delta.trend === 'up' ? (
              <ArrowUpRight className="size-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="size-3" aria-hidden="true" />
            )}
            <span aria-label={delta.trend === 'up' ? 'افزایش' : 'کاهش'}>
              {new Intl.NumberFormat('fa-IR', {
                style: 'percent',
                maximumFractionDigits: 1,
              }).format(Math.abs(delta.value) / 100)}
            </span>
          </span>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {content}
      </Link>
    );
  }
  return <div className={cardClass}>{content}</div>;
}
