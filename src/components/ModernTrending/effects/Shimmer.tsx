'use client';

/**
 * Shimmer — خط نور متحرک (refined)
 *
 * - Skew به جای straight (حس طبیعی‌تر)
 * - یک خط، نه halo
 * - Performance: فقط transform
 */

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ShimmerProps {
  className?: string;
  /** رنگ highlight */
  color?: 'light' | 'dark';
}

export function Shimmer({ className, color = 'dark' }: ShimmerProps) {
  const reduce = useReducedMotion();

  const highlight =
    color === 'light'
      ? 'rgba(255,255,255,0.20)'
      : 'rgba(255,255,255,0.14)';

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden contain-strict', className)}
      aria-hidden
    >
      {!reduce && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: [0.22, 1, 0.36, 1],
            repeatDelay: 1.4,
          }}
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(110deg, transparent 30%, ${highlight} 50%, transparent 70%)`,
            width: '50%',
            transform: 'skewX(-12deg)',
            willChange: 'transform',
          }}
        />
      )}
    </div>
  );
}
