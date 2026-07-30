'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type SparklineTone =
  | 'emerald'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'violet';

interface SparklineProps {
  values: number[];
  tone?: SparklineTone;
  height?: number;
  showArea?: boolean;
  showDots?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Sparkline — minimal SVG sparkline. No external chart lib.
 * RTL: starts from inline-end (right in RTL) and reads LTR along the line.
 * - viewBox-based for crisp scaling
 * - area fill uses linear gradient (token-based)
 * - last point dot for emphasis
 */
export function Sparkline({
  values,
  tone = 'emerald',
  height = 36,
  showArea = true,
  showDots = false,
  className,
  ariaLabel,
}: SparklineProps) {
  const path = useMemo(() => {
    if (values.length === 0) return { line: '', area: '', last: null as null | { x: number; y: number } };
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const w = 100;
    const h = 30;
    const step = values.length > 1 ? w / (values.length - 1) : 0;
    const points = values.map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return { x, y };
    });
    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');
    const area = `${line} L ${w} ${h} L 0 ${h} Z`;
    const last = points[points.length - 1] ?? null;
    return { line, area, last };
  }, [values]);

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      height={height}
      className={cn(s.sparkline, className)}
      data-tone={tone}
      role="img"
      aria-label={ariaLabel}
    >
      {showArea ? (
        <>
          <defs>
            <linearGradient id={`spark-fill-${tone}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={path.area} fill={`url(#spark-fill-${tone})`} />
        </>
      ) : null}
      <path
        d={path.line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showDots
        ? values.map((_, i) => {
            const x = (i * 100) / Math.max(values.length - 1, 1);
            const max = Math.max(...values, 1);
            const min = Math.min(...values, 0);
            const range = max - min || 1;
            const y = 30 - (((values[i] ?? 0) - min) / range) * 30;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="0.8"
                fill="currentColor"
                vectorEffect="non-scaling-stroke"
              />
            );
          })
        : null}
      {path.last ? (
        <circle
          cx={path.last.x}
          cy={path.last.y}
          r="1.2"
          fill="currentColor"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}
