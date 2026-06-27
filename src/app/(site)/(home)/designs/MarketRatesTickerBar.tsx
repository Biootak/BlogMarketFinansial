// src/app/(site)/(home)/designs/MarketRatesTickerBar.tsx
// 2026-06-20: بازسازی برای استفاده از MarketRateItem (single source of truth).
// قبلا از getFreeMarketRates (legacy) استفاده می‌کرد.

'use client';

import type { MarketRateItem } from '@/lib/market-rates';
import { InfiniteTicker } from '@/components/InfiniteTicker';
import { TickerShell } from '@/components/TickerShell';
import { TrendingUp, TrendingDown, Minus, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWithUnit, formatChangePercent } from '@/lib/market-rates/format';

interface Props {
  rates: MarketRateItem[];
  label?: string;
}

export default function MarketRatesTickerBar({ rates, label = 'بازارها' }: Props) {
  if (!rates || rates.length === 0) return null;

  // InfiniteTicker خودش ۲ کپی می‌سازد — duplicate نکن
  const items = rates;

  return (
    <TickerShell
      height="md"
      fadeSize="md"
      tone="glass"
      ariaLabel="نرخ‌های بازار"
      showLiveDot
      lead={
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">زنده</span>
        </span>
      }
    >
      <InfiniteTicker duration={60} dir="rtl" pauseOnHover pauseOnHold>
        <div className="flex items-stretch">
          {items.map((rate, idx) => {
            const hasChange = Number.isFinite(rate.changePercent);
            const isPositive = hasChange && rate.changePercent > 0;
            const isNegative = hasChange && rate.changePercent < 0;
            const isLast = idx === items.length - 1;
            const changeColor = isPositive
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10'
              : isNegative
                ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/10'
                : 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60';
            return (
              <div
                key={rate.symbol}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-2 shrink-0',
                  !isLast && 'border-l border-neutral-200/70 dark:border-l-neutral-800/70',
                )}
              >
                <span className="text-[12px] sm:text-[13px] font-bold text-neutral-900 dark:text-neutral-100">
                  {rate.displayNameFa}
                </span>
                <span dir="ltr" className="text-[11px] sm:text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                  {formatWithUnit(rate.value, rate.unit, rate.decimals)}
                </span>
                {hasChange && rate.changePercent !== 0 && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md',
                      changeColor,
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                    <span dir="ltr" className="inline-block">
                      {formatChangePercent(rate.changePercent)}
                    </span>
                  </span>
                )}
                {hasChange && rate.changePercent === 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60">
                    <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span dir="ltr" className="inline-block">
                      {formatChangePercent(0)}
                    </span>
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
