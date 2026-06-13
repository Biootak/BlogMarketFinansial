'use client';

/**
 * MarketTicker — نوار متحرک قیمت‌های لحظه‌ای (نسخه ۲۰۲۶ — با Server Action)
 *
 * تکنیک‌ها:
 *  1. Server Action (`getMarketTickerData`) — initial data از سرور
 *  2. SWR-style polling — هر ۶۰ ثانیه refresh می‌کنه (هم‌راستا با cache)
 *  3. Smooth color transition برای تغییرات قیمت
 *  4. Marquee (از ModernTrending)
 *  5. Hairline borders + glassmorphism
 *  6. Pause on hover
 *  7. Color-coded تغییرات (سبز/قرمز با low-saturation)
 *  8. respects prefers-reduced-motion
 *
 * نکته: server data فقط یک‌بار در mount می‌ره — polling اختیاری.
 */

import { useEffect, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { Marquee } from '@/components/ModernTrending/effects/Marquee';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';
import { STRIPE_EASE } from '@/lib/motion';
import type { MarketTickerItem } from '@/actions/marketTickerActions';

interface MarketTickerProps {
  initialData?: MarketTickerItem[];
  className?: string;
  /** آیا polling خودکار فعال باشد (پیش‌فرض: true، هر ۶۰ ثانیه) */
  pollInterval?: number;
  /** Server action برای fetch دوباره — اختیاری */
  refetchAction?: () => Promise<MarketTickerItem[]>;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatPrice(item: MarketTickerItem): string {
  const { price, category, unit } = item;

  if (category === 'crypto' && unit === 'usd') {
    if (price < 1) {
      return `$${toPersianNumber(price.toFixed(4))}`;
    }
    return `$${toPersianNumber(formatNumber(Math.round(price)))}`;
  }

  if (category === 'commodity' && unit === 'usd') {
    return `$${toPersianNumber(price.toFixed(2))}`;
  }

  // بقیه: تومان (پیش‌فرض)
  return toPersianNumber(formatNumber(Math.round(price)));
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function MarketTicker({
  initialData = [],
  className,
  pollInterval = 60_000,
  refetchAction,
}: MarketTickerProps) {
  const [data, setData] = useState<MarketTickerItem[]>(initialData);
  const [isPending, startTransition] = useTransition();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  /* ---------- Initial lastUpdate ---------- */
  useEffect(() => {
    if (initialData.length > 0) {
      setLastUpdate(new Date());
    }
  }, [initialData.length]);

  /* ---------- Polling: refresh هر N ثانیه ---------- */
  useEffect(() => {
    if (!refetchAction || pollInterval <= 0) return;
    const id = setInterval(() => {
      startTransition(async () => {
        try {
          const fresh = await refetchAction();
          setData(fresh);
          setLastUpdate(new Date());
        } catch {
          // silent
        }
      });
    }, pollInterval);
    return () => clearInterval(id);
  }, [refetchAction, pollInterval]);

  /* ---------- Manual refresh ---------- */
  const handleRefresh = () => {
    if (!refetchAction) return;
    startTransition(async () => {
      try {
        const fresh = await refetchAction();
        setData(fresh);
        setLastUpdate(new Date());
      } catch {
        // silent
      }
    });
  };

  if (data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: STRIPE_EASE }}
      className={cn(
        'relative flex items-center gap-2 sm:gap-3',
        'h-10 sm:h-11',
        'rounded-2xl',
        'border border-neutral-200/70 dark:border-neutral-800/80',
        'bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md',
        'overflow-hidden',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_2px_8px_-4px_rgba(20,23,32,0.08)]',
        'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_2px_8px_-4px_rgba(0,0,0,0.3)]',
        className,
      )}
    >
      {/* Live label */}
      <div
        className={cn(
          'flex items-center gap-1.5 shrink-0',
          'h-full px-3 sm:px-3.5',
          'bg-gradient-to-l from-emerald-500/10 to-transparent',
          'border-l border-neutral-200/70 dark:border-neutral-800/80',
        )}
      >
        <span className="relative inline-flex" aria-hidden>
          <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40 opacity-60" />
          <Activity
            className="relative h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 dark:text-emerald-400"
            strokeWidth={2.25}
          />
        </span>
        <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums tracking-wide">
          LIVE
        </span>
      </div>

      {/* Marquee */}
      <div className="flex-1 min-w-0">
        <Marquee speed={-30} pauseOnHover>
          {data.map((item) => {
            const isUp = item.change >= 0;
            const Icon = isUp ? TrendingUp : TrendingDown;
            return (
              <div
                key={item.symbol}
                className={cn(
                  'group/item flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3',
                  'text-[11px] sm:text-[13px]',
                  'text-neutral-700 dark:text-neutral-300',
                  'tabular-nums',
                  'font-vazirmatn',
                )}
              >
                <span className="font-bold text-neutral-900 dark:text-white">
                  {item.symbol}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px] hidden sm:inline">
                  {item.name}
                </span>
                <span className="font-medium tabular-nums">
                  {formatPrice(item)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md',
                    'text-[9px] sm:text-[10px] font-semibold tabular-nums',
                    isUp
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
                  )}
                >
                  <Icon className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                  {isUp ? '+' : ''}
                  {toPersianNumber(item.change.toFixed(2))}%
                </span>
                <span
                  className="text-neutral-300 dark:text-neutral-700"
                  aria-hidden
                >
                  ·
                </span>
              </div>
            );
          })}
        </Marquee>
      </div>

      {/* Refresh + last update */}
      {refetchAction && (
        <div
          className={cn(
            'hidden md:flex items-center gap-1.5 shrink-0',
            'h-full px-2.5',
            'border-r border-neutral-200/70 dark:border-neutral-800/80',
            'text-[10px] text-neutral-500 dark:text-neutral-400',
            'font-vazirmatn tabular-nums',
          )}
        >
          {lastUpdate && (
            <span>
              {toPersianNumber(lastUpdate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-md',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
              'cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            aria-label="بروزرسانی قیمت‌ها"
          >
            <RefreshCw
              className={cn(
                'h-3 w-3',
                isPending && 'animate-spin',
              )}
              strokeWidth={2.25}
            />
          </button>
        </div>
      )}
    </motion.div>
  );
}
