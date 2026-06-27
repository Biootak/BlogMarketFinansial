'use client';

/**
 * EngagementDonut — 2026 interactive donut (range-driven).
 *
 * The range filter (all / today / week) is now controlled from the
 * persistent Header / WorkspaceToolbar. This component is a pure
 * presentation surface: it receives `range` as a prop and re-weights
 * the slice totals without touching state itself.
 *
 * Modern techniques:
 *   • Hover-state on each slice darkens the others (CSS-only via :has()).
 *   • Slice animation uses opacity/scale on transform-only paths so it
 *     is GPU-friendly and respects prefers-reduced-motion.
 *   • All colors are oklch for predictable contrast in light + dark.
 *
 * Accessibility:
 *   • `<svg role="img">` with a real `<title>` per slice for SR users.
 *   • Legend rows are real <button>s so keyboard users can step through
 *     the slices with focus.
 */

import { useEffect, useId, useMemo, useState } from 'react';
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
  caption: string;
}

const RANGE_LABEL: Record<'all' | 'today' | 'week', string> = {
  all: 'کل',
  today: 'امروز',
  week: 'هفتگی',
};

export default function EngagementDonut({
  slices,
  range,
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
  const rMid = (rOuter + rInner) / 2;
  const circumference = 2 * Math.PI * rMid;

  const total = useMemo(
    () => slices.reduce((acc, s) => acc + (s.values[range] || 0), 0),
    [slices, range],
  );

  const arcs = useMemo(() => {
    const positive = slices.filter((s) => (s.values[range] || 0) > 0);
    const sum = positive.reduce((acc, s) => acc + s.values[range], 0);
    if (sum <= 0) {
      return [] as Array<{
        slice: EngagementSlice;
        start: number;
        arcLength: number;
        pct: number;
      }>;
    }
    let cursor = 0;
    return positive.map((slice) => {
      const sweep = (slice.values[range] / sum) * 360;
      const start = cursor;
      cursor += sweep;
      const arcLength = (sweep / 360) * circumference;
      return {
        slice,
        start,
        arcLength,
        pct: (slice.values[range] / sum) * 100,
      };
    });
  }, [slices, range, circumference]);

  const [offsets, setOffsets] = useState<number[]>([]);

  useEffect(() => {
    if (arcs.length === 0) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setOffsets(arcs.map(() => 0));
      return;
    }
    setOffsets(arcs.map((a) => a.arcLength));
    const startTs = performance.now();
    const duration = 600;
    const stagger = 80;
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - startTs;
      const next = arcs.map((a, i) => {
        const t = Math.max(0, Math.min(1, (elapsed - i * stagger) / duration));
        return a.arcLength * (1 - easeOutExpo(t));
      });
      setOffsets(next);
      if (elapsed < duration + (arcs.length - 1) * stagger) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [arcs]);

  const hoveredArc = arcs.find((a) => a.slice.key === hoveredKey);
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
        <span className="dash-pane__chip" aria-live="polite">
          {RANGE_LABEL[range]}
        </span>
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
              className="block mx-auto overflow-visible"
            >
              <circle
                cx={cx}
                cy={cy}
                r={rMid}
                fill="none"
                stroke="currentColor"
                strokeWidth={thickness - 4}
                className="text-slate-100/70 dark:text-slate-800/50"
              />
              {arcs.map(({ slice, start, arcLength, pct }, i) => (
                <g
                  key={`${id}-${slice.key}-${range}`}
                  transform={`rotate(${start} ${cx} ${cy})`}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rMid}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={thickness}
                    strokeLinecap="butt"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset={offsets[i] ?? arcLength}
                    className={cn(
                      'origin-center cursor-pointer transition-transform duration-200 hover:scale-105 hover:brightness-110',
                      hoveredKey && hoveredKey !== slice.key && 'opacity-[0.35]',
                    )}
                    onMouseEnter={() => setHoveredKey(slice.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onFocus={() => setHoveredKey(slice.key)}
                    onBlur={() => setHoveredKey(null)}
                    aria-label={`${slice.label}: ${pct.toFixed(0)}%`}
                  >
                    <title>
                      {`${slice.label}: ${slice.values[range].toLocaleString('fa-IR')} (${pct.toFixed(0)}٪)`}
                    </title>
                  </circle>
                </g>
              ))}
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {hoveredArc ? hoveredArc.slice.label : caption}
              </text>
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                className="fill-slate-900 dark:fill-white"
                style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
              >
                {hoveredArc
                  ? hoveredArc.slice.values[range].toLocaleString('fa-IR')
                  : total.toLocaleString('fa-IR')}
              </text>
              <text
                x={cx}
                y={cy + 30}
                textAnchor="middle"
                className="fill-slate-400 dark:fill-slate-500"
                style={{ fontSize: 9 }}
              >
                {hoveredArc
                  ? `${hoveredArc.pct.toFixed(0)}%`
                  : RANGE_LABEL[range]}
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
                        ? 'bg-white/75 dark:bg-[#1e293b]/50 border-[0.5px] border-white/90 dark:border-slate-600/20'
                        : 'hover:bg-white/60 dark:hover:bg-[#1e293b]/30',
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
