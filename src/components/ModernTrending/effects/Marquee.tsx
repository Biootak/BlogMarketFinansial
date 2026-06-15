'use client';

/**
 * Marquee — اسکرول بی‌نهایت (CSS-driven)
 *
 * استراتژی:
 *  - محتوا `repeat` بار تکرار می‌شه (پیش‌فرض 3)
 *  - track با `direction: ltr` (حتی در RTL) — تا ترتیب المان‌ها LTR باشه
 *  - محتوای درون (children) خودش RTL هست
 *  - animation از 0% شروع و به -translateStep% می‌ره → loop بی‌نهایت روان
 *  - `useTickerPause` رفتار pause-on-hover و pause-on-hold رو تضمین می‌کنه
 *    (هم با CSS `data-pause-on-hover` و هم با JS `animationPlayState`)
 */

import { type ReactNode, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTickerPause } from '@/hooks/useTickerPause';

export interface MarqueeProps {
  children: ReactNode;
  speed?: number;
  repeat?: number;
  pauseOnHover?: boolean;
  /** وقتی کاربر کلیک کنه و نگه داره (یا تاچ کنه) اسکرول متوقف میشه */
  pauseOnHold?: boolean;
  className?: string;
}

export function Marquee({
  children,
  speed = -50,
  repeat = 3,
  pauseOnHover = true,
  pauseOnHold = false,
  className = '',
}: MarqueeProps) {
  // سرعت: هر چه بیشتر، سریع‌تر
  const duration = useMemo(
    () => Math.max(10, Math.abs(1200 / speed)),
    [speed],
  );
  // translateX اندازه: 100% / repeat (تا loop بی‌نهایت روان)
  const translateStep = 100 / repeat;

  // رفتار pause یکپارچه با TickerShell و InfiniteTicker
  const { containerProps } = useTickerPause({ pauseOnHover, pauseOnHold });

  return (
    <div
      {...containerProps}
      data-marquee-track="true"
      className={cn('overflow-hidden contain-paint', className)}
      // track رو LTR کن تا ترتیب المان‌ها حفظ بشه
      style={{ direction: 'ltr' }}
    >
      <div
        className="marquee-track flex w-max items-center gap-3"
        style={{
          animation: `marquee-scroll ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-3"
            // هر تکرار RTL باشه تا متن فارسی درست نمایش داده بشه
            style={{ direction: 'rtl' }}
          >
            {children}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-${translateStep}%);
          }
        }
      `}</style>
    </div>
  );
}
