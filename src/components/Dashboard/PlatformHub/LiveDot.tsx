'use client';

import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type LiveDotTone =
  | 'emerald'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'violet';
export type LiveDotSize = 'xs' | 'sm' | 'md';

interface LiveDotProps {
  tone?: LiveDotTone;
  size?: LiveDotSize;
  label?: string;
  className?: string;
}

/**
 * LiveDot — pulsing accent indicator for "real-time" data.
 * Token-based ring + dot; animation globally clamped in tokens.css:221.
 */
export function LiveDot({
  tone = 'emerald',
  size = 'sm',
  label,
  className,
}: LiveDotProps) {
  return (
    <span className={cn(s.liveDot, className)} data-tone={tone} data-size={size}>
      <span className={s.liveDotPulse} aria-hidden />
      <span className={s.liveDotCore} aria-hidden />
      {label ? (
        <span className={s.liveDotLabel}>{label}</span>
      ) : (
        <span className="sr-only">زنده</span>
      )}
    </span>
  );
}
