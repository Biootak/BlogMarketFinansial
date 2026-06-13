'use client';

/**
 * TickerBar — نوار بالای Header برای نمایش نرخ‌های لحظه‌ای (نسخه refined)
 *
 * اصلاحات نسبت به نسخه قبل:
 * - رنگ‌ها low-saturation (نه قرمز جیغ)
 * - استفاده از CSS animation (نه JS) برای performance بهتر
 * - mask-image برای fade edges
 * - tabular-nums برای اعداد
 * - tracking دقیق (Linear.app-style)
 * - حذف آیکون‌های متعدد، فقط یک dot
 */

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
  /** سرعت marquee (پیکسل بر ثانیه) */
  speed?: number;
}

function MarqueeRow({ items, speed }: { items: TickerItem[]; speed: number }) {
  // ۴ بار تکرار برای loop بی‌نهایت روان
  const repeated = [...items, ...items, ...items, ...items];
  // سرعت منفی = راست به چپ
  const duration = Math.abs(1200 / speed);

  return (
    <div
      className="flex w-max items-center"
      style={{
        animation: `ticker-${speed > 0 ? 'rtl' : 'ltr'} ${duration}s linear infinite`,
      }}
    >
      {repeated.map((item, idx) => (
        <div
          key={`${item.id}-${idx}`}
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
    </div>
  );
}

export function TickerBar({ items, className, speed = -50 }: TickerBarProps) {
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
      style={{ contain: 'layout paint' }}
      role="region"
      aria-label="نرخ‌های لحظه‌ای"
    >
      {/* Live indicator (start side in RTL) — فقط یه نقطه کوچیک بدون متن */}
      <div className="absolute inset-y-0 start-0 z-20 flex items-center gap-1.5 bg-gradient-to-l from-transparent via-neutral-50/95 to-neutral-50 px-2 dark:via-neutral-950/95 dark:to-neutral-950">
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
        </span>
      </div>

      {/* Fade edges — استفاده از mask-image برای performance */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 z-10 w-12 bg-gradient-to-r from-neutral-50 to-transparent dark:from-neutral-950"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-0 z-10 w-12 bg-gradient-to-l from-neutral-50 to-transparent dark:from-neutral-950"
      />

      {/* Marquee row */}
      <div className="group/ticker flex h-full items-center">
        <MarqueeRow items={items} speed={speed} />
      </div>

      <style jsx>{`
        @keyframes ticker-rtl {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(25%);
          }
        }
        @keyframes ticker-ltr {
          0% {
            transform: translateX(-25%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .group\\/ticker:hover :global(div[style*='ticker-']) {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
