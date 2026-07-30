'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type TimeRibbonPoint = {
  /** ms-since-epoch */
  t: number;
  value: number;
};

interface TimeRibbonProps {
  points: TimeRibbonPoint[];
  height?: number;
  tone?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet';
  /** show markers at each point */
  markers?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * TimeRibbon — bottom-aligned timeline ribbon (river metaphor).
 * Different from Sparkline: the "water" rises from a baseline (avg),
 * creating a visual volume-of-activity over time.
 * - viewBox 0..100 × 0..30
 * - baseline = mean of values
 * - each point is drawn as a vertical fill from baseline toward value
 * - result: a "wave" silhouette of activity
 */
export function TimeRibbon({
  points,
  height = 80,
  tone = 'emerald',
  markers = false,
  className,
  ariaLabel,
}: TimeRibbonProps) {
  const { area, baselineY, peakX, maxV } = useMemo(() => {
    if (points.length === 0) {
      return { area: '', baselineY: 30, peakX: 0, maxV: 0 };
    }
    const max = Math.max(...points.map((p) => p.value), 1);
    const sum = points.reduce((s, p) => s + p.value, 0);
    const mean = sum / points.length;
    const w = 100;
    const h = 30;
    const step = points.length > 1 ? w / (points.length - 1) : 0;
    // build area: from (0,h) along bottom to baseline Y across to (w, baselineY) up to (w, h) close
    // We want the shape: each point's value plotted, with area below filled.
    // We use: M0,h L 0,(h-baseline), then line through points (h - value/max*h)
    // then line to (w, baseline) then down to (w, h) close.
    const baseY = h - (mean / max) * h;
    const path: string[] = [`M 0 ${h}`];
    points.forEach((p, i) => {
      const x = i * step;
      const y = h - (p.value / max) * h;
      path.push(i === 0 ? `L ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`);
    });
    path.push(`L ${w} ${baseY.toFixed(2)}`);
    path.push(`L ${w} ${h}`);
    path.push('Z');
    // peak
    let pX = 0;
    let pV = -Infinity;
    points.forEach((p, i) => {
      if (p.value > pV) {
        pV = p.value;
        pX = i * step;
      }
    });
    return { area: path.join(' '), baselineY: baseY, peakX: pX, maxV: max };
  }, [points]);

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      height={height}
      className={cn(s.timeRibbon, className)}
      data-tone={tone}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={`ribbon-fill-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* baseline hairline */}
      <line
        x1="0"
        y1={baselineY}
        x2="100"
        y2={baselineY}
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="0.3"
        strokeDasharray="0.6 0.6"
        vectorEffect="non-scaling-stroke"
      />
      <path d={area} fill={`url(#ribbon-fill-${tone})`} />
      {/* ridge line */}
      {points.length > 0
        ? (() => {
            const max = Math.max(...points.map((p) => p.value), 1);
            const step = points.length > 1 ? 100 / (points.length - 1) : 0;
            const linePts = points
              .map((p, i) => {
                const x = i * step;
                const y = 30 - (p.value / max) * 30;
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
              })
              .join(' ');
            return (
              <path
                d={linePts}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.7"
                strokeOpacity="0.7"
                vectorEffect="non-scaling-stroke"
              />
            );
          })()
        : null}
      {markers && points.length > 0
        ? (() => {
            const max = Math.max(...points.map((p) => p.value), 1);
            const step = points.length > 1 ? 100 / (points.length - 1) : 0;
            return points.map((p, i) => {
              const x = i * step;
              const y = 30 - (p.value / max) * 30;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="0.5"
                  fill="currentColor"
                  vectorEffect="non-scaling-stroke"
                />
              );
            });
          })()
        : null}
      {maxV > 0 ? (
        <g>
          <line
            x1={peakX}
            y1="0"
            x2={peakX}
            y2="30"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={peakX}
            cy={30 - 1}
            r="0.9"
            fill="currentColor"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ) : null}
    </svg>
  );
}
