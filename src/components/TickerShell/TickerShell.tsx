'use client';

/**
 * TickerShell — پوسته‌ی مشترک برای همه‌ی نوارهای قیمت (ticker / marquee)
 * ----------------------------------------------------------------------------
 * یه wrapper استاندارد که:
 *  - glassmorphism + border + radius رو یکجا می‌ده
 *  - fade edges چپ/راست رو با mask gradient اضافه می‌کنه
 *  - به‌صورت خودکار `marquee-pause` کلاس رو می‌ذاره
 *  - live indicator (نقطه‌ی متحرک) رو در start-side اضافه می‌کنه (اختیاری)
 *  - children (معمولاً Marquee یا InfiniteTicker) رو در track قرار می‌ده
 *
 * این کامپوننت جایگزین markup تکراری توی TickerBar / MarketTickerBar /
 * MarketRatesTickerBar می‌شه. برای اضافه کردن آیتم جدید فقط کافیه
 * children رو بنویسی.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TickerShellProps {
  /** محتوای track (معمولاً Marquee یا InfiniteTicker با item map) */
  children: ReactNode;
  /** آیتم‌های lead که قبل از track نمایش داده می‌شن (مثلاً «LIVE» یا «بازارها») */
  lead?: ReactNode;
  /** ارتفاع کل. پیش‌فرض `h-10` (40px). */
  height?: 'sm' | 'md' | 'lg';
  /** سایز fade edge. پیش‌فرض `md`. */
  fadeSize?: 'sm' | 'md' | 'lg';
  /** رنگ پس‌زمینه. پیش‌فرض glass. */
  tone?: 'glass' | 'rose' | 'emerald' | 'neutral';
  /** کلاس اضافی برای outer wrapper */
  className?: string;
  /** dir برای RTL. پیش‌فرض `rtl`. */
  dir?: 'rtl' | 'ltr';
  /** نمایش دادن live dot متحرک. پیش‌فرض `false`. */
  showLiveDot?: boolean;
  /** توضیح کوتاه برای screen reader */
  ariaLabel?: string;
}

const HEIGHT_CLASSES = {
  sm: 'h-8',
  md: 'h-10 sm:h-11',
  lg: 'h-12 sm:h-14',
} as const;

const FADE_CLASSES = {
  sm: 'w-6 sm:w-8',
  md: 'w-8 sm:w-12',
  lg: 'w-10 sm:w-16',
} as const;

const TONE_CLASSES = {
  glass:
    'border border-neutral-200/70 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md',
  rose: 'border border-rose-200/70 dark:border-rose-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md',
  emerald:
    'border border-neutral-200/70 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md',
  neutral:
    'border-b border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/70 dark:bg-neutral-950/70 backdrop-blur-xl',
} as const;

export default function TickerShell({
  children,
  lead,
  height = 'md',
  fadeSize = 'md',
  tone = 'glass',
  className,
  dir = 'rtl',
  showLiveDot = false,
  ariaLabel,
}: TickerShellProps) {
  const heightClass = HEIGHT_CLASSES[height];
  const fadeClass = FADE_CLASSES[fadeSize];
  const toneClass = TONE_CLASSES[tone];

  return (
    <div
      dir={dir}
      // marquee-pause: hover هر نقطه‌ی این wrapper (شامل lead و fade)
      // track درونش رو متوقف می‌کنه
      className={cn(
        'marquee-pause relative flex items-center gap-2 sm:gap-3 rounded-2xl overflow-hidden',
        heightClass,
        toneClass,
        'shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_2px_8px_-4px_rgba(20,23,32,0.08)]',
        'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_2px_8px_-4px_rgba(0,0,0,0.3)]',
        className,
      )}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Lead badge (مثل LIVE / بازارها) */}
      {lead && (
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 h-full px-3 sm:px-3.5">
          {showLiveDot && (
            <span className="relative inline-flex" aria-hidden>
              <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
          {lead}
        </div>
      )}

      {/* Vertical divider بعد از lead */}
      {lead && <div className="w-px h-1/2 bg-gradient-to-b from-transparent via-neutral-300 dark:via-neutral-700 to-transparent shrink-0" />}

      {/* Track area — children معمولاً Marquee/InfiniteTicker هستن */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* Fade edges */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 start-0 bg-gradient-to-r from-white/95 dark:from-neutral-900/95 to-transparent z-10',
          fadeClass,
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 end-0 bg-gradient-to-l from-white/95 dark:from-neutral-900/95 to-transparent z-10',
          fadeClass,
        )}
      />
    </div>
  );
}
