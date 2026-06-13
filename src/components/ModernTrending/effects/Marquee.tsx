'use client';

/**
 * Marquee — اسکرول بی‌نهایت (CSS-driven)
 *
 * استراتژی:
 *  - محتوا ۳ بار تکرار می‌شه
 *  - track با `direction: ltr` (حتی در RTL) — تا ترتیب المان‌ها LTR باشه
 *  - محتوای درون (children) خودش RTL هست
 *  - animation از 0% شروع و به -33.33% می‌ره → loop بی‌نهایت روان
 *  - وقتی به -33.33% رسید، یعنی دقیقاً یک تکرار کامل شده
 *  - چون کل track به سمت چپ می‌ره، متن RTL به نظر "از راست به چپ" می‌آد (طبیعی)
 */

import { type ReactNode, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface MarqueeProps {
  children: ReactNode;
  speed?: number;
  repeat?: number;
  pauseOnHover?: boolean;
  className?: string;
}

export function Marquee({
  children,
  speed = -50,
  repeat = 3,
  pauseOnHover = true,
  className = '',
}: MarqueeProps) {
  // سرعت: هر چه بیشتر، سریع‌تر
  const duration = useMemo(
    () => Math.max(10, Math.abs(1200 / speed)),
    [speed],
  );
  // translateX اندازه: 100% / repeat (تا loop بی‌نهایت روان)
  const translateStep = 100 / repeat;

  return (
    <div
      className={cn('overflow-hidden contain-paint', className)}
      // track رو LTR کن تا ترتیب المان‌ها حفظ بشه
      style={{ direction: 'ltr' }}
    >
      <div
        className={cn(
          'marquee-track flex w-max items-center gap-3',
          pauseOnHover && 'group/ticker',
        )}
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
        .group\\/ticker:hover :global(.marquee-track) {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
