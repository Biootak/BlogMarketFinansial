'use client';

/**
 * ExchangeRateTableWrapper — toggles between table & card view.
 *
 * Design intent:
 * - Linear-style segmented toggle (no gradient pill, no layoutId animation).
 * - Table is the default; card view falls back to small grids.
 *
 * 2026-07-05: simplified wrapper, view-toggle now uses mt-tabs utility.
 */

import { useState } from 'react';
import type { ExchangeRateData } from '@/types/types';
import { ExchangeRateTableView } from './ExchangeRateTableView';
import { Table2, LayoutGrid } from 'lucide-react';

interface Props {
  exchangeRates: ExchangeRateData[];
}

export function ExchangeRateTableWrapper({ exchangeRates }: Props) {
  const [view, setView] = useState<'table' | 'card'>('table');

  if (view === 'card') {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="mt-tabs">
            <button
              type="button"
              onClick={() => setView('table')}
              className="mt-tab"
            >
              <Table2 className="w-3.5 h-3.5 inline-block ml-1" />
              جدول
            </button>
            <button
              type="button"
              onClick={() => setView('card')}
              aria-current="true"
              className="mt-tab"
            >
              <LayoutGrid className="w-3.5 h-3.5 inline-block ml-1" />
              کارت
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {exchangeRates.map((rate) => (
            <div key={rate.id} className="mt-card">
              <div className="mt-card__header">
                <div>
                  <div className="mt-card__title">{rate.name}</div>
                </div>
                <span className="mt-card__meta">
                  {rate.currency || rate.name.slice(0, 3).toUpperCase()}
                </span>
              </div>
              <div className="mt-card__table">
                <span className="mt-card__rate-name">خرید</span>
                <span className="mt-card__rate-value mt-card__rate-value--buy">
                  {rate.buyRate ?? '—'}
                </span>
                <span></span>
                <span className="mt-card__rate-name">فروش</span>
                <span className="mt-card__rate-value mt-card__rate-value--sell">
                  {rate.sellRate ?? '—'}
                </span>
                <span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="mt-tabs">
          <button
            type="button"
            onClick={() => setView('table')}
            aria-current="true"
            className="mt-tab"
          >
            <Table2 className="w-3.5 h-3.5 inline-block ml-1" />
            جدول
          </button>
          <button
            type="button"
            onClick={() => setView('card')}
            className="mt-tab"
          >
            <LayoutGrid className="w-3.5 h-3.5 inline-block ml-1" />
            کارت
          </button>
        </div>
      </div>
      <ExchangeRateTableView exchangeRates={exchangeRates} />
    </div>
  );
}