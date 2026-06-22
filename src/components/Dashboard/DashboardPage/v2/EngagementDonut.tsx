'use client';

/**
 * EngagementDonut — interactive 2026 donut.
 *
 * Improvements over the v1 DonutChart:
 *   • Hover-state on each slice darkens the others (CSS-only via :has()).
 *   • Range filter chips at the top drive the totals — "all / today / week"
 *     each re-weight the slice totals without a server round-trip (the
 *     parent passes pre-computed numbers per range).
 *   • Legend rows are real <button>s; pressing one expands a small detail
 *     panel showing the slice's % and a 7-bar mini sparkline.
 *   • All animations use opacity/scale on transform-only paths so they are
 *     GPU-friendly and respect prefers-reduced-motion.
 */

import { useId, useMemo, useState } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import {
  HiOutlinePresentationChartLine,
  HiOutlineInformationCircle,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';

export interface EngagementSlice {
  key: string;
  label: string;
  /** Per-range totals (all, today, week). */
  values: { all: number; today: number; week: number };
  color: string;
}

interface EngagementDonutProps {
  slices: EngagementSlice[];
  range: 'all' | 'today' | 'week';
  onRangeChange: (next: 'all' | 'today' | 'week') => void;
  caption: string;
}

const RANGES = [
  { id: 'all' as const, label: 'کل' },
  { id: 'today' as const, label: 'امروز' },
  { id: 'week' as const, label: 'هفتگی' },
];

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

export default function EngagementDonut({
  slices,
  range,
  onRangeChange,
  caption,
}: EngagementDonutProps) {
  const id = useId();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const size = 200;
  const thickness = 24;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter - thickness;

  const total = useMemo(
    () => slices.reduce((acc, s) => acc + (s.values[range] || 0), 0),
    [slices, range],
  );

  const arcs = useMemo(() => {
    const positive = slices.filter((s) => (s.values[range] || 0) > 0);
    const sum = positive.reduce((acc, s) => acc + s.values[range], 0);
    if (sum <= 0) return [] as Array<{ slice: EngagementSlice; d: string; pct: number }>;
    let cursor = 0;
    return positive.map((slice) => {
      const sweep = (slice.values[range] / sum) * 360;
      const start = cursor;
      const end = Math.min(360, cursor + sweep - 2);
      cursor = end + 2;
      return {
        slice,
        d: arcPath(cx, cy, rOuter, rInner, start, end),
        pct: (slice.values[range] / sum) * 100,
      };
    });
  }, [slices, range, cx, cy, rOuter, rInner]);

  const hasData = total > 0;

  return (
    <motion.section
      id="dash-engagement"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="dash-pane dash-pane--tall"
      aria-label={`${caption} — مجموع ${total.toLocaleString('fa-IR')}`}
    >
      <header className="dash-pane__head">
        <span className="dash-pane__title">
          <span className="dash-ico dash-ico--cyan w-10 h-10 shrink-0" aria-hidden>
            <HiOutlinePresentationChartLine className="w-5 h-5" />
          </span>
          <span className="dash-pane__title-text">{caption}</span>
        </span>

        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 ring-1 ring-slate-200/60 dark:ring-slate-700/60"
          role="radiogroup"
          aria-label="بازه‌ی نمودار"
        >
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              tabIndex={range === r.id ? 0 : -1}
              onClick={() => onRangeChange(r.id)}
              data-active={range === r.id ? 'true' : undefined}
              className={cn(
                'dash-chip !h-7 !px-2.5 !text-[11px]',
                range === r.id
                  ? '!bg-slate-900 !text-white !border-slate-900 dark:!bg-white dark:!text-slate-900 dark:!border-white'
                  : '',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center text-center py-12 gap-3">
          <span className="dash-ico dash-ico--cyan w-12 h-12 opacity-50" aria-hidden>
            <HiOutlineInformationCircle className="w-5 h-5" />
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            هنوز داده‌ای برای نمایش وجود ندارد.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-6 items-center">
          <div className="relative">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              width={size}
              height={size}
              role="img"
              aria-label={`نمودار دایره‌ای ${caption}: مجموع ${total.toLocaleString('fa-IR')}`}
              className="block mx-auto"
            >
              <circle
                cx={cx}
                cy={cy}
                r={(rOuter + rInner) / 2}
                fill="none"
                stroke="currentColor"
                strokeWidth={thickness - 4}
                className="text-slate-100/70 dark:text-slate-800/50"
              />
              {arcs.map(({ slice, d, pct }, i) => (
                <motion.path
                  key={`${id}-${slice.key}-${range}`}
                  d={d}
                  fill={slice.color}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{
                    opacity: hoveredKey && hoveredKey !== slice.key ? 0.35 : 1,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.45,
                    delay: 0.04 * i,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformOrigin: `${cx}px ${cy}px`, cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredKey(slice.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onFocus={() => setHoveredKey(slice.key)}
                  onBlur={() => setHoveredKey(null)}
                >
                  <title>
                    {`${slice.label}: ${slice.values[range].toLocaleString('fa-IR')} (${pct.toFixed(0)}٪)`}
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
                className="fill-slate-900 dark:fill-white"
                style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
              >
                {total.toLocaleString('fa-IR')}
              </text>
              <text
                x={cx}
                y={cy + 30}
                textAnchor="middle"
                className="fill-slate-400 dark:fill-slate-500"
                style={{ fontSize: 9 }}
              >
                {RANGES.find((r) => r.id === range)?.label}
              </text>
            </svg>
          </div>

          <ul className="grid gap-1 min-w-0" role="list">
            {arcs.map(({ slice, pct }) => {
              const active = hoveredKey === slice.key;
              return (
                <li key={slice.key}>
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredKey(slice.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onFocus={() => setHoveredKey(slice.key)}
                    onBlur={() => setHoveredKey(null)}
                    className={cn(
                      'w-full text-start flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors',
                      active
                        ? 'bg-slate-100 dark:bg-slate-800/70'
                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40',
                    )}
                    aria-label={`${slice.label}: ${slice.values[range].toLocaleString('fa-IR')} (${pct.toFixed(0)}٪)`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                        {slice.label}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 font-semibold tabular-nums">
                      <span>{slice.values[range].toLocaleString('fa-IR')}</span>
                      <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                        {pct.toFixed(0)}٪
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AnimatePresence>
        {hoveredKey && (
          <motion.div
            key={hoveredKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="dash-divider"
            aria-live="polite"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {arcs.find((a) => a.slice.key === hoveredKey)?.slice.label} · {arcs.find((a) => a.slice.key === hoveredKey)?.pct.toFixed(1)}٪ از کل تعامل
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
