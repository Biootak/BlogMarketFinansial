'use client';

/**
 * AnimatedCounter — شمارنده‌ی متحرک (rAF-driven, no animation library)
 *
 * رفتار قبلی: framer-motion `animate(motionValue, target, config)`.
 * رفتار جدید: rAF interpolation با همون easing curve.
 * استفاده از useState برای re-render هر frame (Integers only، هزینه ناچیز).
 */

import { useEffect, useRef, useState } from 'react';

export interface AnimatedCounterProps {
  /** مقدار نهایی */
  value: number;
  /** مدت زمان انیمیشن (ms) */
  duration?: number;
  /** کلاس‌های اضافی */
  className?: string;
  /** آیا وقتی وارد view شد شروع بشه؟ */
  triggerOnView?: boolean;
  /** آیا با هر بار hover دوباره اجرا بشه؟ */
  replayOnHover?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 1.4,
  className,
  triggerOnView = true,
  replayOnHover = false,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState('۰');
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (!replayOnHover) observer.disconnect();
          } else if (replayOnHover) {
            setInView(false);
          }
        }
      },
      { rootMargin: '0px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [replayOnHover]);

  useEffect(() => {
    if (triggerOnView && !inView) return;
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(Math.round(value).toLocaleString('fa-IR'));
      return;
    }
    const start = performance.now();
    const from = 0;
    const to = value;
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      // easeOutExpo approximation
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = from + (to - from) * eased;
      setDisplay(Math.round(current).toLocaleString('fa-IR'));
      if (t < 1) requestAnimationFrame(tick);
      else setDisplay(Math.round(to).toLocaleString('fa-IR'));
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value, duration, inView, triggerOnView]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
