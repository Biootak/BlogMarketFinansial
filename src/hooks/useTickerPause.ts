'use client';

/**
 * useTickerPause — یه هوک مشترک برای pause/resume انیمیشن track ها
 * ----------------------------------------------------------------------------
 * همه‌ی نوارهای marquee/ticker (InfiniteTicker, Marquee) از همین hook
 * استفاده می‌کنن تا:
 *  - رفتار pause-on-hover و pause-on-hold یکسان باشه
 *  - CSS descendant selector کافی نباشه، JS هم مستقیماً animationPlayState
 *    روی track و descendants ست می‌کنه
 *  - وقتی children عوض می‌شن (re-render)، state با track جدید sync بشه
 *
 * استفاده:
 *   const { containerProps, isPaused } = useTickerPause({ pauseOnHover, pauseOnHold });
 *   return <div {...containerProps}>{children}</div>
 */
import { useCallback, useEffect, useRef } from 'react';

export interface UseTickerPauseOptions {
  /** pause وقتی mouse وارد wrapper می‌شه */
  pauseOnHover?: boolean;
  /** pause وقتی mouse down می‌شه (click-and-hold) */
  pauseOnHold?: boolean;
}

export interface UseTickerPauseResult {
  containerProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onMouseDown: () => void;
    onMouseUp: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
    'data-paused'?: 'true' | 'false';
  };
  /** وضعیت فعلی pause (برای reactive UI اگه لازم شد) */
  isPaused: boolean;
}

/**
 * Selectorهایی که هر slider/marquee ممکنه استفاده کنه. هر کدوم match بشه
 * animationPlayState روش set می‌شه.
 */
const TRACK_SELECTORS = [
  '.marquee-track',
  '.ticker-track',
  '.ticker-ltr',
  '.ticker-rtl',
  '[data-marquee-track]',
  '.slick-track',
] as const;

export function useTickerPause({
  pauseOnHover = true,
  pauseOnHold = false,
}: UseTickerPauseOptions = {}): UseTickerPauseResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isHoveredRef = useRef(false);
  const isHoldingRef = useRef(false);
  // برای اینکه بتونیم isPaused رو reactive به parent تحویل بدیم
  // (مثلاً برای نشون دادن آیکون play/pause)
  const isPausedRef = useRef(false);

  const setPaused = useCallback((paused: boolean) => {
    isPausedRef.current = paused;
    const root = containerRef.current;
    if (!root) return;
    for (const sel of TRACK_SELECTORS) {
      const elements = root.querySelectorAll<HTMLElement>(sel);
      elements.forEach((el) => {
        el.style.animationPlayState = paused ? 'paused' : 'running';
      });
    }
    // Fallback: هر descendant با animation غیر-none
    const all = root.querySelectorAll<HTMLElement>('*');
    all.forEach((el) => {
      if (TRACK_SELECTORS.some((s) => el.matches(s))) return;
      const cs = window.getComputedStyle(el);
      if (cs.animationName && cs.animationName !== 'none') {
        el.style.animationPlayState = paused ? 'paused' : 'running';
      }
    });
  }, []);

  const updatePause = useCallback(() => {
    setPaused(isHoveredRef.current || isHoldingRef.current);
  }, [setPaused]);

  const onMouseEnter = useCallback(() => {
    if (!pauseOnHover) return;
    isHoveredRef.current = true;
    updatePause();
  }, [pauseOnHover, updatePause]);

  const onMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    updatePause();
  }, [updatePause]);

  const onMouseDown = useCallback(() => {
    if (!pauseOnHold) return;
    isHoldingRef.current = true;
    updatePause();
  }, [pauseOnHold, updatePause]);

  const onMouseUp = useCallback(() => {
    isHoldingRef.current = false;
    updatePause();
  }, [updatePause]);

  // هر بار children/re-render، اگه hovered هستیم دوباره pause کن
  useEffect(() => {
    updatePause();
  });

  return {
    containerProps: {
      ref: containerRef,
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
      onMouseUp,
      onTouchStart: onMouseDown,
      onTouchEnd: onMouseUp,
      onTouchCancel: onMouseUp,
      'data-paused': isPausedRef.current ? 'true' : 'false',
    },
    isPaused: isPausedRef.current,
  };
}
