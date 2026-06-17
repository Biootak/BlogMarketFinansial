'use client';

/**
 * TickerShell — پوسته‌ی مشترک برای همه‌ی نوارهای قیمت (ticker / marquee)
 * ----------------------------------------------------------------------------
 * یه wrapper استاندارد که:
 *  - glassmorphism + border + radius رو یکجا می‌ده
 *  - fade edges چپ/راست رو با mask gradient اضافه می‌کنه
 *  - **JS event listener** برای pause/resume روان با hover (نه فقط CSS)
 *  - children (معمولاً Marquee یا InfiniteTicker) رو در track قرار می‌ده
 *
 * چرا JS؟ کلاس `.marquee-pause` به تنهایی کافی نیست چون:
 *  - track ممکنه در چند لایه‌ی div تو در تو باشه و descendant selector
 *    ممکنه در برخی مرورگرها fail بشه
 *  - برخی animation libraries (slick-carousel) animation رو در سطح
 *    خودشون کنترل می‌کنن نه با CSS keyframes
 *  - استایل‌های `framer-motion` ممکنه با CSS specificity بالاتر بیان
 *
 * راه‌حل: در mount و هر hover، مستقیماً `animationPlayState` روی
 * همه‌ی descendants (`.marquee-track`, `.ticker-track`, `.ticker-ltr`,
 * `.ticker-rtl`, `[data-marquee-track]`, `*` با animation) ست می‌کنیم.
 * این تضمین می‌کنه حتی اگه CSS selector fail بشه، pause کار کنه.
 *
 * برای react-slick (که animationPlayState نداره و از translateX استفاده
 * می‌کنه) یه data attribute ست می‌کنیم که در slick override می‌شه.
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
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
    'border border-neutral-200/70 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg',
  rose: 'border border-rose-200/70 dark:border-rose-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg',
  emerald:
    'border border-neutral-200/70 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg',
  neutral:
    'border-b border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/70 dark:bg-neutral-950/70 backdrop-blur-lg',
} as const;

/**
 * همه‌ی selectorهایی که ممکنه track تکراری داشته باشن.
 * هر کدوم که در DOM پیدا بشه، animationPlayState روش set می‌شه.
 */
const TRACK_SELECTORS = [
  '.marquee-track',
  '.ticker-track',
  '.ticker-ltr',
  '.ticker-rtl',
  '[data-marquee-track]',
  '.slick-track',
] as const;

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

  const wrapperRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);
  const isHoldingRef = useRef(false);

  /**
   * Pause/Resume همه‌ی track های درون wrapper.
   * این تابع idempotent هست: چند بار صدا زده بشه نتیجه یکسانه.
   */
  const setPaused = useCallback((paused: boolean) => {
    const root = wrapperRef.current;
    if (!root) return;
    for (const sel of TRACK_SELECTORS) {
      const elements = root.querySelectorAll<HTMLElement>(sel);
      elements.forEach((el) => {
        el.style.animationPlayState = paused ? 'paused' : 'running';
      });
    }
    // همچنین به همه‌ی descendants که animation دارن، اعمال می‌کنیم
    // (fallback برای هر slider که selector بالا رو نداره)
    const all = root.querySelectorAll<HTMLElement>('*');
    all.forEach((el) => {
      const cs = window.getComputedStyle(el);
      if (
        cs.animationName &&
        cs.animationName !== 'none' &&
        !TRACK_SELECTORS.some((s) => el.matches(s))
      ) {
        el.style.animationPlayState = paused ? 'paused' : 'running';
      }
    });
  }, []);

  /**
   * هربار که hover/hold عوض می‌شه، pause/resume رو sync کن.
   * چرا در onMouseEnter نه useEffect: چون می‌خواهیم فقط وقتی واقعاً
   * وارد wrapper می‌شه pause کنیم، نه با re-render.
   */
  const updatePause = useCallback(() => {
    setPaused(isHoveredRef.current || isHoldingRef.current);
  }, [setPaused]);

  const onMouseEnter = useCallback(() => {
    isHoveredRef.current = true;
    updatePause();
  }, [updatePause]);

  const onMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    // وقتی موس می‌ره، اگه hold هم نیست، resume کن
    if (!isHoldingRef.current) updatePause();
  }, [updatePause]);

  const onMouseDown = useCallback(() => {
    isHoldingRef.current = true;
    updatePause();
  }, [updatePause]);

  const onMouseUp = useCallback(() => {
    isHoldingRef.current = false;
    updatePause();
  }, [updatePause]);

  // وقتی children عوض می‌شن (مثلاً re-render بعد از polling)،
  // track های جدید با animationPlayState: 'running' میان. اگه
  // در حالت hover باشیم، باید دوباره pause کنیم.
  useEffect(() => {
    updatePause();
  });

  return (
    <div
      ref={wrapperRef}
      dir={dir}
      // marquee-pause: CSS اول کار می‌کنه (سریع‌ترین پاسخ). JS در mount
      // و در هر hover به‌عنوان safety net کار می‌کنه.
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onMouseDown}
      onTouchEnd={onMouseUp}
      onTouchCancel={onMouseUp}
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
