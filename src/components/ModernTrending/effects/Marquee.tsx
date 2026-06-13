'use client';

import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import { type ReactNode, useRef } from 'react';

export interface MarqueeProps {
  children: ReactNode;
  /** سرعت حرکت (پیکسل بر ثانیه). منفی برای RTL. */
  speed?: number;
  /** تکرار محتوا */
  repeat?: number;
  /** آیا برعکس شود (وقتی ماوس روش نیست) */
  pauseOnHover?: boolean;
  className?: string;
}

/**
 * Marquee — اسکرول بی‌نهایت نرم با framer-motion
 *
 * - استفاده از `useAnimationFrame` برای کنترل ۶۰fps
 * - با `pauseOnHover` متوقف می‌شه
 * - RTL-friendly (با تنظیم speed منفی)
 * - کاملاً GPU-accelerated (فقط transform)
 */
export function Marquee({
  children,
  speed = -40,
  repeat = 3,
  pauseOnHover = true,
  className = '',
}: MarqueeProps) {
  const baseX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);

  useAnimationFrame((_, delta) => {
    if (isPaused.current) return;
    // 60px/s * delta(ms) / 1000 = px
    const moveBy = (speed * delta) / 1000;
    baseX.set(baseX.get() + moveBy);

    // وقتی به اندازه نیمه محتوا رسیدیم، برگرد (برای loop بی‌نهایت)
    if (containerRef.current) {
      const width = containerRef.current.scrollWidth / 2;
      if (width > 0) {
        if (baseX.get() <= -width) baseX.set(0);
        if (baseX.get() >= 0) baseX.set(-width);
      }
    }
  });

  return (
    <div
      className={`overflow-hidden ${className}`}
      onMouseEnter={() => pauseOnHover && (isPaused.current = true)}
      onMouseLeave={() => pauseOnHover && (isPaused.current = false)}
    >
      <motion.div
        ref={containerRef}
        style={{ x: baseX }}
        className="flex w-max items-center gap-6 will-change-transform"
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 shrink-0">
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
