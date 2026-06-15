'use client';

import { motion } from '@/lib/motion-shim';
import { Flame } from 'lucide-react';

export interface TrendingBadgeProps {
  /** رتبه (مثلا #1، #2، #3) */
  rank?: number;
  /** رنگ accent (کلاس tailwind) */
  accentClass?: string;
  /** سایز */
  size?: 'sm' | 'md';
}

/**
 * Badge "ترند" با انیمیشن pulse و شعله
 * - برای ۳ دسته برتر استفاده می‌شه
 * - دارای pulse animation مداوم (حس زنده)
 * - با stagger از Framer Motion هماهنگه
 */
export function TrendingBadge({
  rank,
  accentClass = 'bg-gradient-to-br from-rose-500 to-orange-500',
  size = 'sm',
}: TrendingBadgeProps) {
  const sizeClasses =
    size === 'sm'
      ? 'h-6 px-2.5 text-[10px] gap-1'
      : 'h-7 px-3 text-xs gap-1.5';

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <motion.div
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring' as const,
        stiffness: 260,
        damping: 18,
        delay: 0.1,
      }}
      className={`relative inline-flex items-center ${sizeClasses} rounded-full ${accentClass} text-white font-bold uppercase tracking-wider shadow-lg`}
    >
      {/* لایه pulse پشت badge */}
      <span className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-30" />
      <Flame className={`${iconSize} relative z-10`} />
      <span className="relative z-10">ترند {rank !== undefined ? `#${rank}` : ''}</span>
    </motion.div>
  );
}
