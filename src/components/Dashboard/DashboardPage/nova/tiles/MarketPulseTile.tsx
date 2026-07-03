'use client';

/**
 * MarketPulseTile — NOVA market-rates tile.
 *
 * Replaces the TIDE horizontal marquee ticker with a vertical, scannable
 * bento tile: one row per instrument (dollar, euro, gold, coin) with value
 * and trend delta. Bento-native — the eye can compare rows at a glance
 * instead of chasing a moving ribbon.
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineChevronLeft,
  HiOutlineMinus,
  HiOutlinePresentationChartLine,
} from 'react-icons/hi2';

type Trend = 'up' | 'down' | 'flat';

interface Rate {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
}

const RATES: Rate[] = [
  { label: 'دلار', value: '۶۹۲,۰۰۰', delta: '+۰.۴٪', trend: 'up' },
  { label: 'یورو', value: '۷۴۸,۰۰۰', delta: '−۰.۲٪', trend: 'down' },
  { label: 'طلای ۱۸', value: '۴,۲۵۰,۰۰۰', delta: '+۱.۱٪', trend: 'up' },
  { label: 'سکهٔ امامی', value: '۴۲,۸۰۰,۰۰۰', delta: '۰.۰٪', trend: 'flat' },
];

const ICON: Record<Trend, React.ReactNode> = {
  up: <HiOutlineArrowUpRight className="w-3.5 h-3.5" />,
  down: <HiOutlineArrowDownRight className="w-3.5 h-3.5" />,
  flat: <HiOutlineMinus className="w-3.5 h-3.5" />,
};

export default function MarketPulseTile() {
  return (
    <section className="nova-tile nova-tile--pulse" data-tone="emerald" aria-label="نبض بازار">
      <Spotlight tone="emerald" size={280} />
      <header className="nova-panel__head nova-panel__head--tight">
        <div className="nova-panel__head-title">
          <span className="nova-panel__head-ico" aria-hidden>
            <HiOutlinePresentationChartLine className="w-4 h-4" />
          </span>
          <h2 className="nova-panel__title">نبض بازار</h2>
        </div>
        <Link href="/dashboard/exchange-rates" className="nova-pulse__more">
          <span>همه</span>
          <HiOutlineChevronLeft className="w-3.5 h-3.5" />
        </Link>
      </header>

      <ul className="nova-pulse__list">
        {RATES.map((r) => (
          <li key={r.label} className="nova-pulse__row">
            <span className="nova-pulse__label">{r.label}</span>
            <span className="nova-pulse__value tabular-nums" dir="ltr">
              {r.value}
            </span>
            <span className={cn('nova-pulse__delta', `is-${r.trend}`)}>
              {ICON[r.trend]}
              <span className="tabular-nums">{r.delta}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
