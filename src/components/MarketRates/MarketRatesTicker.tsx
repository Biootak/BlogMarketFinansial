'use client';

/**
 * MarketRatesTicker — نوار متحرک نرخ‌های بازار (single source of truth)
 * ----------------------------------------------------------------------------
 * این کامپوننت مشترکِ صفحه‌ی اصلی و داشبورد است؛ هر دو جا از همین فایل
 * استفاده می‌کنند تا تجربه‌ی بصری یکسان و منبع داده‌ی واحد داشته باشیم.
 *
 * منبع داده: `MarketRateItem[]` از `@/lib/market-rates` که توسط
 * `assembleMarketRates()` در `@/actions/market-rates.getMarketRates()`
 * (TGJU + USDT + FX + manual) ساخته می‌شود.
 *
 * دو variant:
 *  - `homepage` (پیش‌فرض): TickerShell شیشه‌ای، Radio + LiveDot
 *  - `dashboard`: TickerShell خنثی، Pulse + ساعت، اندازه‌ی فشرده‌تر
 *
 * Primitives مشترک: `TickerShell` + `Ticker` (همان‌هایی که در سایر
 * نوارهای قیمت سایت استفاده می‌شوند).
 *
 * نکته‌های دسترسی:
 *  - `aria-label="نرخ‌های بازار"` روی track اصلی
 *  - تغییرات رنگ با کنتراست کافی برای WCAG AA
 *  - انیمیشن marquee در `prefers-reduced-motion` متوقف می‌شود
 *  - pause-on-hover/hold از طریق TickerShell (CSS-driven)
 */

import Ticker from '@/components/Ticker';
import { TickerShell } from '@/components/TickerShell';
import type { MarketRateItem } from '@/lib/market-rates';
import { formatChangePercent, formatWithUnit } from '@/lib/market-rates/format';
import { cn } from '@/lib/utils';
import { Radio } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';

export type MarketRatesTickerVariant = 'homepage' | 'dashboard';

export interface MarketRatesTickerProps {
  /** آرایه‌ی نرخ‌ها — همان `MarketRateItem[]` که در همه‌ی صفحات مشترک است. */
  rates: MarketRateItem[];
  /** پیش‌فرض `homepage`. داشبورد از `dashboard` استفاده می‌کند. */
  variant?: MarketRatesTickerVariant;
  /** برچسب کنار live dot (مثل «بازارها»، «بازار»). */
  label?: string;
  /** کلاس اضافی برای wrapper بیرونی. */
  className?: string;
  /** حداکثر تعداد نرخ‌هایی که در نوار نمایش داده می‌شوند. */
  maxItems?: number;
  /** اگر true باشد، حتی وقتی آرایه خالی است یک placeholder رندر می‌شود. */
  showEmptyState?: boolean;
  /** سرعت marquee بر حسب ثانیه (پیش‌فرض: ۶۰ برای homepage، ۵۰ برای dashboard). */
  duration?: number;
}

function TrendBadge({ value }: { value: number }) {
  const hasChange = Number.isFinite(value);
  const isPositive = hasChange && value > 0;
  const isNegative = hasChange && value < 0;
  const color = isPositive
    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
    : isNegative
      ? 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
      : 'text-neutral-600 dark:text-neutral-400 bg-neutral-500/10';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md',
        'font-bold tabular-nums',
        color,
      )}
    >
      <span dir="ltr" className="inline-block">
        {formatChangePercent(hasChange ? value : 0)}
      </span>
    </span>
  );
}

function MarketRatesTickerImpl({
  rates,
  variant = 'homepage',
  label,
  className,
  maxItems,
  showEmptyState = true,
  duration,
}: MarketRatesTickerProps) {
  // آیتم‌های معتبر — ارزش > 0 و finite
  const items = useMemo(
    () =>
      rates
        .filter((r) => Number.isFinite(r.value) && r.value > 0)
        .slice(0, maxItems ?? rates.length),
    [rates, maxItems],
  );

  // فقط داشبورد به ساعت زنده نیاز دارد
  const [now, setNow] = useState<string>('');
  useEffect(() => {
    if (variant !== 'dashboard') return;
    const fmt = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const update = () => setNow(fmt.format(new Date()));
    update();
    const t = window.setInterval(update, 60_000);
    return () => window.clearInterval(t);
  }, [variant]);

  // empty state فقط وقتی داده‌ای نیست و showEmptyState فعال است
  if (items.length === 0) {
    if (!showEmptyState) return null;
    return (
      <output
        className={cn(
          'flex items-center justify-center',
          'h-10 sm:h-11 rounded-2xl',
          'border border-neutral-200/70 dark:border-neutral-800/80',
          'bg-neutral-50/70 dark:bg-neutral-900/70 backdrop-blur-lg',
          'text-xs sm:text-sm text-neutral-500 dark:text-neutral-400',
          className,
        )}
        aria-live="polite"
      >
        نرخ‌ها در دسترس نیست.
      </output>
    );
  }

  const isDashboard = variant === 'dashboard';
  const tone = isDashboard ? 'neutral' : 'glass';
  const shellHeight = isDashboard ? 'sm' : 'md';
  const fadeSize = isDashboard ? 'sm' : 'md';
  const tickerDuration = duration ?? (isDashboard ? 50 : 60);
  const itemTextSize = isDashboard ? 'text-[11px] sm:text-[12px]' : 'text-[12px] sm:text-[13px]';
  const valueTextSize = isDashboard ? 'text-[11px] sm:text-[12px]' : 'text-[11px] sm:text-[12px]';
  const defaultLabel = isDashboard ? 'بازار' : 'بازارها';

  // Lead: متن + (icon | live dot)
  const leadContent = (
    <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold tracking-wide">
      {isDashboard ? (
        // داشبورد: Pulse متحرک + ساعت کوچک
        <>
          <span className="relative inline-flex" aria-hidden>
            <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-emerald-700 dark:text-emerald-300">{label ?? defaultLabel}</span>
          {now && (
            <span
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
              className="text-[9px] sm:text-[10px] font-medium text-neutral-500 dark:text-neutral-400 tabular-nums"
            >
              {now}
            </span>
          )}
        </>
      ) : (
        // صفحه اصلی: Radio + LiveDot
        <>
          <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-300">
            <span className="hidden sm:inline">{label ?? defaultLabel}</span>
            <span className="sm:hidden">زنده</span>
          </span>
        </>
      )}
    </span>
  );

  return (
    <div className={cn('relative', className)}>
      <TickerShell
        height={shellHeight}
        fadeSize={fadeSize}
        tone={tone}
        showLiveDot={!isDashboard}
        ariaLabel="نرخ‌های بازار"
        lead={leadContent}
      >
        <Ticker duration={tickerDuration} direction="rtl" pauseOnHover pauseOnHold>
          <div className="flex items-stretch">
            {items.map((rate, idx) => {
              const isLast = idx === items.length - 1;
              return (
                <div
                  key={rate.symbol}
                  className={cn(
                    'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 shrink-0',
                    itemTextSize,
                    !isLast && 'border-l border-neutral-200/70 dark:border-l-neutral-800/70',
                  )}
                >
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                    {rate.displayNameFa}
                  </span>
                  <span
                    dir="ltr"
                    className={cn(
                      'font-semibold tabular-nums text-neutral-700 dark:text-neutral-300',
                      valueTextSize,
                    )}
                  >
                    {formatWithUnit(rate.value, rate.unit, rate.decimals)}
                  </span>
                  {Number.isFinite(rate.changePercent) && rate.changePercent !== 0 && (
                    <TrendBadge value={rate.changePercent} />
                  )}
                </div>
              );
            })}
          </div>
        </Ticker>
      </TickerShell>
    </div>
  );
}

export default memo(MarketRatesTickerImpl);
