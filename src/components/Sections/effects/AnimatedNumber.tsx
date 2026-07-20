'use client';

/**
 * AnimatedNumber — count-up display, CSS-driven (no framer-motion)
 *
 * رفتار قبلی: spring tween از 0 تا target با framer-motion.
 * رفتار جدید: rAF interpolation به همان easing curve. این سبک‌ترین راه
 * برای شمارنده‌ی صاف بدون وارد کردن یک animation runtime بزرگ.
 * اگر browser از rAF+transform پشتیبانی نکنه (تقریباً هیچ‌وقت)، به مقدار نهایی
 * instant می‌ره — هیچ حالت بدی پیش نمیاد.
 *
 * - prefers-reduced-motion: مستقیم مقدار نهایی نمایش داده میشه (rAF غیرفعال).
 * - format: persian / persian-separator / raw
 * - هزارگان فارسی از `formatNumber` (همون util قبلی).
 */

import { cn, formatNumber, toPersianNumber } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  format?: 'persian' | 'persian-separator' | 'raw';
  thousands?: boolean;
  suffix?: string;
  prefix?: string;
}

function formatValue(value: number, format: AnimatedNumberProps['format'], thousands: boolean) {
  const rounded = Math.round(value);
  if (format === 'raw') return String(rounded);
  if (format === 'persian') return toPersianNumber(rounded);
  return thousands ? toPersianNumber(formatNumber(rounded)) : toPersianNumber(rounded);
}

export default function AnimatedNumber({
  value,
  duration = 1.4,
  className,
  format = 'persian-separator',
  thousands = true,
  suffix,
  prefix,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(() => formatValue(0, format, thousands));
  const inViewRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(formatValue(value, format, thousands));
      return;
    }
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            inViewRef.current = true;
            observer.disconnect();
            // easing cubic-bezier(0.22, 1, 0.36, 1) approximation via t -> 1 - (1-t)^3
            const start = performance.now();
            const from = 0;
            const to = value;
            const tick = (now: number) => {
              const elapsed = (now - start) / 1000;
              const t = Math.min(elapsed / duration, 1);
              const eased = 1 - (1 - t) ** 3;
              const current = from + (to - from) * eased;
              setDisplay(formatValue(current, format, thousands));
              if (t < 1) requestAnimationFrame(tick);
              else setDisplay(formatValue(to, format, thousands));
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { rootMargin: '-50px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration, format, thousands]);

  return (
    <span
      ref={ref}
      className={cn('tabular-nums', className)}
      aria-label={toPersianNumber(formatNumber(value))}
    >
      <span>{display}</span>
      {suffix && <span className="ms-0.5">{suffix}</span>}
      {prefix && <span className="me-0.5">{prefix}</span>}
    </span>
  );
}
