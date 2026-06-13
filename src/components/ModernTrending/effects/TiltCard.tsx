'use client';

/**
 * TiltCard — کارت سه‌بعدی با tilt (refined)
 *
 * اصلاحات:
 * - حذف glare داخلی (overkill)
 * - spring نرم‌تر
 * - perspective بالاتر (1200)
 * - transform-only
 */

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { type ReactNode, useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  perspective?: number;
}

export function TiltCard({
  children,
  className,
  intensity = 6,
  perspective = 1200,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 280, damping: 24 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 280, damping: 24 });
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    setEnabled(!isCoarse);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-yPct * intensity);
    rotateY.set(xPct * intensity);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: enabled ? rotateX : 0,
        rotateY: enabled ? rotateY : 0,
        transformPerspective: perspective,
        transformStyle: 'preserve-3d',
      }}
      className={cn('relative', className)}
    >
      {children}
    </motion.div>
  );
}
