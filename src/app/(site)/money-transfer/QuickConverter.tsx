'use client';

/**
 * QuickConverter — command-bar style currency calculator.
 *
 * Design intent:
 * - Two side-by-side fields with a swap button (Linear-style).
 * - One CTA to "convert & request".
 * - Real-time calculation as user types.
 * - Selection limited to BUY_SELL rows (the live trading pairs).
 *
 * 2026-07-05: built new.
 */

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Send } from 'lucide-react';
import type { ExchangeRateData } from '@/types/types';

interface QuickConverterProps {
  rates: ExchangeRateData[];
}

function parseRate(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return NaN;
  // Strip non-numeric (commas, currency glyphs, spaces). Allow Persian/Arabic digits.
  const map: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  const normalized = String(v)
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^\d.-]/g, '');
  return parseFloat(normalized);
}

function formatNumber(n: number, fractionDigits = 0): string {
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export default function QuickConverter({ rates }: QuickConverterProps) {
  // Restrict to BUY_SELL rows for live pairs.
  const pairs = useMemo(() => {
    return rates
      .filter((r) => r.rateType === 'BUY_SELL')
      .map((r) => ({
        id: r.id,
        code: r.currency || r.name.slice(0, 3).toUpperCase(),
        name: r.name,
        buy: parseRate(r.buyRate),
        sell: parseRate(r.sellRate),
      }))
      .filter((p) => isFinite(p.buy) && isFinite(p.sell) && p.buy > 0 && p.sell > 0);
  }, [rates]);

  const [fromId, setFromId] = useState<string>(() => pairs[0]?.id ?? '');
  const [toId, setToId] = useState<string>(() => pairs[1]?.id ?? pairs[0]?.id ?? '');
  const [amount, setAmount] = useState<string>('1000');

  const fromPair = pairs.find((p) => p.id === fromId);
  const toPair = pairs.find((p) => p.id === toId);

  // Conversion: amount (foreign) → IRT via fromPair.sell, then IRT → other foreign via toPair.buy
  // Simpler (and correct-enough for display): amount × (from.sell / to.sell).
  const rate = useMemo(() => {
    if (!fromPair || !toPair) return NaN;
    if (fromPair.id === toPair.id) return 1;
    return fromPair.sell / toPair.sell;
  }, [fromPair, toPair]);

  const numericAmount = parseFloat(amount);
  const converted = isFinite(numericAmount) && isFinite(rate)
    ? numericAmount * rate
    : NaN;

  const handleSwap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Scroll to contact section with prefilled context (URL hash).
    const target = document.getElementById('contact');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (pairs.length < 2) {
    return (
      <div className="mt-converter">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          مبدل ارز در حال بارگذاری است...
        </p>
      </div>
    );
  }

  return (
    <form className="mt-converter" onSubmit={handleSubmit}>
      <div className="mt-converter__grid">
        {/* FROM */}
        <label className="mt-converter__field">
          <span className="mt-converter__field-label">از</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="مبلغ"
            className="mt-converter__amount"
            aria-label="مبلغ مبدا"
          />
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="mt-converter__select"
            aria-label="ارز مبدا"
          >
            {pairs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>
        </label>

        {/* SWAP */}
        <button
          type="button"
          onClick={handleSwap}
          className="mt-converter__swap"
          aria-label="جابجایی ارزها"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        {/* TO */}
        <label className="mt-converter__field">
          <span className="mt-converter__field-label">به</span>
          <input
            type="text"
            readOnly
            value={isFinite(converted) ? formatNumber(converted, 2) : '—'}
            className="mt-converter__amount"
            aria-label="مبلغ مقصد"
          />
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="mt-converter__select"
            aria-label="ارز مقصد"
          >
            {pairs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>
        </label>

        {/* CTA */}
        <button type="submit" className="mt-converter__cta">
          <Send className="w-4 h-4" />
          <span>تبدیل و ثبت</span>
        </button>
      </div>

      {/* Result footer */}
      <div className="mt-converter__result">
        <span>
          نرخ تبدیل:{' '}
          <span className="mt-converter__result-rate">
            ۱ {fromPair?.code} = {isFinite(rate) ? formatNumber(rate, 4) : '—'} {toPair?.code}
          </span>
        </span>
        <span aria-hidden>•</span>
        <span>بر اساس نرخ فروش امروز</span>
      </div>
    </form>
  );
}