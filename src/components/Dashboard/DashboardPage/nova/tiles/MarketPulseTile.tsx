'use client';

/**
 * MarketPulseTile — NOVA market-rates tile (v2: real data).
 *
 * Displays four key market rates (dollar, euro, gold, coin) with live
 * values from `getMarketRates()`. No more hardcoded placeholders.
 */

import { cn } from '@/lib/utils';
import { formatWithUnit, formatChangePercent } from '@/lib/market-rates/format';
import type { MarketRateItem } from '@/lib/market-rates';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  HiOutlineArrowDownRight,
  HiOutlineArrowUpRight,
  HiOutlineChevronLeft,
  HiOutlineMinus,
  HiOutlinePresentationChartLine,
} from 'react-icons/hi2';

/** The four symbols we display in the dashboard tile. */
const DISPLAY_SYMBOLS = ['IRAN_USD', 'IRAN_EUR', 'IRAN_GOLD_18K', 'IRAN_COIN_EMAMI'] as const;

type Trend = 'up' | 'down' | 'flat';

function getTrend(changePercent: number): Trend {
  if (Math.abs(changePercent) < 0.01) return 'flat';
  return changePercent > 0 ? 'up' : 'down';
}

const TREND_ICON: Record<Trend, React.ReactNode> = {
  up: <HiOutlineArrowUpRight className="w-3.5 h-3.5" />,
  down: <HiOutlineArrowDownRight className="w-3.5 h-3.5" />,
  flat: <HiOutlineMinus className="w-3.5 h-3.5" />,
};

interface MarketPulseTileProps {
  rates: MarketRateItem[];
}

export default function MarketPulseTile({ rates }: MarketPulseTileProps) {
  const displayRates = useMemo(() => {
    const bySymbol = new Map(rates.map((r) => [r.symbol, r]));
    return DISPLAY_SYMBOLS.map((sym) => bySymbol.get(sym)).filter(
      (r): r is MarketRateItem => r !== undefined,
    );
  }, [rates]);

  return (
    <section className="nova-tile nova-tile--pulse" data-tone="emerald" aria-label="نبض بازار">
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

      {displayRates.length === 0 ? (
        <p className="nova-pulse__empty">داده‌ای در دسترس نیست.</p>
      ) : (
        <ul className="nova-pulse__list">
          {displayRates.map((r) => {
            const trend = getTrend(r.changePercent);
            return (
              <li key={r.symbol} className="nova-pulse__row">
                <span className="nova-pulse__label">{r.displayNameFa}</span>
                <span className="nova-pulse__value tabular-nums" dir="ltr">
                  {formatWithUnit(r.value, r.unit, r.decimals)}
                </span>
                <span className={cn('nova-pulse__delta', `is-${trend}`)}>
                  {TREND_ICON[trend]}
                  <span className="tabular-nums">{formatChangePercent(r.changePercent)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
