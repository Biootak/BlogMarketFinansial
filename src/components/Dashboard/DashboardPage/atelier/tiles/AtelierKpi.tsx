'use client';

/**
 * AtelierKpi — premium metric tile.
 *
 * One neutral color for the value; trend delta uses semantic coloring
 * (emerald for up, rose for down, slate for flat). Features a small
 * sparkline drawn from the weekly data series. Designed to read at a
 * glance inside a 3-col strip under the hero.
 */

import CountUp from '@/components/Dashboard/primitives/CountUp';
import { cn } from '@/lib/utils';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineMinus,
} from 'react-icons/hi2';
import { fmtCompact, pickTrend } from '../utils';

interface AtelierKpiProps {
  label: string;
  value: number;
  data: number[];
  /** Optional icon for the small header badge. */
  icon?: React.ReactNode;
  /** Optional unit suffix (e.g. "٪" for percentage). */
  suffix?: string;
  /** Whether to render the compact format (1.2K) for the value. */
  compact?: boolean;
}

function MiniSpark({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 130;
  const h = 32;
  const allZero = data.every((v) => v === 0);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const line = data
    .map((v, i) => {
      const x = i * step;
      const y = allZero ? h - 3 : h - 4 - ((v - min) / span) * (h - 10);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="at-kpi__spark" aria-hidden>
      {allZero && (
        <line
          x1="0"
          y1={h - 3}
          x2={w}
          y2={h - 3}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.4}
        />
      )}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={allZero ? 1 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={allZero ? 0.5 : 0.7}
      />
    </svg>
  );
}

export default function AtelierKpi({
  label,
  value,
  data,
  icon,
  suffix,
  compact = false,
}: AtelierKpiProps) {
  const { trend, delta } = pickTrend(data);
  const TrendIcon =
    trend === 'up'
      ? HiOutlineArrowUpRight
      : trend === 'down'
        ? HiOutlineArrowDownRight
        : HiOutlineMinus;

  return (
    <section className="at-tile at-kpi" aria-label={label}>
      <header className="at-kpi__head">
        <span className="at-kpi__label">
          {icon && <span className="at-kpi__ico" aria-hidden>{icon}</span>}
          <span>{label}</span>
        </span>
        {data.length >= 2 && (
          <span className={cn('at-kpi__delta', `is-${trend}`)}>
            <TrendIcon className="w-3 h-3" aria-hidden />
            <span className="tabular-nums">
              {`${delta > 0 ? '+' : ''}${delta.toFixed(0)}٪`}
            </span>
          </span>
        )}
      </header>

      <p
        className="at-kpi__value tabular-nums"
        style={value === 0 ? { color: 'var(--at-fg-faint)' } : undefined}
      >
        {compact ? fmtCompact(value) : <CountUp value={value} duration={1000} />}
        {suffix && <span className="at-kpi__suffix">{suffix}</span>}
      </p>
      {value === 0 && <span className="at-kpi__zero">هنوز داده‌ای ثبت نشده</span>}

      <MiniSpark data={data} />
    </section>
  );
}
