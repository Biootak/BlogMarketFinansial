'use client';

/**
 * MarketTicker — نوار متحرک قیمت‌های لحظه‌ای (نسخه ۲۰۲۶ — با Server Action)
 *
 * از TickerShell برای glassmorphism + pause-on-hover استفاده می‌کنه؛
 * فقط لایه‌ی live label و refresh دستی اینجا نگه داشته شدن چون رفتار
 * polling/refresh مختص این کامپوننت هست.
 *
 * تکنیک‌ها:
 *  1. Server Action (`getCryptoTickerData`) — initial data از سرور
 *  2. SWR-style polling — هر ۶۰ ثانیه refresh می‌کنه
 *  3. Smooth color transition برای تغییرات قیمت
 *  4. Marquee از ModernTrending
 *  5. Color-coded تغییرات (سبز/قرمز با low-saturation)
 *  6. respects prefers-reduced-motion
 */

import type { MarketTickerItem } from '@/actions/marketTickerActions';
import { Marquee } from '@/components/ModernTrending/effects/Marquee';
import { TickerShell } from '@/components/TickerShell';
import { cn, formatNumber, toPersianNumber } from '@/lib/utils';
import { Activity, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { memo, useCallback, useEffect, useState, useTransition } from 'react';

interface MarketTickerProps {
  initialData?: MarketTickerItem[];
  className?: string;
  /** آیا polling خودکار فعال باشد (پیش‌فرض: true، هر ۶۰ ثانیه) */
  pollInterval?: number;
  /** Server action برای fetch دوباره — اختیاری */
  refetchAction?: () => Promise<MarketTickerItem[]>;
}

function formatPrice(item: MarketTickerItem): string {
  const { category, unit } = item;
  const price = Number(item.price);

  if (!Number.isFinite(price)) return '—';

  // 2026-06-20: بعد از محدودسازی getCryptoTickerData به فقط crypto،
  // type MarketTickerItem.category فقط 'crypto' است. اگر در آینده
  // category های دیگری هم اضافه شد، منطق این تابع باید بازنگری شود.
  if (category === 'crypto' && unit === 'usd') {
    if (price < 1) {
      return `$${toPersianNumber(price.toFixed(4))}`;
    }
    return `$${toPersianNumber(formatNumber(Math.round(price)))}`;
  }

  // بقیه: تومان (پیش‌فرض) — در حال حاضر فقط fallback برای type safety است.
  return toPersianNumber(formatNumber(Math.round(price)));
}

function MarketTicker({
  initialData = [],
  className,
  pollInterval = 120_000,
  refetchAction,
}: MarketTickerProps) {
  const [data, setData] = useState<MarketTickerItem[]>(initialData);
  const [isPending, startTransition] = useTransition();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!refetchAction) return;
    startTransition(async () => {
      try {
        const fresh = await refetchAction();
        setData(fresh);
        setLastUpdate(new Date());
      } catch {
        // silent — ticker is optional
      }
    });
  }, [refetchAction]);

  useEffect(() => {
    if (initialData.length > 0) {
      setLastUpdate(new Date());
    }
  }, [initialData.length]);

  // Pause polling when the tab is hidden to avoid wasted network/server load.
  // Keeps the same visible behavior; just stops background refreshes.
  useEffect(() => {
    if (!refetchAction || pollInterval <= 0) return;

    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) clearInterval(id);
      id = setInterval(refresh, pollInterval);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };

    start();

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        refresh();
        start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stop();
    };
  }, [refetchAction, pollInterval, refresh]);

  const handleRefresh = refresh;

  if (data.length === 0) return null;

  // لایه‌ی LIVE با pulse — مختص این کامپوننت (رنگ emerald متمایز)
  const liveLabel = (
    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums tracking-wide flex items-center gap-1.5">
      <Activity
        className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 dark:text-emerald-400"
        strokeWidth={2.25}
      />
      LIVE
    </span>
  );

  return (
    <div className={cn('relative anim-fade-in-down', className)}>
      <TickerShell height="md" tone="emerald" showLiveDot ariaLabel="نرخ‌های زنده" lead={liveLabel}>
        <Marquee speed={-10} pauseOnHover pauseOnHold>
          {data.map((item) => {
            const isUp = item.change >= 0;
            const Icon = isUp ? TrendingUp : TrendingDown;
            return (
              <div
                key={`${item.category}-${item.symbol}`}
                className={cn(
                  'group/item flex items-center gap-2 sm:gap-3 px-3 sm:px-4',
                  'text-[11px] sm:text-[13px]',
                  'text-neutral-700 dark:text-neutral-300',
                  'tabular-nums',
                  'font-vazirmatn',
                )}
              >
                <span className="font-bold text-neutral-900 dark:text-white">{item.symbol}</span>
                <span className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px] hidden sm:inline">
                  {item.name}
                </span>
                <span className="font-medium tabular-nums">{formatPrice(item)}</span>
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
                <span className="text-neutral-300 dark:text-neutral-700" aria-hidden>
                  ·
                </span>
              </div>
            );
          })}
        </Marquee>
      </TickerShell>

      {/* Refresh + last update — خارج از shell تا positioning مستقل داشته باشه */}
      {refetchAction && (
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 end-2 z-20',
            'hidden md:flex items-center gap-1.5',
            'h-7 px-2 rounded-lg',
            'bg-white/70 dark:bg-neutral-800/70 backdrop-blur-md',
            'border border-neutral-200/60 dark:border-neutral-700/60',
            'text-[10px] text-neutral-500 dark:text-neutral-400',
            'font-vazirmatn tabular-nums',
          )}
        >
          {lastUpdate && (
            // dir="ltr" + isolate: تضمین می‌کنه ترتیب HH:MM در RTL حفظ بشه
            <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
              {toPersianNumber(
                lastUpdate.toLocaleTimeString('fa-IR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              )}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded-md',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
              'cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            aria-label="بروزرسانی قیمت‌ها"
          >
            <RefreshCw className={cn('h-3 w-3', isPending && 'animate-spin')} strokeWidth={2.25} />
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(MarketTicker);
