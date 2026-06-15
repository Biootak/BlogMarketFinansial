'use client';

/**
 * TickerBar — نوار بالای Header برای نمایش نرخ‌های لحظه‌ای
 *
 * استفاده از Marquee اصلاح‌شده (CSS-driven)
 * - ۳ بار تکرار برای loop بی‌نهایت روان
 * - pause on hover
 * - fade edges با mask
 * - tabular-nums برای اعداد
 */

import { Marquee } from '@/components/ModernTrending/effects/Marquee';
import { cn } from '@/lib/utils';

export interface TickerItem {
  id: string;
  name: string;
  symbol?: string;
  value: string;
  change?: number;
}

export interface TickerBarProps {
  items: TickerItem[];
  className?: string;
  /** سرعت marquee — منفی برای RTL scroll */
  speed?: number;
}

export function TickerBar({ items, className, speed = -30 }: TickerBarProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'ticker-root relative w-full overflow-hidden',
        'border-b border-neutral-200/60 dark:border-neutral-800/60',
        'bg-neutral-50/70 dark:bg-neutral-950/70',
        'backdrop-blur-xl',
        'h-8',
        className,
      )}
      role="region"
      aria-label="نرخ‌های لحظه‌ای"
    >
      {/* Live indicator — فقط یه نقطه کوچیک (در سمت چپ RTL) */}
      <div className="pointer-events-none absolute inset-y-0 start-0 z-20 flex items-center gap-1.5 px-2">
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
        </span>
      </div>

      {/* Fade edges — mask-image برای محو شدن لبه‌ها */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 z-10 w-10 bg-gradient-to-r from-neutral-50 to-transparent dark:from-neutral-950"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-0 z-10 w-10 bg-gradient-to-l from-neutral-50 to-transparent dark:from-neutral-950"
      />

      {/* Marquee */}
      <Marquee speed={speed} className="h-full" repeat={3} pauseOnHold>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex shrink-0 items-center gap-1.5 px-3 py-1"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-neutral-500 dark:text-neutral-400">
              {item.name}
            </span>
            {item.symbol && (
              <span className="text-[10px] tracking-wide text-neutral-400 dark:text-neutral-500">
                {item.symbol}
              </span>
            )}
            <span className="text-[11px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {item.value}
            </span>
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
            <span
              aria-hidden
              className="ms-2 h-3 w-px bg-neutral-300/60 dark:bg-neutral-700/60"
            />
          </div>
        ))}
      </Marquee>
    </div>
  );
}
