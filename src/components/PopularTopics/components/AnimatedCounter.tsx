'use client';

import { animate, useInView, useMotionValue } from 'framer-motion';
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

/**
 * شمارنده متحرک — وقتی وارد view می‌شه از صفر تا عدد مورد نظر
 * میره بالا. استفاده از useMotionValue + state محلی برای render
 * (MotionValue قابل render مستقیم به‌عنوان ReactNode نیست).
 */
export function AnimatedCounter({
  value,
  duration = 1.4,
  className,
  triggerOnView = true,
  replayOnHover = false,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState('۰');
  const isInView = useInView(ref, { once: !replayOnHover, margin: '0px' });

  useEffect(() => {
    // Subscribe به تغییرات motionValue و sync با state
    const unsubscribe = motionValue.on('change', (latest) => {
      setDisplay(Math.round(latest).toLocaleString('fa-IR'));
    });
    return () => unsubscribe();
  }, [motionValue]);

  useEffect(() => {
    if (triggerOnView && !isInView) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // expoOut — حس حرفه‌ای و نرم
    });
    return controls.stop;
  }, [motionValue, value, duration, isInView, triggerOnView]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
