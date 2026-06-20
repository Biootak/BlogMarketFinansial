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
import { TrendingUp, TrendingDown, Minus, Radio } from 'lucide-react';
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

  // InfiniteTicker خودش دو کپی از children می‌سازد (یکی aria-hidden)
  // تا حلقه‌ی seamless با translateX -50% کار کنه. duplicate در اینجا
  // ۴ کپی روی track می‌گذارد و یک پرش بزرگ در حلقه ایجاد می‌کنه.
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
            const hasChange = Number.isFinite(rate.change);
            const isPositive = hasChange && rate.change > 0;
            const isNegative = hasChange && rate.change < 0;
            const isFlat = !isPositive && !isNegative;
            const isLast = idx === items.length - 1;
            const formattedToman = toPersianNumber(formatNumber(Math.round(rate.price)));
            const changeColor = isPositive
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10'
              : isNegative
                ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/10'
                : 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60';
            return (
              <div
                key={`${rate.symbol}-${idx}`}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-2 shrink-0',
                  // خط جداکننده‌ی عمودی بین آیتم‌ها به‌صورت border-r
                  // (در RTL همیشه سمت راست هر آیتم). روی آخرین آیتم حذف می‌شود
                  // تا در wrap-around حلقه دوتایی نشه.
                  !isLast && 'border-l border-neutral-200/70 dark:border-l-neutral-800/70',
                )}
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

                {/* Change — حتی وقتی 0 هست pill خاکستری با آیکون Minus نشون داده می‌شه
                    تا کاربر بدونه تغییر لحظه‌ای موجود نیست (نه اینکه دیتا غایبه).
                    عدد در یک <span dir="ltr"> ایزوله می‌شه تا الگوریتم BiDi در یک
                    container RTL، ارقام فارسی را معکوس نکند (مثلا '+۳.۱۹%' به
                    صورت '%۳.۱۹+' دیده نشود). */}
                {hasChange && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md',
                      changeColor,
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : isNegative ? (
                      <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                    <span dir="ltr" className="inline-block">
                      {isPositive ? '+' : ''}
                      {toPersianNumber(rate.change.toFixed(2))}%
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
