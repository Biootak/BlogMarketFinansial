'use client';

/**
 * AtelierMarket — compact market-rates grid.
 *
 * Renders 4 key symbols in a 2x2 grid: USD, EUR, gold 18K, coin
 * Emami. Each cell shows the display name, value, and a delta pill
 * (emerald / rose / slate). The first cell (#1) is highlighted with
 * a thin gold accent border to give the row a "lead" feel.
 */

import { cn } from '@/lib/utils';
import { formatWithUnit, formatChangePercent } from '@/lib/market-rates/format';
import type { MarketRateItem } from '@/lib/market-rates';
import Link from 'next/link';
import { useMemo } from 'react';
import { HiOutlineArrowLeft, HiOutlinePresentationChartLine } from 'react-icons/hi2';

const DISPLAY_SYMBOLS = ['IRAN_USD', 'IRAN_EUR', 'IRAN_GOLD_18K', 'IRAN_COIN_EMAMI'] as const;

type Trend = 'up' | 'down' | 'flat';

function getTrend(changePercent: number): Trend {
  if (Math.abs(changePercent) < 0.01) return 'flat';
  return changePercent > 0 ? 'up' : 'down';
}

interface AtelierMarketProps {
  rates: MarketRateItem[];
}

export default function AtelierMarket({ rates }: AtelierMarketProps) {
  const displayRates = useMemo(() => {
    const bySymbol = new Map(rates.map((r) => [r.symbol, r]));
    return DISPLAY_SYMBOLS.map((sym) => bySymbol.get(sym)).filter(
      (r): r is MarketRateItem => r !== undefined,
    );
  }, [rates]);

  return (
    <section className="at-tile at-market" aria-label="نبض بازار">
      <header className="at-head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlinePresentationChartLine className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">نبض بازار</h2>
            <p className="at-head__sub">نرخ‌های کلیدی</p>
          </div>
        </div>
        <Link href="/dashboard/exchange-rates" className="at-head__more">
          <span>همه</span>
          <HiOutlineArrowLeft className="w-3 h-3" aria-hidden />
        </Link>
      </header>

      {displayRates.length === 0 ? (
        <p className="at-posts__empty">داده‌ای در دسترس نیست.</p>
      ) : (
        <div className="at-market__grid">
          {displayRates.map((r, i) => {
            const trend = getTrend(r.changePercent);
            return (
              <div
                key={r.symbol}
                className={cn('at-rate', i === 0 && 'is-lead')}
              >
                <div className="at-rate__head">
                  <span className="at-rate__name">{r.displayNameFa}</span>
                  <span className={cn('at-rate__delta', `is-${trend}`)}>
                    {formatChangePercent(r.changePercent)}
                  </span>
                </div>
                <div className="at-rate__value" dir="ltr">
                  {formatWithUnit(r.value, r.unit, r.decimals)}
                </div>
                <div className="at-rate__sub">{r.unit ?? ''}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
