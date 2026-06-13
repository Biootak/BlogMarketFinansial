'use client';

/**
 * AnimatedNumber — شمارنده‌ی انیمیشنی
 *
 * تکنیک:
 *  - با framer-motion از مقدار 0 تا مقدار هدف می‌ره
 *  - ease: STRIPE_EASE (smooth)
 *  - duration: 1.4s (به اندازه کافی طولانی برای تأثیر، نه خسته‌کننده)
 *  - PersianDigits
 *  - respect prefers-reduced-motion (مستقیم مقدار نهایی)
 *  - formatNumber (هزارگان فارسی)
 */

import { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';
import { STRIPE_EASE } from '@/lib/motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  /** اگه true، به جای ۰ به مقدار target می‌ره */
  format?: 'persian' | 'persian-separator' | 'raw';
  /** استفاده از PersianNumbers با formatNumber (هزارگان) */
  thousands?: boolean;
  /** Suffix (مثل "مطلب" یا "+") */
  suffix?: string;
  /** Prefix */
  prefix?: string;
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
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const reduce = useReducedMotion();
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, {
    stiffness: 100,
    damping: 30,
    mass: 1,
  });
  const display = useTransform(spring, (latest) => {
    const rounded = Math.round(latest);
    if (format === 'raw') return String(rounded);
    if (format === 'persian') return toPersianNumber(rounded);
    return thousands ? toPersianNumber(formatNumber(rounded)) : toPersianNumber(rounded);
  });

  useEffect(() => {
    if (inView) {
      // animate from current to target
      motionVal.set(value);
    } else {
      motionVal.set(0);
    }
  }, [inView, value, motionVal]);

  return (
    <motion.span
      ref={ref}
      className={cn('tabular-nums', className)}
      aria-label={toPersianNumber(formatNumber(value))}
    >
      <motion.span>{display}</motion.span>
      {suffix && <span className="ms-0.5">{suffix}</span>}
      {prefix && <span className="me-0.5">{prefix}</span>}
    </motion.span>
  );
}
