'use client';

/**
 * MarketTickerBar
 * ----------------------------------------------------------------------------
 * نسخه‌ی legacy که از ExchangeRate[] استفاده می‌کنه (irrPrice / change).
 * الان فقط با TickerShell ترکیب می‌شه؛ markup اضافی همگی به TickerShell واگذار شد.
 */
import type { ExchangeRate } from '@/types/types';
import { InfiniteTicker } from '@/components/InfiniteTicker';
import { TickerShell } from '@/components/TickerShell';
import { TrendingUp, TrendingDown, Radio, Activity } from 'lucide-react';

interface MarketTickerBarProps {
  rates: ExchangeRate[];
  /** عنوان بخش (مثلاً "بازارها" یا "بازار زنده"). */
  label?: string;
}

export default function MarketTickerBar({
  rates,
  label = 'بازارها',
}: MarketTickerBarProps) {
  if (!rates || rates.length === 0) return null;

  // کپی برای seamless loop
  const items = [...rates, ...rates];

  return (
    <TickerShell
      height="md"
      fadeSize="md"
      ariaLabel="نرخ‌های لحظه‌ای"
      lead={
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 dark:text-rose-400" />
          <span className="hidden sm:inline text-rose-700 dark:text-rose-300">{label}</span>
          <span className="sm:hidden text-rose-700 dark:text-rose-300">زنده</span>
        </span>
      }
    >
      <InfiniteTicker duration={60} dir="rtl" pauseOnHover pauseOnHold>
        <div className="flex items-center divide-x divide-neutral-200/70 dark:divide-neutral-800/70">
          {items.map((rate, idx) => {
            const isPositive = rate.change >= 0;
            const formattedToman = Math.floor(rate.irrPrice / 10).toLocaleString('fa-IR');
            return (
              <div
                key={`${rate.symbol}-${idx}`}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 shrink-0"
              >
                <span className="text-[12px] sm:text-[13px] font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {rate.symbol}
                </span>

                <span className="text-[11px] sm:text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                  {formattedToman}
                  <span className="text-[9px] text-neutral-600 dark:text-neutral-400 mr-0.5">
                    تومان
                  </span>
                </span>

                <span
                  className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                    isPositive
                      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10'
                      : 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/10'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  )}
                  {isPositive ? '+' : ''}
                  {rate.change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </InfiniteTicker>

      {/* Activity Icon در سمت چپ (md+) — relative به TickerShell */}
      <div className="hidden md:flex items-center px-3 shrink-0 z-20">
        <Activity className="w-3.5 h-3.5 text-neutral-400" />
      </div>
    </TickerShell>
  );
}
