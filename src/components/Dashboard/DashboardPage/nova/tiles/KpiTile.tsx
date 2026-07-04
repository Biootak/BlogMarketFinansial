'use client';

/**
 * KpiTile — a single metric tile in the NOVA bento cluster (v2).
 *
 * Compact tile with tone-colored left accent stripe, big CountUp value,
 * a one-line sparkline and a trend delta chip. Spotlight removed — the
 * accent stripe provides enough visual identity.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { Spotlight, type SpotlightTone } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineMinus,
} from 'react-icons/hi2';
import { pickTrend } from '../utils';

const SPOT: Record<KpiTone, SpotlightTone> = {
  primary: 'indigo',
  cyan: 'cyan',
  rose: 'rose',
  emerald: 'emerald',
  violet: 'violet',
  amber: 'amber',
};

export type KpiTone = 'primary' | 'cyan' | 'rose' | 'emerald' | 'violet' | 'amber';

const STROKE: Record<KpiTone, string> = {
  primary: 'var(--nova-primary)',
  cyan: 'var(--nova-cyan)',
  rose: 'var(--nova-rose)',
  emerald: 'var(--nova-emerald)',
  violet: 'var(--nova-violet)',
  amber: 'var(--nova-amber)',
};

interface KpiTileProps {
  label: string;
  value: number;
  data: number[];
  tone: KpiTone;
  icon: React.ReactNode;
  area: string;
}

function MiniSpark({ data, stroke }: { data: number[]; stroke: string }) {
  if (data.length < 2) return null;
  const w = 100;
  const h = 26;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const line = data
    .map((v, i) => {
      const x = i * step;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="nova-kpi__spark" aria-hidden>
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function KpiTile({ label, value, data, tone, icon, area }: KpiTileProps) {
  const { trend, delta } = pickTrend(data);
  const TrendIcon =
    trend === 'up' ? HiOutlineArrowUpRight : trend === 'down' ? HiOutlineArrowDownRight : HiOutlineMinus;

  return (
    <section
      className={cn('nova-tile nova-tile--kpi', `nova-kpi--${tone}`)}
      data-tone={tone}
      style={{ gridArea: area }}
      aria-label={label}
    >
      <Spotlight tone={SPOT[tone]} size={200} />
      <header className="nova-kpi__head">
        <span className="nova-kpi__ico" aria-hidden>
          {icon}
        </span>
        <span className="nova-kpi__label">{label}</span>
        {data.length >= 2 && (
          <span className={cn('nova-kpi__delta', `is-${trend}`)}>
            <TrendIcon className="w-3 h-3" aria-hidden />
            <span className="tabular-nums">{`${delta > 0 ? '+' : ''}${delta.toFixed(0)}٪`}</span>
          </span>
        )}
      </header>
      <p className="nova-kpi__value tabular-nums">
        <CountUp value={value} duration={950} />
      </p>
      <MiniSpark data={data} stroke={STROKE[tone]} />
    </section>
  );
}
