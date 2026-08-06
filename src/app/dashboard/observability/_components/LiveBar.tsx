'use client';

/**
 * LiveBar — نوار فرمان مشترک هر چهار board.
 *
 *  به‌جای شش کارت KPI هم‌شکل (الگوی خسته و تکراری داشبوردها) وضعیت کلی در یک
 *  نوار افقی فشرده جمع شده: نبض جریان، شاخص‌های میان‌بر (slot)، زمان آخرین
 *  خواندن و دکمهٔ به‌روزرسانی دستی.
 */

import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatTimeAgo } from './format';
import type { FeedStatus } from './useObservabilityFeed';
import s from './LiveBar.module.css';

interface Props {
  generatedAt: string;
  now: number;
  status: FeedStatus;
  onRefresh: () => void;
  /** true یعنی به سقف اسکن خورده‌ایم و اعداد نمونه‌ای‌اند. */
  sampled?: boolean;
  children?: ReactNode;
}

function pulseLabel(status: FeedStatus): string {
  if (status === 'stalled') return 'داده تازه نشد';
  if (status === 'refreshing') return 'در حال خواندن';
  return 'جریان زنده';
}

export function LiveBar({ generatedAt, now, status, onRefresh, sampled, children }: Props) {
  return (
    <div className={s.bar}>
      <span className={s.pulse} data-status={status}>
        <span className={s.dot} aria-hidden />
        {pulseLabel(status)}
      </span>

      {children ? <div className={s.slot}>{children}</div> : null}

      <div className={s.tail}>
        {sampled ? (
          <span className={s.sampled} title="سقف اسکن ۲۰٬۰۰۰ ردیف — اعداد نمونه‌ای هستند">
            نمونه‌برداری‌شده
          </span>
        ) : null}
        <span className={s.stamp} aria-live="polite">
          {formatTimeAgo(generatedAt, now)}
        </span>
        <button
          type="button"
          className={s.refresh}
          onClick={onRefresh}
          disabled={status === 'refreshing'}
          aria-label="به‌روزرسانی دستی داده‌ها"
        >
          <RefreshCw
            size={14}
            strokeWidth={1.75}
            aria-hidden
            className={status === 'refreshing' ? 'animate-spin' : undefined}
          />
        </button>
      </div>
    </div>
  );
}
