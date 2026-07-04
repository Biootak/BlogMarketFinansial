'use client';

/**
 * EditorialMarket — compact market-rates list.
 *
 * Shows 4 key symbols with value + percent delta. Tone comes only from
 * the trend pill (emerald up, rose down, slate flat). No gradient pills,
 * no rainbow icons.
 */

import { cn } from '@/lib/utils';
import { formatWithUnit, formatChangePercent } from '@/lib/market-rates/format';
import type { MarketRateItem } from '@/lib/market-rates';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlinePresentationChartLine,
} from 'react-icons/hi2';

const DISPLAY_SYMBOLS = ['IRAN_USD', 'IRAN_EUR', 'IRAN_GOLD_18K', 'IRAN_COIN_EMAMI'] as const;

type Trend = 'up' | 'down' | 'flat';

function getTrend(changePercent: number): Trend {
  if (Math.abs(changePercent) < 0.01) return 'flat';
  return changePercent > 0 ? 'up' : 'down';
}

interface EditorialMarketProps {
  rates: MarketRateItem[];
}

export default function EditorialMarket({ rates }: EditorialMarketProps) {
  const displayRates = useMemo(() => {
    const bySymbol = new Map(rates.map((r) => [r.symbol, r]));
    return DISPLAY_SYMBOLS.map((sym) => bySymbol.get(sym)).filter(
      (r): r is MarketRateItem => r !== undefined,
    );
  }, [rates]);

  return (
    <section className="ec-tile ec-market" aria-label="نبض بازار">
      <header className="ec-head">
        <div className="ec-head__title">
          <span className="ec-head__ico" aria-hidden>
            <HiOutlinePresentationChartLine className="w-3.5 h-3.5" />
          </span>
          <div className="ec-head__text">
            <h2 className="ec-head__title-text">نبض بازار</h2>
            <p className="ec-head__sub">نرخ‌های کلیدی</p>
          </div>
        </div>
        <Link href="/dashboard/exchange-rates" className="ec-head__more">
          <span>همه</span>
          <HiOutlineArrowLeft className="w-3 h-3" aria-hidden />
        </Link>
      </header>

      {displayRates.length === 0 ? (
        <p className="ec-posts__empty">داده‌ای در دسترس نیست.</p>
      ) : (
        <ul className="ec-market__list">
          {displayRates.map((r) => {
            const trend = getTrend(r.changePercent);
            return (
              <li key={r.symbol} className="ec-rate">
                <span className="ec-rate__name">
                  {r.displayNameFa}
                  <span className="ec-rate__name-sub">{r.unit ?? ''}</span>
                </span>
                <span className="ec-rate__value" dir="ltr">
                  {formatWithUnit(r.value, r.unit, r.decimals)}
                </span>
                <span className={cn('ec-rate__delta', `ec-rate__delta--${trend}`)}>
                  {formatChangePercent(r.changePercent)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
