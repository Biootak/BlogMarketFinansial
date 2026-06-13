'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface LiveIndicatorProps {
  className?: string;
  /** متن کنار نقطه */
  label?: string;
  /** سایز */
  size?: 'sm' | 'md' | 'lg';
  /** رنگ نقطه */
  color?: 'rose' | 'emerald' | 'amber' | 'blue';
}

/**
 * LiveIndicator — نشانگر "زنده" با pulse animation
 *
 * - یه نقطه کوچک با pulse rings
 * - مخصوص نشون دادن "real-time" یا "live" بودن دیتا
 */
export function LiveIndicator({
  className,
  label = 'LIVE',
  size = 'sm',
  color = 'rose',
}: LiveIndicatorProps) {
  const colorMap = {
    rose: 'bg-rose-500 shadow-rose-500/50',
    emerald: 'bg-emerald-500 shadow-emerald-500/50',
    amber: 'bg-amber-500 shadow-amber-500/50',
    blue: 'bg-blue-500 shadow-blue-500/50',
  };

  const sizeMap = {
    sm: { dot: 'h-1.5 w-1.5', text: 'text-[10px]', gap: 'gap-1.5' },
    md: { dot: 'h-2 w-2', text: 'text-xs', gap: 'gap-2' },
    lg: { dot: 'h-2.5 w-2.5', text: 'text-sm', gap: 'gap-2.5' },
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5',
        sizeMap[size].gap,
        className,
      )}
    >
      <span className="relative inline-flex">
        <motion.span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            colorMap[color],
          )}
          animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
        <span
          className={cn(
            'relative inline-flex rounded-full shadow-lg',
            colorMap[color],
            sizeMap[size].dot,
          )}
        />
      </span>
      {label && (
        <span
          className={cn(
            'font-bold tracking-wider text-rose-600 dark:text-rose-400',
            sizeMap[size].text,
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
