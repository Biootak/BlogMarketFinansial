'use client';

import type { ExchangeRate } from '@/types/types';
import InfiniteTicker from '@/components/InfiniteTicker';
import { TrendingUp, TrendingDown, Activity, Radio } from 'lucide-react';

interface MarketTickerBarProps {
  rates: ExchangeRate[];
  /** عنوان بخش (مثلاً "بازارها" یا "بازار زنده"). */
  label?: string;
}

/**
 * MarketTickerBar
 * ----------------------------------------------------------------------------
 * نوار افقی بالای اسلایدر اصلی که شاخص‌های کلیدی بازار را به صورت
 * marquee بی‌نهایت نمایش می‌دهد.
 *
 * ویژگی‌ها:
 *  - نشانگر «زنده» با pulse انیمیشن
 *  - رنگ‌بندی سبز/قرمز بر اساس تغییر ۲۴ ساعته
 *  - فونت monospace برای اعداد
 *  - استفاده از InfiniteTicker برای اسکرول ۶۰fps
 *  - glassmorphism با blur ملایم
 *  - سازگار با RTL و prefers-reduced-motion
 * ----------------------------------------------------------------------------
 */
export default function MarketTickerBar({
  rates,
  label = 'بازارها',
}: MarketTickerBarProps) {
  // اگر دیتا خالی باشه، چیزی نشون نده
  if (!rates || rates.length === 0) return null;

  // کپی برای seamless loop
  const items = [...rates, ...rates];

  return (
    <div
      dir="rtl"
      className="relative rounded-2xl overflow-hidden border border-neutral-200/70 dark:border-neutral-800/70 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900 shadow-sm"
    >
      {/* Inner glass overlay */}
      <div className="absolute inset-0 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative flex items-stretch">
        {/* Live Label */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-l from-rose-500 to-pink-600 text-white text-xs sm:text-sm font-bold shrink-0 z-10 shadow-lg shadow-rose-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">زنده</span>
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-neutral-300 dark:via-neutral-700 to-transparent shrink-0" />

        {/* Ticker Track */}
        <div className="flex-1 min-w-0 overflow-hidden">
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
                    {/* Symbol */}
                    <span className="text-[12px] sm:text-[13px] font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {rate.symbol}
                    </span>

                    {/* Price (Toman) */}
                    <span className="text-[11px] sm:text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                      {formattedToman}
                      <span className="text-[9px] text-neutral-600 dark:text-neutral-400 mr-0.5">
                        تومان
                      </span>
                    </span>

                    {/* Change */}
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
        </div>

        {/* Activity Icon (Right side in RTL = end side) */}
        <div className="hidden md:flex items-center px-3 border-r border-neutral-200/70 dark:border-neutral-800/70 shrink-0">
          <Activity className="w-3.5 h-3.5 text-neutral-400" />
        </div>
      </div>

      {/* Edge fade gradients for smooth visual */}
      <div className="pointer-events-none absolute inset-y-0 start-0 w-8 sm:w-12 bg-gradient-to-r from-white/95 dark:from-neutral-900/95 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 end-0 w-8 sm:w-12 bg-gradient-to-l from-white/95 dark:from-neutral-900/95 to-transparent z-10" />
    </div>
  );
}
