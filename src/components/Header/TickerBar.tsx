'use client';

/**
 * TickerBar — نوار بالای Header برای نمایش نرخ‌های لحظه‌ای
 *
 * استفاده از TickerShell (glassmorphism + pause-on-hover یکپارچه)
 * و Marquee اصلاح‌شده (CSS-driven) برای loop بی‌نهایت.
 */

import Ticker from '@/components/Ticker';
import { TickerShell } from '@/components/TickerShell';
import { cn } from '@/lib/utils';
import type { HeaderTickerItem } from '@/types/types';

export interface TickerBarProps {
  items: HeaderTickerItem[];
  className?: string;
  /** سرعت marquee — منفی برای RTL scroll */
  speed?: number;
}

export function TickerBar({ items, className, speed = -30 }: TickerBarProps) {
  if (items.length === 0) return null;

  return (
    <TickerShell
      height="sm"
      fadeSize="sm"
      tone="neutral"
      className={className}
      ariaLabel="نرخ‌های لحظه‌ای"
    >
      <Ticker speed={speed} className="h-full" repeat={3} pauseOnHold>
        {items.map((item) => (
          <div key={item.id} className="flex shrink-0 items-center gap-1.5 px-3 py-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-neutral-500 dark:text-neutral-400">
              {item.name}
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {item.value}
            </span>
            {item.symbol && (
              <span className="text-[10px] tracking-wide text-neutral-400 dark:text-neutral-500 ps-0.5">
                {item.symbol}
              </span>
            )}
            {typeof item.change === 'number' && item.change !== 0 && (
              <span
                className={cn(
                  'flex items-center gap-0.5 text-[10px] font-semibold tabular-nums',
                  item.change > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {item.change > 0 ? '↑' : '↓'}
                {Math.abs(item.change).toFixed(2)}%
              </span>
            )}
            <span aria-hidden className="ms-2 h-3 w-px bg-neutral-300/60 dark:bg-neutral-700/60" />
          </div>
        ))}
      </Ticker>
    </TickerShell>
  );
}
