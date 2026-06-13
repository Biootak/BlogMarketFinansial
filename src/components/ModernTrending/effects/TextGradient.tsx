'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TextGradientProps {
  children: ReactNode;
  className?: string;
  /** رنگ‌های گرادینت */
  from?: string;
  via?: string;
  to?: string;
  /** آیا انیمیشن gradient داشته باشه */
  animate?: boolean;
}

/**
 * TextGradient — متن با گرادینت متحرک
 *
 * - linear.app-style gradient text
 * - animation با background-position (متحرک)
 */
export function TextGradient({
  children,
  className,
  from = 'from-primary-500',
  via = 'via-fuchsia-500',
  to = 'to-violet-500',
  animate = true,
}: TextGradientProps) {
  return (
    <span
      className={cn(
        'inline-block bg-gradient-to-r bg-clip-text text-transparent',
        from,
        via,
        to,
        animate && 'bg-[length:200%_auto] animate-gradient',
        className,
      )}
    >
      {children}
    </span>
  );
}
