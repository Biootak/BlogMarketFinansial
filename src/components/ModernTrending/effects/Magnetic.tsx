'use client';

/**
 * Magnetic — جذب ماوس (refined)
 *
 * - Spring نرم‌تر
 * - transform-only (GPU)
 * - disable در موبایل و reduced-motion
 */

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { type ReactNode, useRef, type CSSProperties, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface MagneticProps {
  children: ReactNode;
  strength?: number;
  className?: string;
  style?: CSSProperties;
}

export function Magnetic({
  children,
  strength = 0.2,
  className,
  style,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // در موبایل و reduced-motion غیرفعال
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!isCoarse && !reduce);
  }, []);

  const xSpring = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const ySpring = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
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
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
