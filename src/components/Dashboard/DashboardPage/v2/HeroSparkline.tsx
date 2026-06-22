'use client';

/**
 * HeroSparkline — a single-stroke area+line SVG that fits any container.
 *
 * Computes everything from the data series without external dependencies so
 * it can be lazy-hydrated inside the HeroSection without a recharts
 * dependency. Stroke color is configurable so the same component powers the
 * emerald engagement line, the cyan hero line, etc.
 */

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface HeroSparklineProps {
  data: number[];
  /** CSS color string for the stroke + last-point dot. */
  stroke: string;
  className?: string;
  /** Pixel-perfect viewBox height (default 80). */
  height?: number;
}

export default function HeroSparkline({
  data,
  stroke,
  className,
  height = 80,
}: HeroSparklineProps) {
  const id = useId();
  const w = 600;
  const h = height;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const span = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - 8 - ((v - min) / span) * (h - 16);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const last = pts[pts.length - 1] ?? [0, 0];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn('w-full h-full block', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={4}
        fill={stroke}
        stroke="oklch(98% 0 0 / 0.85)"
        strokeWidth={2}
      />
    </svg>
  );
}
