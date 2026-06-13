'use client';

/**
 * Marquee — اسکرول بی‌نهایت (refined, CSS-driven)
 *
 * اصلاحات:
 * - استفاده از CSS animation (نه JS RAF) — performance بهتر
 * - GPU acceleration (transform)
 * - Pause on hover از CSS
 * - کم‌حجم‌تر و سریع‌تر
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
  // سرعت بر اساس pixels/second — برای loop روان حدود ۲۰-۶۰ پیکسل بر ثانیه
  const duration = useMemo(() => Math.max(8, Math.abs(1500 / speed)), [speed]);

  return (
    <div
      className={cn('overflow-hidden', className)}
      style={{ contain: 'layout paint' }}
    >
      <div
        className={cn(
          'marquee-track flex w-max items-center gap-3',
          pauseOnHover && 'group/ticker',
        )}
        style={{
          animation: `marquee-${speed > 0 ? 'rtl' : 'ltr'} ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <div key={i} className="flex shrink-0 items-center gap-3">
            {children}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee-rtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(33.33%); }
        }
        @keyframes marquee-ltr {
          0% { transform: translateX(-33.33%); }
          100% { transform: translateX(0); }
        }
        .group\\/ticker:hover :global(.marquee-track) {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
