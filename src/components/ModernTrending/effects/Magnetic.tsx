'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { type ReactNode, useRef, type CSSProperties } from 'react';

export interface MagneticProps {
  children: ReactNode;
  /** شدت جذب (پیشنهاد: 0.1 - 0.4) */
  strength?: number;
  /** غیرفعال کردن در موبایل */
  disableOnMobile?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Magnetic — کامپوننتی که محتوای داخلش رو به سمت ماوس جذب می‌کنه.
 * تکنیک مدرن ۲۰۲۶ که در سایت‌هایی مثل Linear و Vercel استفاده می‌شه.
 *
 * - transform: translate با spring نرم
 * - فقط transform جابجا می‌شه (بدون layout shift)
 * - در موبایل به دلیل عدم وجود ماوس، غیرفعال می‌شه
 */
export function Magnetic({
  children,
  strength = 0.25,
  disableOnMobile = true,
  className,
  style,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // spring نرم
  const springConfig = { stiffness: 220, damping: 18, mass: 0.6 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableOnMobile && typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    x.set(relX * strength);
    y.set(relY * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: xSpring, y: ySpring, ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
