'use client';

/**
 * Sparkline — minimal SVG trend line.
 *
 *   • Pure SVG, no chart library.
 *   • Animates path drawing on mount (CSS-driven, reduced-motion safe).
 *   • Trend direction: up/down/flat → color via --trend-up / --trend-down.
 *   • Optional area fill with low-saturation gradient.
 */

import { useId, useMemo } from 'react';
import s from './Sparkline.module.css';

type Props = {
  values: number[];
  /** عرض واقعی SVG. */
  width?: number;
  /** ارتفاع واقعی SVG. */
  height?: number;
  /** ضخامت خط. */
  strokeWidth?: number;
  /** آیا area زیر خط پر شود؟ */
  area?: boolean;
  /** نقطهٔ آخر highlight شود؟ */
  showEndPoint?: boolean;
  className?: string;
  /** aria-label برای screen reader. */
  label?: string;
};

export default function Sparkline({
  values,
  width = 96,
  height = 28,
  strokeWidth = 1.5,
  area = true,
  showEndPoint = true,
  className = '',
  label,
}: Props) {
  const id = useId().replace(/:/g, '');
  const pathId = `spark-${id}`;
  const areaId = `area-${id}`;

  const { path, areaPath, trend, lastPoint } = useMemo(() => {
    if (values.length < 2) {
      return { path: '', areaPath: '', trend: 'flat' as const, lastPoint: null };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padX = 2;
    const padY = 3;
    const w = width - padX * 2;
    const h = height - padY * 2;
    const step = w / (values.length - 1);

    const points = values.map((v, i) => {
      const x = padX + i * step;
      const y = padY + h - ((v - min) / range) * h;
      return [x, y] as const;
    });

    // Catmull-Rom-ish smoothing
    const linePath = points
      .map(([x, y], i) => {
        if (i === 0) return `M ${x} ${y}`;
        const [px, py] = points[i - 1];
        const cx = (px + x) / 2;
        return `Q ${cx} ${py} ${x} ${y}`;
      })
      .join(' ');

    const areaP = `${linePath} L ${padX + w} ${height} L ${padX} ${height} Z`;

    const trend: 'up' | 'down' | 'flat' =
      values[values.length - 1] > values[0]
        ? 'up'
        : values[values.length - 1] < values[0]
          ? 'down'
          : 'flat';

    return {
      path: linePath,
      areaPath: areaP,
      trend,
      lastPoint: points[points.length - 1] as readonly [number, number],
    };
  }, [values, width, height]);

  if (!path || !lastPoint) {
    return (
      <svg
        className={`${s.empty} ${className}`}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`${s.root} ${className}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      data-trend={trend}
    >
      <defs>
        <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className={s.areaUp} stopOpacity="0.22" />
          <stop offset="100%" className={s.areaUp} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={areaPath} fill={`url(#${areaId})`} />}
      <path
        id={pathId}
        d={path}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={s.line}
        data-trend={trend}
      />
      {showEndPoint && (
        <>
          <circle
            cx={lastPoint[0]}
            cy={lastPoint[1]}
            r={3.5}
            className={s.endpointHalo}
            aria-hidden
          />
          <circle
            cx={lastPoint[0]}
            cy={lastPoint[1]}
            r={1.6}
            className={s.endpoint}
            aria-hidden
            data-trend={trend}
          />
        </>
      )}
    </svg>
  );
}
