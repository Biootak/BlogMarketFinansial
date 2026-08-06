'use client';

/* --------------------------------------------------------------------------
   StatCard — سنجه‌ی عددی (Atlas 2026)
   --------------------------------------------------------------------------
   با وجود اسم تاریخی‌اش، این دیگر «کارت» نیست. چند سنجه کنار هم یک نوار
   تقسیم‌شده با خط مو می‌سازند، نه شبکه‌ای از جعبه‌های یک‌شکل.
   ظاهر کامل در dashboard-shell.css تعریف شده تا یک منبع حقیقت داشته باشیم.

   API عمومی دست‌نخورده است — هیچ مصرف‌کننده‌ای نیاز به تغییر ندارد.
   -------------------------------------------------------------------------- */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import React, { type ReactNode, useEffect, useState } from 'react';

export interface StatCardProps {
  label: string;
  value: number | string;
  delta?: { value: number; trend: 'up' | 'down' | 'flat' };
  icon?: LucideIcon | ReactNode;
  href?: string;
  info?: string;
  format?: 'persian' | 'latin' | 'compact' | 'percent';
  loading?: boolean;
  /** جای اختیاری نمودار کوچک، بالای عدد. */
  spark?: ReactNode;
  className?: string;
}

/* نمونه‌های Intl یک‌بار در بارگذاری ماژول ساخته می‌شوند. */
const FA_NUMBER = new Intl.NumberFormat('fa-IR');
const EN_NUMBER = new Intl.NumberFormat('en-US');
const FA_COMPACT = new Intl.NumberFormat('fa-IR', { notation: 'compact' });
const FA_PERCENT = new Intl.NumberFormat('fa-IR', { style: 'percent', maximumFractionDigits: 1 });

const formatValue = (value: number, format: NonNullable<StatCardProps['format']>): string => {
  switch (format) {
    case 'latin':
      return EN_NUMBER.format(value);
    case 'compact':
      return FA_COMPACT.format(value);
    case 'percent':
      return FA_PERCENT.format(value / 100);
    default:
      return FA_NUMBER.format(value);
  }
};

const isCountUpCompatible = (
  format: NonNullable<StatCardProps['format']>,
): format is 'persian' | 'latin' => format === 'persian' || format === 'latin';

const TREND_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const;

const TREND_LABEL = {
  up: 'افزایش',
  down: 'کاهش',
  flat: 'بدون تغییر',
} as const;

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

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return (
        <span className="dash2-statcard__icon" aria-hidden>
          {icon}
        </span>
      );
    }
    const Icon = icon as LucideIcon;
    return (
      <span className="dash2-statcard__icon" aria-hidden>
        <Icon size={15} strokeWidth={1.8} />
      </span>
    );
  };

  const TrendIcon = delta ? TREND_ICON[delta.trend] : null;

  const content = (
    <>
      <div className="dash2-statcard__top">
        <span className="dash2-statcard__label">{label}</span>
        <span className="dash2-statcard__adornments">
          {renderIcon()}
          {info && (
            <span className="dash2-statcard__info" title={info} aria-label={info}>
              <Info size={13} strokeWidth={1.8} aria-hidden />
            </span>
          )}
        </span>
      </div>

      {spark && <div className="dash2-statcard__spark">{spark}</div>}

      <div className="dash2-statcard__value" aria-live="polite" aria-busy={loading || undefined}>
        {loading ? (
          <span className="dash2-skeleton dash2-statcard__value-skeleton" aria-hidden />
        ) : typeof value === 'string' ? (
          value
        ) : mounted && isCountUpCompatible(format) ? (
          <CountUp value={value} duration={600} locale={format === 'latin' ? 'en-US' : 'fa-IR'} />
        ) : (
          formatValue(value, format)
        )}
      </div>

      {delta && TrendIcon && (
        <span className="dash2-statcard__delta" data-trend={delta.trend}>
          <TrendIcon size={12} strokeWidth={2.2} aria-hidden />
          <span>
            <span className="sr-only">{TREND_LABEL[delta.trend]} </span>
            {FA_PERCENT.format(Math.abs(delta.value) / 100)}
          </span>
        </span>
      )}
    </>
  );

  const rootClass = cn('dash2-statcard', className);

  if (href) {
    return (
      <Link href={href} className={rootClass} data-interactive="true">
        {content}
      </Link>
    );
  }

  return <div className={rootClass}>{content}</div>;
}
