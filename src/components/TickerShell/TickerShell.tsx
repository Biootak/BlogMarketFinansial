'use client';

import { cn } from '@/lib/utils';
/**
 * TickerShell — پوسته‌ی مشترک برای همه‌ی نوارهای قیمت (ticker / marquee)
 * ----------------------------------------------------------------------------
 * یه wrapper استاندارد که:
 *  - glassmorphism + border + radius رو یکجا می‌ده
 *  - fade edges چپ/راست رو با mask gradient اضافه می‌کنه
 *  - **JS event listener** برای pause/resume روان با hover (نه فقط CSS)
 *  - children (معمولاً Marquee یا InfiniteTicker) رو در track قرار می‌ده
 *
 * pause کاملاً CSS-driven است: کلاس `.marquee-pause` (برای hover) و اتربیوت
 * `data-holding` (برای click-and-hold) روی همین wrapper ست می‌شن و قوانین
 * موجود در globals.css (`.marquee-pause:hover .ticker-…` و
 * `[data-holding='true'] .ticker-…`) انیمیشن track را متوقف می‌کنند.
 *
 * نسخه‌ی قبلی در یک useEffect بدون deps کل زیردرخت را با
 * `querySelectorAll('*')` + `getComputedStyle` پیمایش می‌کرد و روی هر گره یک
 * reflow همگام تحمیل می‌کرد؛ با چند tiker در صفحه این به layout thrashing
 * مداوم و افت INP منجر می‌شد. مسیر CSS کافی است و آن JS حذف شد.
 */
import { type ReactNode, useCallback, useState } from 'react';

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
    'border border-neutral-200/70 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg',
  rose: 'border border-rose-200/70 dark:border-rose-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg',
  emerald:
    'border border-neutral-200/70 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg',
  neutral:
    'border-b border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/70 dark:bg-neutral-950/70 backdrop-blur-lg',
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

  // hover کاملاً با CSS (`.marquee-pause:hover`) هندل می‌شه. فقط hold
  // (click/touch-and-hold) به یک state سبک نیاز داره که اتربیوت
  // `data-holding` رو toggle کنه؛ بقیه‌ی کار با قانون globals.css انجام می‌شه.
  const [holding, setHolding] = useState(false);

  const startHold = useCallback(() => setHolding(true), []);
  const endHold = useCallback(() => setHolding(false), []);

  return (
    <section
      dir={dir}
      data-holding={holding ? 'true' : 'false'}
      // marquee-pause: hover کاملاً CSS-driven (سریع‌ترین پاسخ، بدون reflow).
      className={cn(
        'marquee-pause relative flex items-center gap-2 sm:gap-3 rounded-2xl overflow-hidden',
        heightClass,
        toneClass,
        'shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_2px_8px_-4px_rgba(20,23,32,0.08)]',
        'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_2px_8px_-4px_rgba(0,0,0,0.3)]',
        className,
      )}
      aria-label={ariaLabel}
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
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
      {lead && (
        <div className="w-px h-1/2 bg-gradient-to-b from-transparent via-neutral-300 dark:via-neutral-700 to-transparent shrink-0" />
      )}

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
    </section>
  );
}
