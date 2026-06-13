'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ShimmerProps {
  className?: string;
  /** زاویه شیمر (پیش‌فرض ۱۱۰ درجه، مورب) */
  angle?: number;
  /** رنگ پایه (با opacity 0 کار می‌کنه) */
  baseColor?: string;
  /** رنگ نور */
  highlightColor?: string;
}

/**
 * Shimmer — خط نوری که روی کارت می‌لغزه (حس "premium")
 *
 * - استفاده از gradient conic با mask
 * - حرکت بی‌نهایت و نرم
 * - قابل استفاده به عنوان overlay روی هر المان
 */
export function Shimmer({
  className,
  angle = 110,
  baseColor = 'transparent',
  highlightColor = 'rgba(255,255,255,0.18)',
}: ShimmerProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: [0.22, 1, 0.36, 1],
          repeatDelay: 1,
        }}
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(${angle}deg, ${baseColor} 0%, ${baseColor} 35%, ${highlightColor} 50%, ${baseColor} 65%, ${baseColor} 100%)`,
          width: '60%',
          filter: 'blur(8px)',
        }}
      />
    </div>
  );
}
