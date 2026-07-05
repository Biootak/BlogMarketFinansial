'use client';

/**
 * ExchangeRateTableView — Linear-style precise rate display.
 *
 * Design intent:
 * - Grid layout (not native <table>) — cleaner responsive behavior in RTL.
 * - Monospace tabular-nums for all numbers (Linear precision).
 * - Sticky header row, subtle hover state, status dot per row.
 * - Spread% computed from buy/sell — deterministic, no fake deltas.
 * - Compact on mobile, full grid on desktop.
 *
 * 2026-07-05: rewritten from old blue-gradient table.
 */

import { useState } from 'react';
import type { ExchangeRateData } from '@/types/types';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

interface Props {
  exchangeRates: ExchangeRateData[];
}

function formatRate(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return String(v);
}

function computeSpread(
  buy: string | null,
  sell: string | null,
): { pct: string; isUp: boolean } {
  const b = parseFloat(String(buy ?? '').replace(/[^\d.-]/g, ''));
  const s = parseFloat(String(sell ?? '').replace(/[^\d.-]/g, ''));
  if (!isFinite(b) || !isFinite(s) || b === 0) return { pct: '—', isUp: true };
  const spread = ((s - b) / b) * 100;
  return {
    pct: `${spread >= 0 ? '+' : ''}${spread.toFixed(2)}%`,
    isUp: spread >= 0,
  };
}

export function ExchangeRateTableView({ exchangeRates }: Props) {
  const [tab, setTab] = useState<'buySell' | 'singleBulk'>('buySell');

  const buySell = exchangeRates.filter((r) => r.rateType === 'BUY_SELL');
  const singleBulk = exchangeRates.filter((r) => r.rateType !== 'BUY_SELL');
  const rates = tab === 'buySell' ? buySell : singleBulk;
  const title = tab === 'buySell' ? 'نرخ خرید و فروش' : 'نرخ پرچون و عمده';
  const firstColLabel = tab === 'buySell' ? 'خرید' : 'پرچون';
  const secondColLabel = tab === 'buySell' ? 'فروش' : 'عمده';

  if (rates.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        نرخی برای نمایش موجود نیست.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs (Linear-style segmented) */}
      {(buySell.length > 0 && singleBulk.length > 0) && (
        <div className="flex justify-center">
          <div className="mt-tabs">
            <button
              type="button"
              onClick={() => setTab('buySell')}
              aria-current={tab === 'buySell'}
              className="mt-tab"
            >
              خرید و فروش
            </button>
            <button
              type="button"
              onClick={() => setTab('singleBulk')}
              aria-current={tab === 'singleBulk'}
              className="mt-tab"
            >
              پرچون و عمده
            </button>
          </div>
        </div>
      )}

      {/* Title strip */}
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {rates.length} مورد
        </span>
      </div>

      {/* Table container */}
      <div className="mt-table">
        {/* Header row */}
        <div className="mt-table__header">
          <div className="mt-table__header-row">
            <div className="mt-table__head">
              <span>ارز</span>
            </div>
            <div className="mt-table__head mt-table__head--num">
              <span className="mt-table__pair-label">{firstColLabel}</span>
              <span>{firstColLabel}</span>
            </div>
            <div className="mt-table__head mt-table__head--num">
              <span className="mt-table__pair-label">{secondColLabel}</span>
              <span>{secondColLabel}</span>
            </div>
            <div className="mt-table__head mt-table__head--num hidden md:inline-flex">
              <span>توضیحات</span>
            </div>
          </div>
        </div>

        {/* Body rows */}
        <div role="rowgroup">
          {rates.map((rate) => {
            const buy = tab === 'buySell' ? rate.buyRate : rate.singleRate;
            const sell = tab === 'buySell' ? rate.sellRate : rate.bulkRate;
            const { pct, isUp } = computeSpread(
              tab === 'buySell' ? rate.buyRate : rate.singleRate,
              tab === 'buySell' ? rate.sellRate : rate.bulkRate,
            );
            const code = rate.currency || rate.name.slice(0, 3).toUpperCase();
            const statusClass = isUp ? '' : 'mt-table__status--amber';

            return (
              <div key={rate.id} className="mt-table__row" role="row">
                {/* Currency */}
                <div className="mt-table__currency" role="cell">
                  <span
                    className="mt-table__status"
                    aria-hidden
                    title={isUp ? 'فعال' : 'نوسان'}
                  />
                  <span className="mt-table__symbol">{code.slice(0, 3)}</span>
                  <div className="mt-table__name">
                    <span className="mt-table__name-title">{rate.name}</span>
                    <span className="mt-table__name-code">{code}</span>
                  </div>
                </div>

                {/* Buy/Single */}
                <div className="mt-table__price" role="cell">
                  <span className="mt-table__price-val">
                    {formatRate(buy)}
                  </span>
                  <span
                    className={
                      isUp
                        ? 'mt-table__price-delta mt-table__price-delta--up'
                        : 'mt-table__price-delta mt-table__price-delta--down'
                    }
                  >
                    {isUp ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {pct}
                  </span>
                </div>

                {/* Sell/Bulk */}
                <div className="mt-table__price" role="cell">
                  <span className="mt-table__price-val">
                    {formatRate(sell)}
                  </span>
                  <span className="mt-table__price-delta opacity-60">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>IRT</span>
                  </span>
                </div>

                {/* Description (desktop only) */}
                <div className="mt-table__desc" role="cell">
                  {rate.description || '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}