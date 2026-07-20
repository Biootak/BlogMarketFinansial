'use client';

/**
 * MorphingNumber
 * ----------------------------------------------------------------------------
 * نمایش عدد به صورت morph (تغییر تدریجی رقم به رقم) به جای تغییر ناگهانی.
 * مثال: 712400 → 712850 (اعداد smooth بالا/پایین می‌روند)
 *
 * استفاده:
 *   <MorphingNumber value={rate.irrPrice} duration={1200} />
 *
 * الگوریتم: rAF-driven interpolation با easeOutCubic
 * RTL-friendly: اعداد فارسی با toLocaleString('fa-IR')
 * ----------------------------------------------------------------------------
 */

import { memo, useEffect, useRef, useState } from 'react';

interface MorphingNumberProps {
  value: number;
  /** مدت زمان morph به میلی‌ثانیه. پیش‌فرض ۱۲۰۰ms */
  duration?: number;
  /** فرمت اعداد فارسی. پیش‌فرض true */
  persian?: boolean;
  /** تعداد رقم اعشار */
  decimals?: number;
  /** کلاس‌های اضافی */
  className?: string;
  /** Prefix اختیاری */
  prefix?: string;
  /** Suffix اختیاری (مثلاً "تومان") */
  suffix?: string;
  /** اگر true، تغییرات صعودی سبز و نزولی قرمز نشون داده می‌شه */
  showTrend?: boolean;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function formatPersian(n: number, decimals: number): string {
  return n.toLocaleString('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatEnglish(n: number, decimals: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default memo(function MorphingNumber({
  value,
  duration = 1200,
  persian = true,
  decimals = 0,
  className = '',
  prefix = '',
  suffix = '',
  showTrend = false,
}: MorphingNumberProps) {
  const [display, setDisplay] = useState(value);
  const [trend, setTrend] = useState<'up' | 'down' | 'flat'>('flat');
  const fromRef = useRef(value);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef(value);

  useEffect(() => {
    // اگه مقدار تغییر نکرده، کاری نکن
    if (value === targetRef.current) return;

    targetRef.current = value;
    fromRef.current = display;
    startTimeRef.current = null;

    // تشخیص trend
    if (showTrend) {
      if (value > display) setTrend('up');
      else if (value < display) setTrend('down');
      else setTrend('flat');
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      const current = fromRef.current + (targetRef.current - fromRef.current) * eased;
      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted = persian ? formatPersian(display, decimals) : formatEnglish(display, decimals);
  const trendClass =
    trend === 'up' ? 'text-emerald-300' : trend === 'down' ? 'text-rose-300' : 'text-white';

  return (
    <span className={`tabular-nums ${trendClass} ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
});
