'use client';

/**
 * NavasanTickerBar — نوار باریک «بازارها» در هدر/اسلایدر اصلی
 * ----------------------------------------------------------------------------
 * نمایش زنده‌ی نرخ‌های بازار ایران **مستقیماً** از Navasan:
 *  - دلار (خرید صرافی، فروش صرافی، هرات، شخصی، شرکتی)
 *  - یورو، پوند، درهم، لیر، یوان
 *  - سکه (امامی، بهار آزادی، نیم، ربع، گرمی)
 *  - طلا (۱۸ عیار، آبشده)
 *  - تتر
 *
 * اعداد **همان** مقادیر خام Navasan هستند (تومان). هیچ فرمول
 * تبدیلی اعمال نمی‌شه تا عدد نمایشی با عدد واقعی بازار یکی باشه.
 *
 * - pause on hover/hold (از TickerShell)
 * - prefers-reduced-motion → instant scroll
 * - RTL-safe
 * - بدون framer-motion (CSS keyframe در InfiniteTicker)
 */

import type { NavasanTickerItem } from '@/actions/navasanTickerRates';
import { InfiniteTicker } from '@/components/InfiniteTicker';
import { TickerShell } from '@/components/TickerShell';
import { TrendingUp, TrendingDown, Radio } from 'lucide-react';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';

interface NavasanTickerBarProps {
  items: NavasanTickerItem[];
  /** عنوان بخش (مثلاً "بازارها" یا "بازار زنده"). */
  label?: string;
}

export default function NavasanTickerBar({
  items,
  label = 'بازارها',
}: NavasanTickerBarProps) {
  if (!items || items.length === 0) return null;

  return (
    <TickerShell
      height="md"
      fadeSize="md"
      tone="glass"
      ariaLabel="نرخ‌های بازار (نوسان)"
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
          {items.map((item) => {
            const isPositive = item.change > 0;
            const isNegative = item.change < 0;
            const formattedPrice = toPersianNumber(formatNumber(item.price));
            return (
              <div
                key={item.key}
                title={item.name}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 shrink-0"
              >
                {/* Symbol */}
                <span className="text-[12px] sm:text-[13px] font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                  {item.symbol}
                </span>

                {/* Price — مقدیر خام Navasan بدون هیچ تبدیلی */}
                <span className="text-[11px] sm:text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums whitespace-nowrap">
                  {formattedPrice}
                  <span className="text-[9px] text-neutral-500 dark:text-neutral-400 mr-0.5">
                    تومان
                  </span>
                </span>

                {/* Change */}
                {item.change !== 0 && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md',
                      isPositive
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10'
                        : isNegative
                          ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/10'
                          : 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-500/10',
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : isNegative ? (
                      <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : null}
                    {isPositive ? '+' : ''}
                    {toPersianNumber(item.change.toFixed(2))}%
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
