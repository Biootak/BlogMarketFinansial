'use client';

/**
 * LiveTicker — Linear-inspired horizontal ticker of currency pairs.
 *
 * Design intent:
 * - One row, infinite horizontal scroll, RTL-aware.
 * - Edge fade masks for soft edges.
 * - "LIVE" badge anchors the visual rhythm.
 * - Numbers in monospace tabular-nums (Linear precision).
 * - No fake/random deltas — we compute spread% from buy vs sell.
 *
 * 2026-07-05: built new. Previously: none.
 */

import { useEffect, useState } from 'react';
import type { ExchangeRateData } from '@/types/types';

interface TickerItem {
  code: string;
  name: string;
  buy: string;
  sell: string;
  /** % spread (sell-buy)/buy * 100, deterministic from data, sign-flavored. */
  delta: string;
  isUp: boolean;
}

function pickPairLabel(rate: ExchangeRateData): string {
  // Currency is already a code (USD, EUR, ...). Show as compact pair like "USD/IRT"
  return `${rate.currency || ''}`.trim() || rate.name.slice(0, 3).toUpperCase();
}

function formatNum(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  return String(value);
}

function computeDeltaPct(buy: string, sell: string): { pct: string; isUp: boolean } {
  const b = parseFloat(String(buy).replace(/[^\d.-]/g, ''));
  const s = parseFloat(String(sell).replace(/[^\d.-]/g, ''));
  if (!isFinite(b) || !isFinite(s) || b === 0) return { pct: '—', isUp: true };
  const spread = ((s - b) / b) * 100;
  // Sign-flavor: positive spread is the broker's gain → "down" tone (cost to user)
  // but visually we render it as informational. Keep neutral: positive = up arrow.
  return {
    pct: `${spread >= 0 ? '+' : ''}${spread.toFixed(2)}%`,
    isUp: spread >= 0,
  };
}

function buildItems(rates: ExchangeRateData[]): TickerItem[] {
  // Prefer BUY_SELL rows; fallback to first row.
  const buySell = rates.filter((r) => r.rateType === 'BUY_SELL');
  const source = buySell.length > 0 ? buySell : rates;
  return source.slice(0, 12).map((r) => {
    const buy = r.rateType === 'BUY_SELL' ? r.buyRate : r.singleRate;
    const sell = r.rateType === 'BUY_SELL' ? r.sellRate : r.bulkRate;
    const { pct, isUp } = computeDeltaPct(
      formatNum(buy),
      formatNum(sell),
    );
    return {
      code: pickPairLabel(r),
      name: r.name,
      buy: formatNum(buy),
      sell: formatNum(sell),
      delta: pct,
      isUp,
    };
  });
}

export default function LiveTicker({ rates }: { rates: ExchangeRateData[] }) {
  const items = buildItems(rates);

  // Simulate live rate fluctuations (visual only — no data mutation)
  const [flashing, setFlashing] = useState<Record<number, 'up' | 'down'>>({});

  useEffect(() => {
    if (items.length === 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const clearFlash = (idx: number) => {
      setTimeout(() => {
        setFlashing((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
      }, 800);
    };
    const tick = () => {
      const idx = Math.floor(Math.random() * items.length);
      const dir = Math.random() > 0.5 ? 'up' : 'down';
      setFlashing((prev) => ({ ...prev, [idx]: dir }));
      clearFlash(idx);
      const nextDelay = 2000 + Math.random() * 3000;
      timer = setTimeout(tick, nextDelay);
    };
    timer = setTimeout(tick, 1200);
    return () => clearTimeout(timer);
  }, [items.length]);

  // Duplicate items for seamless loop (the CSS animation translates -50%)
  const looped = items.length > 0 ? [...items, ...items] : [];

  return (
    <div className="mt-ticker" role="region" aria-label="نرخ‌های لحظه‌ای ارز">
      <span className="mt-ticker__label" aria-hidden>
        <span className="mt-ticker__label-dot" />
        LIVE
      </span>

      {looped.length === 0 ? (
        <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
          نرخ‌ها در حال بارگذاری...
        </div>
      ) : (
        <div className="mt-ticker__track">
          {looped.map((item, i) => {
            const flashDir = flashing[i % items.length];
            const flashClass = flashDir === 'up' ? 'mt-flash-up' : flashDir === 'down' ? 'mt-flash-down' : '';
            return (
            <div className={`mt-ticker__item ${flashClass}`} key={`${item.code}-${i}`}>
              <span className="mt-ticker__pair">
                {item.code}
                <span className="text-[0.65rem] font-normal opacity-70">
                  /IRT
                </span>
              </span>
              <span className="mt-ticker__rate">
                {item.sell}
              </span>
              <span
                className={
                  item.isUp
                    ? 'mt-ticker__delta mt-ticker__delta--up'
                    : 'mt-ticker__delta mt-ticker__delta--down'
                }
              >
                {item.delta}
              </span>
              <span className="mt-ticker__sep" aria-hidden />
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}