'use client';

/**
 * TrendSparkline — premium mini inline sparkline for KPI cells.
 *
 * Renders a compact SVG sparkline (no axes, no labels) that fits inside
 * any dashboard KPI card. Uses --nova-* tokens for up/down coloring.
 * Features gradient fill, glow dot, and smooth bezier curves.
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

/** Build a smooth bezier path from points (catmull-rom → cubic bezier) */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return points.length === 1 ? `M${points[0].x},${points[0].y}` : '';

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

export function TrendSparkline({
  data,
  height = 28,
  width = 80,
  direction,
  fill = true,
  dot = true,
}: TrendSparklineProps) {
  const { path, area, colorVar, gradientId } = useMemo(() => {
    if (data.length === 0) {
      return {
        path: '',
        area: '',
        dir: 'flat' as const,
        colorVar: '--ds-text-muted',
        gradientId: '',
      };
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

    const linePath = smoothPath(points);
    const areaPath =
      points.length > 1
        ? `${linePath} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`
        : '';

    const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;

    return { path: linePath, area: areaPath, dir, colorVar, gradientId };
  }, [data, direction, fill, width, height]);

  // Compute last point position for the dot
  const lastPoint = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const plotH = height - padding * 2;
    const plotW = width - padding * 2;
    return {
      x: padding + plotW,
      y: padding + plotH - ((data[data.length - 1] - min) / range) * plotH,
    };
  }, [data, height, width]);

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
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {fill && area && (
        <path
          d={area}
          fill={`url(#${gradientId})`}
          className={s.area}
          style={{ color: 'var(--nova-up, var(--ds-accent-emerald))' }}
        />
      )}
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
        <>
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="4"
            fill={colorVar}
            opacity="0.2"
            className={s.dot}
          />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="2" fill={colorVar} className={s.dot} />
        </>
      )}
    </svg>
  );
}
