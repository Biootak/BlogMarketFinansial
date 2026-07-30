'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type ThroughputBarsTone =
  | 'emerald'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'violet';

interface ThroughputBarsProps {
  values: number[];
  /** Optional labels for x-axis (24 elements expected) */
  labels?: string[];
  tone?: ThroughputBarsTone;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * ThroughputBars — vertical distribution bars with peak marker.
 * Token-based; CSS-only animation; works as a flow indicator.
 */
export function ThroughputBars({
  values,
  labels,
  tone = 'emerald',
  height = 120,
  className,
  ariaLabel,
}: ThroughputBarsProps) {
  const { max, peakIndex } = useMemo(() => {
    let m = 0;
    let p = 0;
    values.forEach((v, i) => {
      if (v > m) {
        m = v;
        p = i;
      }
    });
    return { max: Math.max(m, 1), peakIndex: p };
  }, [values]);

  return (
    <div className={cn(s.throughputBars, className)} style={{ height: `${height}px` }} data-tone={tone} role="img" aria-label={ariaLabel}>
      {values.map((v, i) => {
        const h = max > 0 ? (v / max) * 100 : 0;
        const isPeak = i === peakIndex && v > 0;
        return (
          <div key={i} className={s.throughputBar} data-peak={isPeak}>
            <div className={s.throughputBarFill} style={{ height: `${Math.max(h, v > 0 ? 4 : 0)}%` }} />
            {labels?.[i] && i % 4 === 0 ? (
              <span className={s.throughputBarLabel}>{labels[i]}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
