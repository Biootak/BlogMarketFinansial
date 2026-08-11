'use client';

/**
 * TrendSparkline — mini inline sparkline for KPI cells.
 *
 * Renders a compact SVG sparkline (no axes, no labels) that fits inside
 * any dashboard KPI card. Uses --nova-* tokens for up/down coloring.
 *
 * Usage:
 *   <TrendSparkline data={[12, 19, 14, 22, 28, 25, 30]} />
 */

import { useMemo } from 'react';
import s from './TrendSparkline.module.css';

export interface TrendSparklineProps {
  data: number[];
  /** Height in px — default 28 */
  height?: number;
  /** Width in px — default 80 */
  width?: number;
  /** Force direction: 'up' | 'down' | 'flat' (auto-detected from data by default) */
  direction?: 'up' | 'down' | 'flat';
  /** Show area fill under the line */
  fill?: boolean;
  /** Show dot at the last point */
  dot?: boolean;
}

function detectDirection(data: number[]): 'up' | 'down' | 'flat' {
  if (data.length < 2) return 'flat';
  const first = data[0];
  const last = data[data.length - 1];
  const diff = ((last - first) / Math.max(Math.abs(first), 1)) * 100;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'flat';
}

export function TrendSparkline({
  data,
  height = 28,
  width = 80,
  direction,
  fill = true,
  dot = true,
}: TrendSparklineProps) {
  const { path, area, colorVar } = useMemo(() => {
    if (data.length === 0) {
      return { path: '', area: '', dir: 'flat' as const, colorVar: '--ds-text-muted' };
    }

    const dir = direction ?? detectDirection(data);
    const colorVar =
      dir === 'up'
        ? 'var(--nova-up, var(--ds-accent-emerald))'
        : dir === 'down'
          ? 'var(--nova-down, var(--ds-accent-rose))'
          : 'var(--ds-text-muted)';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    const points = data.map((v, i) => ({
      x: padding + (i / Math.max(data.length - 1, 1)) * plotW,
      y: padding + plotH - ((v - min) / range) * plotH,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath =
      points.length > 1
        ? `${linePath} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`
        : '';

    return { path: linePath, area: areaPath, dir, colorVar };
  }, [data, direction, fill, width, height]);

  if (data.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={s.root}
      role="img"
      aria-label="روند"
    >
      {fill && area && <path d={area} fill={colorVar} opacity="0.12" className={s.area} />}
      <path
        d={path}
        fill="none"
        stroke={colorVar}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={s.line}
      />
      {dot && data.length > 0 && (
        <circle
          cx={width - 2}
          cy={(() => {
            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;
            const padding = 2;
            const plotH = height - padding * 2;
            return padding + plotH - ((data[data.length - 1] - min) / range) * plotH;
          })()}
          r="2.5"
          fill={colorVar}
          className={s.dot}
        />
      )}
    </svg>
  );
}
