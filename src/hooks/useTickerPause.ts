'use client';

/**
 * useTickerPause — هوک مشترک pause/resume برای نوارهای marquee/ticker
 * ----------------------------------------------------------------------------
 * pause کاملاً CSS-driven است (هیچ DOM scan یا getComputedStyle در کار نیست):
 *
 *  - hover → اتربیوت ثابت `data-pause-on-hover="true"` روی container ست می‌شه و
 *    قانون `[data-pause-on-hover='true']:hover .ticker-ltr/.ticker-rtl/...` در
 *    globals.css انیمیشن track را متوقف می‌کند. هزینه‌ی runtime صفر.
 *  - hold (click-and-hold / touch) → فقط یک اتربیوت `data-holding` روی همان
 *    container toggle می‌شه (O(1))، و قانون `[data-holding='true'] .ticker-…`
 *    در globals.css بقیه‌ی کار را می‌کند.
 *
 * چرا این بازنویسی؟ نسخه‌ی قبلی در یک useEffect بدون dependency array (هر
 * render) کل زیردرخت را با `querySelectorAll('*')` + `getComputedStyle`
 * پیمایش می‌کرد و روی هر گره یک reflow همگام تحمیل می‌کرد. با چند instance
 * تیکر در صفحه‌ی اصلی این به layout thrashing مداوم روی main thread تبدیل
 * می‌شد و INP را خراب می‌کرد. مسیر CSS از قبل وجود داشت و این JS کاملاً
 * زائد بود.
 */
import { useCallback, useRef, useState } from 'react';

export interface UseTickerPauseOptions {
  /** pause وقتی mouse وارد wrapper می‌شه */
  pauseOnHover?: boolean;
  /** pause وقتی mouse down می‌شه (click-and-hold) */
  pauseOnHold?: boolean;
}

export interface UseTickerPauseResult {
  containerProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    onMouseDown?: () => void;
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    onTouchStart?: () => void;
    onTouchEnd?: () => void;
    onTouchCancel?: () => void;
    'data-pause-on-hover'?: 'true';
    'data-holding'?: 'true' | 'false';
  };
  /** وضعیت فعلی pause-on-hold (برای reactive UI اگه لازم شد) */
  isPaused: boolean;
}

export function useTickerPause({
  pauseOnHover = true,
  pauseOnHold = false,
}: UseTickerPauseOptions = {}): UseTickerPauseResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // hold یک رویداد نادر (فشردن کاربر) است؛ یک state ساده کافیه و روی
  // hot path انیمیشن قرار نمی‌گیره.
  const [holding, setHolding] = useState(false);

  const startHold = useCallback(() => {
    if (pauseOnHold) setHolding(true);
  }, [pauseOnHold]);
  const endHold = useCallback(() => {
    setHolding(false);
  }, []);

  const containerProps: UseTickerPauseResult['containerProps'] = {
    ref: containerRef,
    ...(pauseOnHover ? { 'data-pause-on-hover': 'true' as const } : {}),
    ...(pauseOnHold
      ? {
          onMouseDown: startHold,
          onMouseUp: endHold,
          onMouseLeave: endHold,
          onTouchStart: startHold,
          onTouchEnd: endHold,
          onTouchCancel: endHold,
          'data-holding': holding ? ('true' as const) : ('false' as const),
        }
      : {}),
  };

  return { containerProps, isPaused: holding };
}
