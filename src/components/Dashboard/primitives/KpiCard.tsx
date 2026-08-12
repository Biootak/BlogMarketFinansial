'use client';

/**
 * KpiCard — premium metric tile for the Nova dashboard.
 *
 * Stripe / Linear / Vercel-inspired: glassmorphic surface, hairline
 * border, gradient icon chip, tabular number hero, semantic trend
 * pills with dot indicator. Values count up on mount (CountUp) and
 * cards lift subtly on hover.
 *
 * Dark mode: fully supported via .dark class on root.
 * RTL: logical properties only — never left/right.
 */

import CountUp from '@/components/Dashboard/primitives/CountUp';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Info, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import s from './KpiCard.module.css';

export interface KpiCardProps {
  label: string;
  value: number | string;
  /** Number formatting: 'fa' (Persian digits), 'compact', 'latin'. Strings render as-is. */
  format?: 'fa' | 'compact' | 'latin';
  icon?: LucideIcon;
  /** Optional semantic hint: tints the value + shows a trend pill. */
  trend?: 'up' | 'down' | 'neutral';
  spark?: ReactNode;
  info?: string;
  href?: string;
  className?: string;
}

const faNum = new Intl.NumberFormat('fa-IR');
const faCompact = new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 });
const enNum = new Intl.NumberFormat('en-US');

function formatValue(value: number, format: NonNullable<KpiCardProps['format']>): string {
  switch (format) {
    case 'compact':
      return faCompact.format(value);
    case 'latin':
      return enNum.format(value);
    default:
      return faNum.format(value);
  }
}

export function KpiCard({
  label,
  value,
  format = 'fa',
  icon: Icon,
  trend,
  spark,
  info,
  href,
  className,
}: KpiCardProps) {
  const rootClass = cn(
    s.card,
    trend === 'up' && s.trendUp,
    trend === 'down' && s.trendDown,
    className,
  );

  const content = (
    <>
      {/* ── Header row: label + icon chip ── */}
      <div className={s.header}>
        <span className={s.label}>{label}</span>
        <div className={s.headerActions}>
          {info && (
            <span className={s.infoIcon} title={info} aria-label={info}>
              <Info size={13} aria-hidden />
            </span>
          )}
          {Icon && (
            <span className={s.iconChip} aria-hidden>
              <Icon size={16} strokeWidth={1.75} />
            </span>
          )}
        </div>
      </div>

      {/* ── Sparkline (optional) ── */}
      {spark && <div className={s.spark}>{spark}</div>}

      {/* ── Value row: number + trend pill ── */}
      <div className={s.valueRow}>
        <span className={s.value}>
          {typeof value === 'number' && format === 'fa' ? (
            <CountUp value={value} duration={700} className={s.countUp} />
          ) : (
            <output className={s.countUp}>
              {typeof value === 'number' ? formatValue(value, format) : value}
            </output>
          )}
        </span>

        {trend && trend !== 'neutral' && (
          <span
            className={cn(s.trendPill, trend === 'up' ? s.trendPillUp : s.trendPillDown)}
            data-trend={trend}
          >
            <span className={s.trendDot} />
            {trend === 'up' ? (
              <ArrowUpRight size={12} aria-hidden />
            ) : (
              <ArrowDownRight size={12} aria-hidden />
            )}
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rootClass}>
        {content}
      </Link>
    );
  }
  return <div className={rootClass}>{content}</div>;
}
