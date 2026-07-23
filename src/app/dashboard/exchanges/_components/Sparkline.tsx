'use client';

/**
 * Sparkline — pure-SVG mini line/area chart with gradient fill.
 *
 *   tones: accent | gold | muted | rose
 *   variants: line | area
 */

import { useId } from 'react';
import s from './ExchangesWorkspace.module.css';

type Tone = 'accent' | 'gold' | 'muted' | 'rose';
type Variant = 'line' | 'area';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  tone?: Tone;
  variant?: Variant;
  ariaLabel?: string;
}

const TONE_VAR: Record<Tone, string> = {
  accent: 'var(--at-accent)',
  gold:   'var(--at-gold)',
  muted:  'var(--at-fg-faint)',
  rose:   'var(--at-danger)',
};

const TONE_VAR_SOFT: Record<Tone, string> = {
  accent: 'var(--at-accent-soft)',
  gold:   'var(--at-gold-soft)',
  muted:  'var(--at-line)',
  rose:   'color-mix(in oklch, var(--at-danger) 18%, transparent)',
};

export default function Sparkline({
  data,
  width = 220,
  height = 40,
  tone = 'accent',
  variant = 'line',
  ariaLabel,
}: Props) {
  // Stable ID — useId guarantees uniqueness across renders, no Math.random.
  const gradId = useId();

  if (!data || data.length === 0) {
    return <span className={s.tile__chartSvg} aria-hidden style={{ minBlockSize: height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 2;
  const padY = 3;
  const w = width;
  const h = height;
  const stepX = (w - padX * 2) / (data.length - 1 || 1);

  const points = data.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - (v - min) / range) * (h - padY * 2);
    return [x, y] as const;
  });

  const pathD = points
    .map(([x, y], i) => (i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`))
    .join(' ');

  const areaD = `${pathD} L ${(padX + (data.length - 1) * stepX).toFixed(2)} ${(h - padY).toFixed(2)} L ${padX.toFixed(2)} ${(h - padY).toFixed(2)} Z`;

  const stroke = TONE_VAR[tone];
  const fill = TONE_VAR_SOFT[tone];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      style={{ display: 'block', inlineSize: '100%', blockSize: '100%' }}
    >
      <defs>
        <linearGradient id={`spk-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {variant === 'area' && <path d={areaD} fill={`url(#spk-${gradId})`} />}
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 1px 0 ${fill})` }}
      />
      {points.length > 0 && (() => {
        const last = points[points.length - 1]!;
        return (
          <g>
            <circle cx={last[0]} cy={last[1]} r="3" fill={fill} />
            <circle cx={last[0]} cy={last[1]} r="1.75" fill={stroke} />
          </g>
        );
      })()}
    </svg>
  );
}
