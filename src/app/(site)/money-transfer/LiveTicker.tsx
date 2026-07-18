'use client';

/**
 * LiveTicker — Linear-inspired horizontal ticker of currency pairs.
 *
 * Design intent:
 *  - One row, infinite horizontal scroll, RTL-aware.
 *  - Edge fade masks for soft edges.
 *  - "زنده" badge anchors the visual rhythm.
 *  - Numbers in monospace tabular-nums (Linear precision).
 *  - Spread% is deterministic from buy vs sell (real, not simulated).
 *
 * 2026-07 (redesign): removed the fabricated per-row "live" flashing
 * (Math.random up/down) — it faked movement with no underlying data and
 * erodes trust. Replaced with an honest freshness label derived from the
 * real rate-source timestamp, per rate-transparency best practice.
 */

import { useEffect, useState } from 'react';
import type { ExchangeRateData } from '@/types/types';
import { formatFreshness } from '@/lib/money-transfer/hero';

interface TickerItem {
  code: string;
  name: string;
  buy: string;
  sell: string;
  /** % spread (sell-buy)/buy * 100, deterministic from data. */
  spread: string;
}

function pickPairLabel(rate: ExchangeRateData): string {
  // Currency is already a code (USD, EUR, ...). Show as compact pair like "USD/IRT"
  return `${rate.currency || ''}`.trim() || rate.name.slice(0, 3).toUpperCase();
}

function formatNum(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  return String(value);
}

function computeSpreadPct(buy: string, sell: string): string {
  const b = parseFloat(String(buy).replace(/[^\d.-]/g, ''));
  const s = parseFloat(String(sell).replace(/[^\d.-]/g, ''));
  if (!isFinite(b) || !isFinite(s) || b === 0) return '—';
  const spread = ((s - b) / b) * 100;
  return `${spread.toFixed(2)}%`;
}

function buildItems(rates: ExchangeRateData[]): TickerItem[] {
  // Prefer BUY_SELL rows; fallback to first row.
  const buySell = rates.filter((r) => r.rateType === 'BUY_SELL');
  const source = buySell.length > 0 ? buySell : rates;
  return source.slice(0, 12).map((r) => {
    const buy = r.rateType === 'BUY_SELL' ? r.buyRate : r.singleRate;
    const sell = r.rateType === 'BUY_SELL' ? r.sellRate : r.bulkRate;
    return {
      code: pickPairLabel(r),
      name: r.name,
      buy: formatNum(buy),
      sell: formatNum(sell),
      spread: computeSpreadPct(formatNum(buy), formatNum(sell)),
    };
  });
}

interface LiveTickerProps {
  rates: ExchangeRateData[];
  /** ISO timestamp of the latest rate source (snapshot/db). null = unknown. */
  freshnessAnchorISO?: string | null;
}

export default function LiveTicker({ rates, freshnessAnchorISO }: LiveTickerProps) {
  const items = buildItems(rates);

  // Freshness computed client-side (after mount) to avoid hydration mismatch.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const freshness = isMounted
    ? formatFreshness(
        freshnessAnchorISO ? new Date(freshnessAnchorISO) : null,
        new Date(),
      )
    : '';

  // Duplicate items for seamless loop (the CSS animation translates -50%)
  const looped = items.length > 0 ? [...items, ...items] : [];

  return (
    <div className="mt-ticker" role="region" aria-label="نرخ‌های لحظه‌ای ارز">
      <span className="mt-ticker__label">
        <span className="mt-ticker__label-dot" aria-hidden />
        <span>نرخ زنده</span>
        {freshness && (
          <span>· به‌روزرسانی {freshness}</span>
        )}
      </span>

      {looped.length === 0 ? (
        <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
          نرخ‌ها در حال بارگذاری...
        </div>
      ) : (
        <div className="mt-ticker__track">
          {looped.map((item, i) => (
            <div className="mt-ticker__item" key={`${item.code}-${i}`}>
              <span className="mt-ticker__pair">
                {item.code}
                <span className="text-[0.65rem] font-normal opacity-70">
                  /IRT
                </span>
              </span>
              <span className="mt-ticker__rate">{item.sell}</span>
              <span
                className="mt-ticker__delta"
                aria-label={`اسپرد ${item.spread}`}
              >
                {item.spread}
              </span>
              <span className="mt-ticker__sep" aria-hidden />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
