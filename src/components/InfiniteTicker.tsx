'use client';

/**
 * InfiniteTicker
 * ----------------------------------------------------------------------------
 * A smooth, continuous marquee-style ticker (think news broadcast ribbon).
 * Items scroll infinitely from one side to the other.
 *
 * Implementation notes:
 *  - Pure CSS keyframe animation (no JS interval) → buttery 60fps.
 *  - Two duplicate groups + `min-w-[200%]` on the track → viewport is
 *    always full on the very first paint, no empty space.
 *  - The animation moves the whole track by -50% (one group width); at
 *    that moment the second copy is exactly where the first was —
 *    producing a seamless wrap.
 *  - `prefers-reduced-motion` is respected → animation paused.
 *  - Pauses on hover/hold via `useTickerPause` (CSS + JS belt-and-braces).
 *  - RTL-safe: pass `dir="rtl"` for Persian/Arabic UIs.
 */
import type React from 'react';
import { useMemo } from 'react';
import { useTickerPause } from '@/hooks/useTickerPause';

interface InfiniteTickerProps {
  children: React.ReactNode;
  /** Seconds for one full loop. Lower = faster. Default 40s. */
  duration?: number;
  /** Pause the animation when the user hovers. Default true. */
  pauseOnHover?: boolean;
  /** Pause the animation when the user clicks-and-holds (or touches). Default false. */
  pauseOnHold?: boolean;
  /** Element direction. Set to "rtl" for Persian/Arabic UIs. */
  dir?: 'ltr' | 'rtl';
  /** Extra className for the outer wrapper. */
  className?: string;
}

function InfiniteTickerFn({
  children,
  duration = 40,
  pauseOnHover = true,
  pauseOnHold = false,
  dir = 'ltr',
  className = '',
}: InfiniteTickerProps) {
  const isRTL = dir === 'rtl';
  const { containerProps } = useTickerPause({ pauseOnHover, pauseOnHold });

  return (
    <div
      {...containerProps}
      data-marquee-track="true"
      className={`infinite-ticker relative w-full overflow-hidden ${
        pauseOnHover ? 'hover:cursor-default' : ''
      } ${className}`}
      style={{ '--ticker-duration': `${duration}s`, direction: dir } as React.CSSProperties}
    >
      {/* Scrolling track. `min-w-[200%]` guarantees the track is wider than
          the viewport even when there are very few children, so the loop
          is always seamless. */}
      <div
        className={`ticker-track flex w-max min-w-[200%] ${isRTL ? 'ticker-rtl' : 'ticker-ltr'}`}
      >
        <div className="ticker-group flex shrink-0 items-stretch">{children}</div>
        <div className="ticker-group flex shrink-0 items-stretch" aria-hidden>
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker-scroll-ltr {
          from {
            transform: translate3d(0%, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @keyframes ticker-scroll-rtl {
          from {
            transform: translate3d(0%, 0, 0);
          }
          to {
            transform: translate3d(50%, 0, 0);
          }
        }

        .ticker-ltr {
          animation: ticker-scroll-ltr var(--ticker-duration) linear infinite;
          will-change: transform;
        }

        .ticker-rtl {
          animation: ticker-scroll-rtl var(--ticker-duration) linear infinite;
          will-change: transform;
        }

        /* CSS fast-path: در hover هر wrapper با کلاس marquee-pause، track رو متوقف کن.
           این اولین خط دفاعیه و در اکثر مواقع کافیه. */
        :global(.marquee-pause:hover) .ticker-ltr,
        :global(.marquee-pause:hover) .ticker-rtl,
        :global(.marquee-pause:hover) .marquee-track {
          animation-play-state: paused;
        }

        /* Fallback: اگه wrapper کلاس marquee-pause نداشت ولی data-paused=true داشت
           (از JS)، track رو متوقف کن. */
        [data-paused='true'] .ticker-ltr,
        [data-paused='true'] .ticker-rtl,
        [data-paused='true'] .marquee-track {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .ticker-ltr,
          .ticker-rtl {
            animation-play-state: paused;
          }
        }
      `}</style>
    </div>
  );
}

// هر دو export تا API قدیم (default) و جدید (named) در دسترس باشن
export default InfiniteTickerFn;
export { InfiniteTickerFn as InfiniteTicker };
