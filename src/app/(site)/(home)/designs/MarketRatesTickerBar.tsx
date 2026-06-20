'use client';

/**
 * MarketRatesTickerBar
 * ----------------------------------------------------------------------------
 * نوار افقی بالای اسلایدر اصلی که شاخص‌های کلیدی بازار را به صورت
 * marquee بی‌نهایت نمایش می‌دهد.
 *
 * از TickerShell برای glassmorphism + pause-on-hover استفاده می‌کنه.
 * سازگار با RTL و prefers-reduced-motion.
 */
import type { MarketRateItem } from '@/actions/marketRates';
import { InfiniteTicker } from '@/components/InfiniteTicker';
import { TickerShell } from '@/components/TickerShell';
import { TrendingUp, TrendingDown, Radio } from 'lucide-react';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';

interface MarketRatesTickerBarProps {
  rates: MarketRateItem[];
  /** عنوان بخش (مثلاً "بازارها" یا "بازار زنده"). */
  label?: string;
}

export default function MarketRatesTickerBar({
  rates,
  label = 'بازارها',
}: MarketRatesTickerBarProps) {
  if (!rates || rates.length === 0) return null;

  // کپی برای seamless loop
  const items = [...rates, ...rates];

  return (
    <TickerShell
      height="md"
      fadeSize="md"
      tone="glass"
      ariaLabel="نرخ‌های بازار"
      lead={
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">زنده</span>
        </span>
      }
    >
      <InfiniteTicker duration={60} dir="rtl" pauseOnHover pauseOnHold>
        <div className="flex items-center divide-x divide-neutral-200/70 dark:divide-neutral-800/70">
          {items.map((rate, idx) => {
            const isPositive = rate.change >= 0;
            const formattedToman = toPersianNumber(formatNumber(Math.round(rate.price)));
            return (
              <div
                key={`${rate.symbol}-${idx}`}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 shrink-0"
              >
                {/* Symbol */}
                <span className="text-[12px] sm:text-[13px] font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {rate.symbol}
                </span>

                {/* Name (فارسی) */}
                <span className="hidden xs:inline sm:inline text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[6rem] sm:max-w-[8rem]">
                  {rate.name}
                </span>

                {/* Price (Toman) */}
                <span className="text-[11px] sm:text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                  {formattedToman}
                  <span className="text-[9px] text-neutral-600 dark:text-neutral-400 mr-0.5">
                    تومان
                  </span>
                </span>

                {/* Change */}
                {rate.change !== 0 && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md',
                      isPositive
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10'
                        : 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/10',
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                    {isPositive ? '+' : ''}
                    {toPersianNumber(rate.change.toFixed(2))}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </InfiniteTicker>
    </TickerShell>
  );
}
