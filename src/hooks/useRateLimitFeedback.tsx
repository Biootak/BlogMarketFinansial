'use client';

/**
 * useRateLimitFeedback — hook برای نمایش feedback هنگام rate limit
 *
 * وقتی یک server action یا API با rate-limit مواجه می‌شود،
 * این hook زمان باقی‌مانده را شمارش می‌کند و پیام مناسب نمایش می‌دهد.
 *
 * استفاده:
 *   const { isRateLimited, rateLimitMessage, handleRateLimit } = useRateLimitFeedback();
 *   // وقتی error.code === 'RATE_LIMIT':
 *   handleRateLimit(60); // ثانیه‌های retry-after
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const _faNum = new Intl.NumberFormat('fa-IR');

export function useRateLimitFeedback() {
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleRateLimit = useCallback(
    (retryAfter?: number) => {
      clearTimer();
      const seconds = retryAfter ?? 60;
      setRetryAfterSeconds(seconds);
      timerRef.current = setInterval(() => {
        setRetryAfterSeconds((s) => {
          if (s <= 1) {
            clearTimer();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    },
    [clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const isRateLimited = retryAfterSeconds > 0;

  const rateLimitMessage = isRateLimited
    ? `درخواست‌های زیادی ارسال شده — ${_faNum.format(retryAfterSeconds)} ثانیه دیگر تلاش کنید`
    : null;

  return { isRateLimited, retryAfterSeconds, rateLimitMessage, handleRateLimit };
}

/**
 * RateLimitBanner — نمایش پیام rate-limit با countdown
 */
export function RateLimitBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '8px',
        background: 'color-mix(in oklch, var(--ds-warning, #f59e0b) 10%, transparent)',
        border: '1px solid color-mix(in oklch, var(--ds-warning, #f59e0b) 22%, transparent)',
        color: 'var(--ds-warning, #f59e0b)',
        fontSize: '13px',
        fontWeight: 500,
        lineHeight: 1.4,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle cx={12} cy={12} r={10} />
        <line x1={12} y1={8} x2={12} y2={12} />
        <line x1={12} y1={16} x2={12.01} y2={16} />
      </svg>
      {message}
    </div>
  );
}
