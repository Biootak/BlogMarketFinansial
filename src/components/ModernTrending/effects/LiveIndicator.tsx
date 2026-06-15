/**
 * LiveIndicator — نشانگر LIVE (CSS-driven, no framer-motion)
 *
 * - Pure CSS @keyframes برای ping effect
 * - prefers-reduced-motion: global rule clamps animation به 0.01ms
 */

import { cn } from '@/lib/utils';

export interface LiveIndicatorProps {
  className?: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  color?: 'rose' | 'emerald' | 'amber' | 'neutral';
}

const colorMap = {
  rose: 'bg-rose-500/80',
  emerald: 'bg-emerald-500/80',
  amber: 'bg-amber-500/80',
  neutral: 'bg-neutral-500/80',
} as const;

const labelColor = {
  rose: 'text-rose-600/90 dark:text-rose-400/90',
  emerald: 'text-emerald-600/90 dark:text-emerald-400/90',
  amber: 'text-amber-600/90 dark:text-amber-400/90',
  neutral: 'text-neutral-600/90 dark:text-neutral-400/90',
} as const;

const sizeMap = {
  xs: { dot: 'h-1 w-1', text: 'text-[9px]' },
  sm: { dot: 'h-1.5 w-1.5', text: 'text-[10px]' },
  md: { dot: 'h-2 w-2', text: 'text-xs' },
} as const;

export function LiveIndicator({
  className,
  label = 'live',
  size = 'sm',
  color = 'rose',
}: LiveIndicatorProps) {
  const s = sizeMap[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5',
        'tracking-[0.15em] uppercase font-medium',
        s.text,
        labelColor[color],
        className,
      )}
    >
      <span className="relative inline-flex" aria-hidden>
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-60 anim-ping-soft',
            colorMap[color],
          )}
        />
        <span className={cn('relative inline-flex rounded-full', s.dot, colorMap[color])} />
      </span>
      {label}
    </div>
  );
}
