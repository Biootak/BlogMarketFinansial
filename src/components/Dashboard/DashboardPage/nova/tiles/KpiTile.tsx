'use client';

/**
 * KpiTile — a single metric tile in the NOVA bento cluster.
 *
 * Compact glass tile: tone dot, label, big CountUp value, a one-line
 * sparkline and a trend delta chip. Four of these sit in a 2×2 cluster
 * beside the hero. Each carries its own cursor Spotlight for depth.
 */

import CountUp from '@/components/Dashboard/DashboardPage/CountUp';
import { Spotlight, type SpotlightTone } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineMinus,
} from 'react-icons/hi2';

export type KpiTone = 'primary' | 'cyan' | 'rose' | 'emerald' | 'violet' | 'amber';

const SPOT: Record<KpiTone, SpotlightTone> = {
  primary: 'indigo',
  cyan: 'cyan',
  rose: 'rose',
  emerald: 'emerald',
  violet: 'violet',
  amber: 'amber',
};

const STROKE: Record<KpiTone, string> = {
  primary: 'oklch(62% 0.18 285)',
  cyan: 'oklch(70% 0.13 230)',
  rose: 'oklch(68% 0.18 20)',
  emerald: 'oklch(68% 0.15 155)',
  violet: 'oklch(66% 0.16 300)',
  amber: 'oklch(75% 0.15 70)',
};

interface KpiTileProps {
  label: string;
  value: number;
  data: number[];
  tone: KpiTone;
  icon: React.ReactNode;
  area: string;
}

function pickTrend(data: number[]) {
  if (data.length < 2) return { trend: 'flat' as const, delta: 0 };
  const half = Math.max(1, Math.floor(data.length / 2));
  const recent = data.slice(-half).reduce((a, b) => a + b, 0);
  const prev = data.slice(0, -half).reduce((a, b) => a + b, 0);
  if (prev === 0) return { trend: (recent > 0 ? 'up' : 'flat') as 'up' | 'flat', delta: recent > 0 ? 100 : 0 };
  const d = ((recent - prev) / prev) * 100;
  const trend = Math.abs(d) < 1 ? 'flat' : d > 0 ? 'up' : 'down';
  return { trend: trend as 'up' | 'down' | 'flat', delta: d };
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
