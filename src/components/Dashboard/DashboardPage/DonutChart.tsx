'use client';

/**
 * DonutChart — hand-rolled SVG donut showing the share of each metric
 * in the total "engagement" footprint. Renders a center label with the
 * grand total, then 4–5 colored arcs + a legend.
 *
 * No external chart dependency (recharts/d3) — a single <svg> + a few
 * <path> arcs computed from polar-to-cartesian. Sized in viewBox so the
 * SVG scales cleanly across breakpoints.
 *
 * Accessibility:
 *   • Real <svg role="img"> with an aria-label summarizing the chart
 *   • The center total is also a <text> inside the SVG so screen
 *     readers can read it as part of the figure
 *   • The legend is a real <ul> with role="list"
 */

import { useId, useMemo } from 'react';
import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  /** Center caption shown as the total. */
  total: number;
  /** Big number label shown above the total (e.g. "کل بازدید"). */
  caption: string;
  /** Sub-caption shown under the total (e.g. "۷ روز اخیر"). */
  subCaption?: string;
  size?: number;
  thickness?: number;
  className?: string;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  start: number,
  end: number,
): string {
  const largeArc = end - start > 180 ? 1 : 0;
  const a1 = polar(cx, cy, rOuter, start);
  const a2 = polar(cx, cy, rOuter, end);
  const b1 = polar(cx, cy, rInner, end);
  const b2 = polar(cx, cy, rInner, start);
  return [
    `M ${a1.x} ${a1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${a2.x} ${a2.y}`,
    `L ${b1.x} ${b1.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${b2.x} ${b2.y}`,
    'Z',
  ].join(' ');
}

export default function DonutChart({
  slices,
  total,
  caption,
  subCaption,
  size = 200,
  thickness = 22,
  className,
}: DonutChartProps) {
  const id = useId();
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter - thickness;

  const safe = useMemo(() => {
    const positive = slices.filter((s) => s.value > 0);
    const sum = positive.reduce((acc, s) => acc + s.value, 0);
    if (sum <= 0) return { arcs: [] as Array<{ slice: DonutSlice; d: string }>, sum: 0 };
    let cursor = 0;
    const arcs = positive.map((slice) => {
      const sweep = (slice.value / sum) * 360;
      // leave a 2deg gap between arcs for breathing room
      const start = cursor;
      const end = Math.min(360, cursor + sweep - 2);
      cursor = end + 2;
      return { slice, d: arcPath(cx, cy, rOuter, rInner, start, end) };
    });
    return { arcs, sum };
  }, [slices, cx, cy, rOuter, rInner]);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center gap-5 sm:gap-6',
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={`نمودار دایره‌ای ${caption}: مجموع ${total.toLocaleString('fa-IR')}`}
        className="shrink-0"
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={(rOuter + rInner) / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness - 2}
          className="text-slate-100 dark:text-slate-800/60"
        />
        {safe.arcs.map(({ slice, d }, i) => (
          <motion.path
            key={`${id}-${slice.key}`}
            d={d}
            fill={slice.color}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.05 * i,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <title>
              {slice.label}: {slice.value.toLocaleString('fa-IR')}
            </title>
          </motion.path>
        ))}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400"
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          {caption}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-slate-900 dark:fill-white tabular-nums"
          style={{ fontSize: 18, fontWeight: 800 }}
        >
          {total.toLocaleString('fa-IR')}
        </text>
        {subCaption && (
          <text
            x={cx}
            y={cy + 30}
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-500"
            style={{ fontSize: 9 }}
          >
            {subCaption}
          </text>
        )}
      </svg>

      <ul className="grid grid-cols-1 gap-1.5 text-xs flex-1 min-w-0">
        {slices.map((s) => {
          const pct = safe.sum > 0 ? (s.value / safe.sum) * 100 : 0;
          return (
            <li
              key={s.key}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-slate-600 dark:text-slate-300 truncate">
                  {s.label}
                </span>
              </span>
              <span className="flex items-center gap-2 tabular-nums text-slate-700 dark:text-slate-200 font-semibold">
                <span>{s.value.toLocaleString('fa-IR')}</span>
                <span className="text-slate-400 dark:text-slate-500 text-[10px] font-normal">
                  {pct.toFixed(0)}٪
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
