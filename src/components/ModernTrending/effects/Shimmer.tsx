/**
 * Shimmer — خط نور متحرک (CSS-driven)
 *
 * - کلاس `anim-shimmer` در globals.css، keyframe `shimmer` همان skewX(-12deg) حرکت.
 * - prefers-reduced-motion توسط global rule غیرفعال می‌شود.
 */

import { cn } from '@/lib/utils';

export interface ShimmerProps {
  className?: string;
  color?: 'light' | 'dark';
}

export function Shimmer({ className, color = 'dark' }: ShimmerProps) {
  const highlight =
    color === 'light'
      ? 'rgba(255,255,255,0.20)'
      : 'rgba(255,255,255,0.14)';

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden contain-strict', className)}
      aria-hidden
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background: `linear-gradient(110deg, transparent 30%, ${highlight} 50%, transparent 70%)`,
          width: '50%',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
