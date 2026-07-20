'use client';

/**
 * Ticker — unified marquee/ticker component (2026 best-practice)
 * ----------------------------------------------------------------------------
 * Replaces the previous `InfiniteTicker` and `Marquee` components.
 *
 * Best practices implemented:
 *  - Pure CSS animation (no JS interval/requestAnimationFrame).
 *  - GPU-accelerated `translate3d` with `will-change: transform`.
 *  - `contain-paint` to isolate the animated layer from the rest of the page.
 *  - Pause on hover / hold via CSS data attributes (zero runtime cost).
 *  - Respects `prefers-reduced-motion`.
 *  - Configurable direction (ltr/rtl), speed/duration, and repeat count.
 *
 * The visible behavior is identical to the old components; only the API is
 * unified so every ticker on the site behaves consistently.
 */

import { useTickerPause } from '@/hooks/useTickerPause';
import { cn } from '@/lib/utils';
import { type ReactNode, memo, useMemo } from 'react';

export interface TickerProps {
  children: ReactNode;
  /** Scroll direction. `rtl` moves content toward the right (natural for Persian). */
  direction?: 'ltr' | 'rtl';
  /** Seconds for one full loop. Lower = faster. Takes precedence over `speed`. */
  duration?: number;
  /** Approximate speed in px/sec. Used only when `duration` is not provided. */
  speed?: number;
  /** How many duplicate groups are rendered for a seamless loop. Default 2. */
  repeat?: number;
  /** Pause animation while the mouse is over the ticker. */
  pauseOnHover?: boolean;
  /** Pause animation while the user clicks/touch-holds the ticker. */
  pauseOnHold?: boolean;
  /** CSS gap between duplicated groups. */
  gap?: string;
  className?: string;
  'aria-label'?: string;
}

function TickerFn({
  children,
  direction = 'rtl',
  duration,
  speed,
  repeat = 2,
  pauseOnHover = true,
  pauseOnHold = false,
  gap = '0.75rem',
  className,
  'aria-label': ariaLabel,
}: TickerProps) {
  const isRTL = direction === 'rtl';
  const { containerProps } = useTickerPause({ pauseOnHover, pauseOnHold });

  const computedDuration = useMemo(() => {
    if (typeof duration === 'number' && duration > 0) return duration;
    if (typeof speed === 'number' && speed !== 0) {
      // Reference width of 1200px gives a stable default for typical content.
      return Math.max(10, Math.abs(1200 / speed));
    }
    return 40;
  }, [duration, speed]);

  const translateStep = 100 / repeat;

  return (
    <div
      {...containerProps}
      data-ticker="true"
      aria-label={ariaLabel}
      className={cn('relative w-full overflow-hidden contain-paint', className)}
      style={{ '--ticker-duration': `${computedDuration}s`, direction } as React.CSSProperties}
    >
      <div
        className={cn('ticker-track flex w-max', isRTL ? 'ticker-rtl' : 'ticker-ltr')}
        style={{ gap, willChange: 'transform' }}
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <div
            key={i}
            className="flex shrink-0"
            style={{ direction: 'rtl' }}
            aria-hidden={i > 0 ? true : undefined}
          >
            {children}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker-scroll-ltr {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-${translateStep}%, 0, 0);
          }
        }

        @keyframes ticker-scroll-rtl {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(${translateStep}%, 0, 0);
          }
        }

        .ticker-ltr {
          animation: ticker-scroll-ltr var(--ticker-duration) linear infinite;
        }
        .ticker-rtl {
          animation: ticker-scroll-rtl var(--ticker-duration) linear infinite;
        }

        [data-pause-on-hover='true']:hover .ticker-ltr,
        [data-pause-on-hover='true']:hover .ticker-rtl,
        :global(.marquee-pause:hover) .ticker-ltr,
        :global(.marquee-pause:hover) .ticker-rtl {
          animation-play-state: paused;
        }

        [data-holding='true'] .ticker-ltr,
        [data-holding='true'] .ticker-rtl {
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

export default memo(TickerFn);
