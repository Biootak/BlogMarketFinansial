'use client';

import { motion } from '@/lib/motion-shim';
import { memo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SENTIMENT_CONFIG, type SentimentType } from './categoryTheme';

interface SentimentBadgeProps {
  sentiment: SentimentType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * SentimentBadge
 * ----------------------------------------------------------------------------
 * بج صعودی/نزولی/خنثی برای پست‌های مالی.
 * با glassmorphism ملایم و pulse subtle.
 * ----------------------------------------------------------------------------
 */
export default memo(function SentimentBadge({
  sentiment,
  size = 'md',
  showLabel = true,
  className = '',
}: SentimentBadgeProps) {
  const config = SENTIMENT_CONFIG[sentiment];
  const Icon =
    sentiment === 'bullish' ? TrendingUp : sentiment === 'bearish' ? TrendingDown : Minus;

  // متن خیلی کوچک در sm: بزرگ‌تر می‌شه تا به حداقل WCAG-AA (12px) برسه
  const sizeClasses = {
    sm: 'h-6 sm:h-7 px-2 text-[10px] sm:text-xs gap-1',
    md: 'h-8 px-3 text-xs gap-1.5',
    lg: 'h-10 px-4 text-sm gap-2',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center font-bold rounded-full ${config.gradient} ${config.text} shadow-lg ${sizeClasses[size]} ${className}`}
    >
      <Icon className={iconSize[size]} strokeWidth={2.5} />
      {showLabel && <span>{config.label}</span>}
    </motion.span>
  );
});
