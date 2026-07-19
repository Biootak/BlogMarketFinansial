'use client';

/**
 * LiveTicker — Linear-inspired horizontal ticker of currency pairs.
 *
 * Design intent:
 *  - One row, infinite horizontal scroll, RTL-aware.
 *  - Edge fade masks for soft edges.
 *  - Numbers in monospace tabular-nums (Linear precision).
 *  - واحد هر ارز از MarketRateItem.unit (تومان/دلار/افغانی/...) نمایش داده می‌شود.
 *  - changePercent واقعی از TGJU (نه spread محاسبه‌شده مصنوعی).
 *
 * 2026-07: rewritten to use MarketRateItem directly — same source as
 * MarketRatesTicker (dashboard). Unit label now comes from the registry
 * (toman/usd/afn/eur) instead of a hardcoded "/IRT".
 */

import type { MarketRateItem } from '@/lib/market-rates';
import { UNIT_LABELS, formatChangePercent, formatValueOnly, formatWithUnit } from '@/lib/market-rates/format';
import { formatFreshness } from '@/lib/money-transfer/hero';
import { useEffect, useState } from 'react';

interface LiveTickerProps {
  rates: MarketRateItem[];
  /** ISO timestamp of the latest rate source. null = unknown. */
  freshnessAnchorISO?: string | null;
}

export default function LiveTicker({ rates, freshnessAnchorISO }: LiveTickerProps) {
  // فقط آیتم‌های معتبر
  const items = rates.filter((r) => Number.isFinite(r.value) && r.value > 0);

  // Freshness computed client-side to avoid hydration mismatch.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const freshness = isMounted
    ? formatFreshness(freshnessAnchorISO ? new Date(freshnessAnchorISO) : null, new Date())
    : '';

  // Duplicate items for seamless CSS loop (animation translates -50%)
  const looped = items.length > 0 ? [...items, ...items] : [];

  return (
    <section className="mt-ticker" aria-label="نرخ‌های لحظه‌ای ارز">
      {/* label — ثابت، z-index بالاتر از track */}
      <span className="mt-ticker__label">
        <span className="mt-ticker__label-dot" aria-hidden />
        <span>نرخ زنده</span>
        {freshness && <span>· به‌روزرسانی {freshness}</span>}
      </span>

      {/* wrapper overflow:hidden تا track از لبه‌ها بیرون نزند */}
      <div className="mt-ticker__scroll-area">
        {looped.length === 0 ? (
          <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
            نرخ‌ها در حال بارگذاری...
          </div>
        ) : (
          <div className="mt-ticker__track">
            {looped.map((rate, i) => {
              const isUp = rate.changePercent >= 0;
              const changeFmt = formatChangePercent(rate.changePercent);
              return (
                <div
                  className="mt-ticker__item"
                  key={`${rate.symbol}-${i}`}
                  aria-label={`${rate.displayNameFa} ${formatWithUnit(rate.value, rate.unit, rate.decimals)}`}
                >
                  <span className="mt-ticker__pair">{rate.displayNameFa}</span>
                  <span className="mt-ticker__rate" dir="ltr" style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.15em' }}>
                    <span style={{ fontSize: '0.85em', opacity: 0.75 }}>{UNIT_LABELS[rate.unit]}</span>
                    <span>{formatValueOnly(rate.value, rate.decimals)}</span>
                  </span>
                  <span
                    className={`mt-ticker__delta${isUp ? '' : ' mt-ticker__delta--down'}`}
                    aria-label={`تغییر ${changeFmt}`}
                    dir="ltr"
                  >
                    {changeFmt}
                  </span>
                  <span className="mt-ticker__sep" aria-hidden />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
