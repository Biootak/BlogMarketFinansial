'use client';

/**
 * AtelierMarket — compact market-rates grid (top 4 by priority).
 *
 * نمایش ۴ نرخ کلیدی در گرید ۲×۲. منبع داده همان `MarketRateItem[]`
 * است که در سایر بخش‌های داشبورد (نوار بالا) و صفحه‌ی اصلی استفاده
 * می‌شود — single source of truth از طریق `getMarketRates()`.
 *
 * اولویت نمایش:
 *  1. نرخ‌های ضروری (USD، EUR، طلای ۱۸ عیار، سکه‌ی امامی) در صورت موجود بودن
 *  2. سپس بقیه‌ی نرخ‌ها به ترتیب priority (که در registry تنظیم شده)
 *
 * سلول اول (#1) با یک border طلایی نازک به عنوان «lead» برجسته می‌شود
 * تا یک نقطه‌ی کانونی در ردیف ایجاد شود.
 */

import type { MarketRateItem } from '@/lib/market-rates';
import { formatChangePercent, formatWithUnit } from '@/lib/market-rates/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useMemo } from 'react';
import { HiOutlineArrowLeft, HiOutlinePresentationChartLine } from 'react-icons/hi2';

const PRIORITY_SYMBOLS = ['IRAN_USD', 'IRAN_EUR', 'IRAN_GOLD_18K', 'IRAN_COIN_EMAMI'] as const;

type Trend = 'up' | 'down' | 'flat';

function getTrend(changePercent: number): Trend {
  if (!Number.isFinite(changePercent) || Math.abs(changePercent) < 0.01) return 'flat';
  return changePercent > 0 ? 'up' : 'down';
}

interface AtelierMarketProps {
  rates: MarketRateItem[];
}

export default function AtelierMarket({ rates }: AtelierMarketProps) {
  // اول نرخ‌های ضروری، بعد بقیه به ترتیب priority (که assembler تضمین می‌کند).
  const displayRates = useMemo<MarketRateItem[]>(() => {
    const bySymbol = new Map(rates.map((r) => [r.symbol, r]));
    const priority = PRIORITY_SYMBOLS.map((sym) => bySymbol.get(sym)).filter(
      (r): r is MarketRateItem => r !== undefined,
    );
    const rest = rates.filter((r) => !PRIORITY_SYMBOLS.includes(r.symbol as never));
    return [...priority, ...rest].slice(0, 4);
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
        <output className="at-posts__empty" aria-live="polite">
          <p>داده‌ای در دسترس نیست.</p>
          <p className="at-market__empty-hint">
            <Link href="/dashboard/exchange-rates" className="at-head__more">
              تنظیم نرخ‌ها
              <HiOutlineArrowLeft className="w-3 h-3" aria-hidden />
            </Link>
          </p>
        </output>
      ) : (
        <div className="at-market__grid">
          {displayRates.map((r, i) => {
            const trend = getTrend(r.changePercent);
            return (
              <div key={r.symbol} className={cn('at-rate', i === 0 && 'is-lead')}>
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
