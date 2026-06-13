'use client';

/**
 * TickerBar — نوار بالای Header برای نمایش نرخ‌های لحظه‌ای
 *
 * تکنیک‌های ۲۰۲۶:
 * - Marquee با سرعت متغیر (در RTL به سمت چپ)
 * - Glassmorphism (backdrop-blur)
 * - Pulse indicator زنده
 * - تغییر رنگ خودکار برای افزایش/کاهش قیمت
 * - Hover برای pause
 * - Gradient fade در دو طرف (mask-image)
 * - Responsive
 */

import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TickerItem {
  id: string;
  name: string;
  symbol?: string;
  value: string;
  change?: number; // درصد تغییر
  icon?: string;
}

export interface TickerBarProps {
  items: TickerItem[];
  className?: string;
  /** سرعت marquee (پیکسل بر ثانیه) — منفی برای راست به چپ */
  speed?: number;
}

function MarqueeRow({ items, speed }: { items: TickerItem[]; speed: number }) {
  const doubled = [...items, ...items, ...items, ...items];

  return (
    <div
      className="flex w-max items-center gap-1"
      style={{
        animation: `ticker-scroll ${Math.abs(1000 / speed)}s linear infinite`,
        animationDirection: speed > 0 ? 'reverse' : 'normal',
      }}
    >
      {doubled.map((item, idx) => (
        <div
          key={`${item.id}-${idx}`}
          className="flex shrink-0 items-center gap-1.5 px-3 py-1"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {item.name}
          </span>
          {item.symbol && (
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              {item.symbol}
            </span>
          )}
          <span className="text-xs font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
            {item.value}
          </span>
          {typeof item.change === 'number' && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-[10px] font-bold tabular-nums',
                item.change > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : item.change < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-neutral-500',
              )}
            >
              {item.change > 0 ? (
                <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} />
              ) : item.change < 0 ? (
                <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />
              ) : null}
              {Math.abs(item.change).toFixed(2)}%
            </span>
          )}
          <span className="mx-1 h-3 w-px bg-neutral-300/60 dark:bg-neutral-700/60" />
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
        'relative w-full overflow-hidden',
        'border-b border-neutral-200/40 dark:border-neutral-800/40',
        'bg-gradient-to-r from-neutral-50/80 via-white/90 to-neutral-50/80',
        'dark:from-neutral-950/80 dark:via-neutral-900/90 dark:to-neutral-950/80',
        'backdrop-blur-xl backdrop-saturate-150',
        'h-9',
        className,
      )}
      role="region"
      aria-label="نرخ‌های لحظه‌ای"
    >
      {/* Live indicator — چپ (در RTL) */}
      <div className="absolute inset-y-0 start-0 z-20 flex items-center gap-2 bg-gradient-to-l from-transparent via-white/80 to-white px-3 dark:via-neutral-900/80 dark:to-neutral-900">
        <div className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
        </div>
        <span className="hidden text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 sm:inline">
          LIVE
        </span>
      </div>

      {/* Fade edges */}
      <div
        className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-white/80 via-white/40 to-transparent dark:from-neutral-900/80 dark:via-neutral-900/40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-white/80 via-white/40 to-transparent dark:from-neutral-900/80 dark:via-neutral-900/40"
        aria-hidden
      />

      {/* Marquee */}
      <div className="group/ticker flex h-full items-center">
        <MarqueeRow items={items} speed={speed} />
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-25%);
          }
        }
        .group\\/ticker:hover :global(div[style*='ticker-scroll']) {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
