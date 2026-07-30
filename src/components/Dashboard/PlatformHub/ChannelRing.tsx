'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type ChannelRingTone =
  | 'emerald'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'violet';

export type ChannelRingSegment = {
  id: string;
  label: string;
  value: number;
  tone?: ChannelRingTone;
};

interface ChannelRingProps {
  segments: ChannelRingSegment[];
  size?: number;
  thickness?: number;
  className?: string;
  ariaLabel?: string;
  /** Optional center label/value */
  centerLabel?: string;
  centerValue?: string | number;
}

/**
 * ChannelRing — radial progress ring (SVG, no libs).
 * Each segment is a stroke segment around a circle. Stacked angles.
 * The center has a "cut" so the ring reads as a ring, not a pie.
 */
export function ChannelRing({
  segments,
  size = 200,
  thickness = 16,
  className,
  ariaLabel,
  centerLabel,
  centerValue,
}: ChannelRingProps) {
  const { r, c, total, arcs } = useMemo(() => {
    const total = Math.max(segments.reduce((sum, x) => sum + x.value, 0), 1);
    const c = size / 2;
    const r = (size - thickness) / 2;
    let acc = 0;
    const arcs = segments.map((seg) => {
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const end = ((acc + seg.value) / total) * Math.PI * 2 - Math.PI / 2;
      acc += seg.value;
      return { seg, start, end };
    });
    return { c, r, total, arcs };
  }, [segments, size, thickness]);

  return (
    <div
      className={cn(s.channelRing, className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* track */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth={thickness}
        />
        {arcs.map(({ seg, start, end }) => {
          const large = end - start > Math.PI ? 1 : 0;
          const x1 = c + r * Math.cos(start);
          const y1 = c + r * Math.sin(start);
          const x2 = c + r * Math.cos(end);
          const y2 = c + r * Math.sin(end);
          return (
            <circle
              key={seg.id}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={`var(--ds-${seg.tone ?? 'accent'}-500, currentColor)`}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${(r * (end - start)).toFixed(2)} ${(2 * Math.PI * r).toFixed(2)}`}
              transform={`rotate(-90 ${c} ${c})`}
              data-tone={seg.tone ?? 'neutral'}
            />
          );
        })}
      </svg>
      <div className={s.channelRingCenter}>
        {centerValue !== undefined ? <div className={s.channelRingValue}>{centerValue}</div> : null}
        {centerLabel ? <div className={s.channelRingLabel}>{centerLabel}</div> : null}
      </div>
    </div>
  );
}
