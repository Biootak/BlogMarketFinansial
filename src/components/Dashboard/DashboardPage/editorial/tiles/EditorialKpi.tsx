'use client';

/**
 * EditorialKpi — minimal metric tile.
 *
 * One neutral color for the value; trend delta uses semantic coloring
 * (emerald for up, rose for down, slate for flat). No rainbow palette,
 * no tone stripes, no glass.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { cn } from '@/lib/utils';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineMinus,
} from 'react-icons/hi2';
import { pickTrend } from '../utils';

interface EditorialKpiProps {
  label: string;
  value: number;
  data: number[];
}

function MiniSpark({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 110;
  const h = 28;
  const allZero = data.every((v) => v === 0);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const line = data
    .map((v, i) => {
      const x = i * step;
      const y = allZero ? h - 3 : h - 3 - ((v - min) / span) * (h - 8);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="ec-kpi__spark" aria-hidden>
      {allZero && (
        <line
          x1="0"
          y1={h - 3}
          x2={w}
          y2={h - 3}
          stroke="var(--ec-line-strong)"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}
      <path
        d={line}
        fill="none"
        stroke="var(--ec-line-strong)"
        strokeWidth={allZero ? 1 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={allZero ? 0.5 : 1}
      />
    </svg>
  );
}

export default function EditorialKpi({ label, value, data }: EditorialKpiProps) {
  const { trend, delta } = pickTrend(data);
  const TrendIcon =
    trend === 'up'
      ? HiOutlineArrowUpRight
      : trend === 'down'
        ? HiOutlineArrowDownRight
        : HiOutlineMinus;

  return (
    <section className="ec-tile ec-kpi" aria-label={label}>
      <header className="ec-kpi__head">
        <span className="ec-kpi__label">{label}</span>
        {data.length >= 2 && (
          <span className={cn('ec-kpi__delta', `ec-kpi__delta--${trend}`)}>
            <TrendIcon className="w-3 h-3" aria-hidden />
            <span className="tabular-nums">{`${delta > 0 ? '+' : ''}${delta.toFixed(0)}٪`}</span>
          </span>
        )}
      </header>

      <p
        className="ec-kpi__value tabular-nums"
        style={value === 0 ? { color: 'var(--ec-fg-faint)' } : undefined}
      >
        <CountUp value={value} duration={950} />
      </p>
      {value === 0 && <span className="ec-kpi__zero">هنوز داده‌ای ثبت نشده</span>}

      <MiniSpark data={data} />
    </section>
  );
}
