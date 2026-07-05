'use client';

/**
 * HeroConverter — Hero + Live Currency Converter (Money Transfer 2026)
 * ----------------------------------------------------------------------------
 * The single most important section of /money-transfer. Replaces the previous
 * separate HeroSection + QuickConverter pair with one cohesive unit.
 *
 * Design intent (defended 2026-07-05):
 *  - First impression + the core tool are the SAME thing. Users landing on a
 *    money-transfer page want to convert; the calculator IS the headline.
 *  - Pattern borrowed from Wise's "Hero Interactive" + Linear's hero precision:
 *      • Desktop  → split horizontal (copy right, calculator left in RTL visual)
 *      • Mobile   → vertical stack (copy first, calculator below)
 *  - Typography follows Vercel/Linear: fluid clamp, weight 800, negative
 *    tracking, text-wrap: balance, with ONE accent word in the brand color
 *    used elsewhere in the page (the same `oklch(60% 0.15 165)` emerald used
 *    for positive deltas in mt-table__price-delta--up).
 *  - Stats strip at the bottom is **driven by real data** (count of active
 *    currencies, count of distinct codes, computed average spread). No
 *    hardcoded "50+ countries" fairy tales — every number comes from
 *    `getExchangeRates()` upstream.
 *  - Calculator chrome (glass card) sits ON the dark hero, but uses the
 *    *same* surface tokens as the rest of the page so the visual continuity
 *    is unbroken when the user scrolls down to the rates table.
 *  - No aurora blobs, no animated mesh gradients, no AI-cliché glow.
 *    One restrained spotlight + a hairline grid. Restraint ≠ boring.
 */

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeftRight,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useDirection } from '@/hooks/useDirection';

import type { ExchangeRateData } from '@/types/types';

interface HeroConverterProps {
  rates: ExchangeRateData[];
}

interface Pair {
  id: string;
  code: string;
  name: string;
  buy: number;
  sell: number;
}

/** Normalize Persian/Arabic digits then parse the first valid number. */
function parseNumeric(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return Number.NaN;
  const map: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  const normalized = String(raw)
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^\d.-]/g, '');
  return parseFloat(normalized);
}

function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatRelative(parts: Intl.RelativeTimeFormatUnit, value: number): string {
  const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
  return rtf.format(value, parts);
}

function pickPairs(rates: ExchangeRateData[]): Pair[] {
  return rates
    .filter((r) => r.rateType === 'BUY_SELL')
    .map((r) => {
      const buy = parseNumeric(r.buyRate);
      const sell = parseNumeric(r.sellRate);
      const code = (r.currency ?? '').toUpperCase().trim() ||
        r.name.slice(0, 3).toUpperCase();
      return { id: r.id, code, name: r.name, buy, sell };
    })
    .filter((p) =>
      Number.isFinite(p.buy) &&
      Number.isFinite(p.sell) &&
      p.buy > 0 &&
      p.sell > 0);
}

interface Stats {
  activeCurrencies: number;
  countryCount: number;
  avgSpreadPct: number;
  freshness: string;
}

function computeStats(rates: ExchangeRateData[], now: Date): Stats {
  const pairs = pickPairs(rates);
  // Distinct currency codes — proxy for "countries" since the data is keyed
  // on currency, not country. Honest and matches the data model.
  const countryCount = new Set(pairs.map((p) => p.code)).size;

  // Average spread: |sell - buy| / mid. Lower is better for the user.
  let totalSpread = 0;
  let spreadSamples = 0;
  for (const p of pairs) {
    const mid = (p.buy + p.sell) / 2;
    if (mid > 0) {
      totalSpread += Math.abs(p.sell - p.buy) / mid;
      spreadSamples += 1;
    }
  }
  const avgSpreadPct = spreadSamples > 0
    ? (totalSpread / spreadSamples) * 100
    : 0;

  // Freshness — relative to the most recent record's updatedAt.
  let freshness = 'همین الآن';
  if (rates.length > 0) {
    const latest = rates
      .map((r) => new Date(r.updatedAt).getTime())
      .reduce((a, b) => Math.max(a, b), 0);
    if (Number.isFinite(latest)) {
      const diffMs = Math.max(0, now.getTime() - latest);
      const mins = Math.floor(diffMs / 60_000);
      freshness = mins < 1
        ? 'همین الآن'
        : mins < 60
          ? formatRelative('minute', -mins)
          : formatRelative('hour', -Math.floor(mins / 60));
    }
  }

  return {
    activeCurrencies: pairs.length,
    countryCount,
    avgSpreadPct,
    freshness,
  };
}

export default function HeroConverter({ rates }: HeroConverterProps) {
  const dir = useDirection('rtl');

  // Pairs list (sorted by code for predictable select order)
  const pairs = useMemo(() => {
    return pickPairs(rates).sort((a, b) => a.code.localeCompare(b.code));
  }, [rates]);

  // Stats — recomputed on render. Cheap (linear scan over ~20 rows).
  const stats = useMemo(() => computeStats(rates, new Date()), [rates]);

  // Form state
  const [fromId, setFromId] = useState<string>(() => pairs[0]?.id ?? '');
  const [toId, setToId] = useState<string>(() => pairs[1]?.id ?? pairs[0]?.id ?? '');
  const [amount, setAmount] = useState<string>('1000');

  const fromPair = pairs.find((p) => p.id === fromId);
  const toPair = pairs.find((p) => p.id === toId);

  // Cross-currency rate via IRT (rial) as the pivot. Both pairs carry IRT
  // mid-market, so this matches the persisted semantics exactly.
  const rate = useMemo(() => {
    if (!fromPair || !toPair) return Number.NaN;
    if (fromPair.id === toPair.id) return 1;
    return fromPair.sell / toPair.sell;
  }, [fromPair, toPair]);

  const numericAmount = parseFloat(amount);
  const converted = Number.isFinite(numericAmount) && Number.isFinite(rate)
    ? numericAmount * rate
    : Number.NaN;

  // Inverse rate for the secondary chip ("1 TO = X FROM")
  const inverseRate = Number.isFinite(rate) && rate !== 0 ? 1 / rate : Number.NaN;

  const handleSwap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Hand off to the contact section, carrying the conversion intent.
    const target = document.getElementById('contact');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hasRates = pairs.length >= 2;

  return (
    <section
      dir={dir}
      aria-labelledby="hero-converter-title"
      className="mt-hero"
    >
      {/* Subtle surface treatment: hairline grid + single top spotlight.
          No aurora, no glow, no animated gradients — restraint. */}
      <div className="mt-hero__grid" aria-hidden />
      <div className="mt-hero__spotlight" aria-hidden />

      <div className="container-wide relative z-10 px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4 lg:px-6 lg:pt-5 lg:pb-5">
        <div className="mt-hero__inner">
          {/* ----- LEFT/RIGHT SPLIT (in RTL: copy starts visually on the right) ----- */}
          <div className="mt-hero__copy">
            {/* Live indicator — single source of truth for "data is fresh" */}
            <div className="mt-hero__live">
              <span className="mt-hero__live-dot" aria-hidden />
              <span>صرافی آنلاین — نرخ‌های زنده</span>
            </div>

            {/* Headline */}
            <h1 id="hero-converter-title" className="mt-hero__title">
              انتقال ارز،{' '}
              <span className="mt-hero__title-accent">ساده و مطمئن</span>
            </h1>

            {/* Lead */}
            <p className="mt-hero__lead">
              نرخ‌های رقابتی، تسویه سریع، و پشتیبانی واقعی.
              حواله ارزی به بیش از {stats.countryCount} ارز، بدون پیچیدگی.
            </p>

            {/* Stats strip — values driven by real data above */}
            <dl className="mt-hero__stats" aria-label="شاخص‌های کلیدی">
              <div className="mt-hero__stat">
                <dt className="mt-hero__stat-label">ارز فعال</dt>
                <dd className="mt-hero__stat-num">
                  {formatNumber(stats.activeCurrencies)}
                </dd>
              </div>
              <div className="mt-hero__stat">
                <dt className="mt-hero__stat-label">کد ارزی</dt>
                <dd className="mt-hero__stat-num">
                  {formatNumber(stats.countryCount)}
                </dd>
              </div>
              <div className="mt-hero__stat">
                <dt className="mt-hero__stat-label">میانگین اسپرد</dt>
                <dd className="mt-hero__stat-num">
                  {formatNumber(stats.avgSpreadPct, 2)}
                  <span className="mt-hero__stat-num-suffix">٪</span>
                </dd>
              </div>
              <div className="mt-hero__stat">
                <dt className="mt-hero__stat-label">به‌روزرسانی</dt>
                <dd className="mt-hero__stat-num mt-hero__stat-num--text">
                  <span className="mt-hero__stat-num-dot" aria-hidden />
                  {stats.freshness}
                </dd>
              </div>
            </dl>

            {/* CTAs */}
            <div className="mt-hero__ctas">
              <a href="#rates" className="mt-hero__cta mt-hero__cta--primary">
                <span>مشاهده نرخ‌ها</span>
                <ArrowDown className="size-4" aria-hidden />
              </a>
              <a
                href="#contact"
                className="mt-hero__cta mt-hero__cta--ghost"
              >
                <Sparkles className="size-4" aria-hidden />
                <span>ثبت درخواست</span>
              </a>
            </div>
          </div>

          {/* ----- CALCULATOR (the product, front-and-center) ----- */}
          <div className="mt-hero__calculator-slot">
            {hasRates ? (
              <form
                onSubmit={handleSubmit}
                className="mt-calc"
                aria-label="مبدل ارز"
              >
                <div className="mt-calc__head">
                  <span className="mt-calc__head-icon" aria-hidden>
                    <TrendingUp className="size-3.5" />
                  </span>
                  <span className="mt-calc__head-title">مبدل زنده</span>
                  <span className="mt-calc__head-meta">
                    بر اساس نرخ فروش امروز
                  </span>
                </div>

                <div className="mt-calc__grid">
                  {/* FROM */}
                  <label className="mt-calc__field">
                    <span className="mt-calc__field-label">می‌فرستم</span>
                    <div className="mt-calc__field-row">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="مبلغ"
                        className="mt-calc__amount"
                        aria-label="مبلغ مبدا"
                      />
                      <CurrencyPicker
                        value={fromId}
                        pairs={pairs}
                        onChange={setFromId}
                        ariaLabel="ارز مبدا"
                      />
                    </div>
                  </label>

                  {/* SWAP */}
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="mt-calc__swap"
                    aria-label="جابجایی ارزها"
                  >
                    <ArrowLeftRight className="size-4" />
                  </button>

                  {/* TO */}
                  <label className="mt-calc__field">
                    <span className="mt-calc__field-label">دریافت می‌کنم</span>
                    <div className="mt-calc__field-row">
                      <input
                        type="text"
                        readOnly
                        value={
                          Number.isFinite(converted)
                            ? formatNumber(converted, 2)
                            : '—'
                        }
                        className="mt-calc__amount mt-calc__amount--readonly"
                        aria-label="مبلغ مقصد"
                      />
                      <CurrencyPicker
                        value={toId}
                        pairs={pairs}
                        onChange={setToId}
                        ariaLabel="ارز مقصد"
                      />
                    </div>
                  </label>
                </div>

                {/* Rate chips — one per direction, the way brokers think. */}
                <div className="mt-calc__rates">
                  <span className="mt-calc__rate">
                    ۱ {fromPair?.code ?? '—'}
                    <span className="mt-calc__rate-eq"> = </span>
                    <strong>
                      {Number.isFinite(rate)
                        ? formatNumber(rate, 4)
                        : '—'}
                    </strong>
                    {' '}
                    {toPair?.code ?? '—'}
                  </span>
                  <span className="mt-calc__rate" aria-hidden>
                    <span className="mt-calc__rate-sep" />
                  </span>
                  <span className="mt-calc__rate">
                    ۱ {toPair?.code ?? '—'}
                    <span className="mt-calc__rate-eq"> = </span>
                    <strong>
                      {Number.isFinite(inverseRate)
                        ? formatNumber(inverseRate, 4)
                        : '—'}
                    </strong>
                    {' '}
                    {fromPair?.code ?? '—'}
                  </span>
                </div>

                {/* CTA */}
                <button type="submit" className="mt-calc__cta">
                  <Send className="size-4" />
                  <span>تبدیل و ثبت درخواست</span>
                </button>
              </form>
            ) : (
              <div className="mt-calc mt-calc--empty">
                <p className="mt-calc__loading">
                  مبدل ارز منتظر دریافت نرخ‌های زنده است…
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CurrencyPicker — native <select> styled to match the calculator.
// We stick with <select> for accessibility (keyboard + screen reader) and
// mobile-native picker (better iOS/Android UX than a custom dropdown when
// the list is small and well-known).
// ---------------------------------------------------------------------------
interface CurrencyPickerProps {
  value: string;
  pairs: Pair[];
  onChange: (next: string) => void;
  ariaLabel: string;
}

function CurrencyPicker({ value, pairs, onChange, ariaLabel }: CurrencyPickerProps) {
  return (
    <div className="mt-calc__picker">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-calc__picker-select"
        aria-label={ariaLabel}
      >
        {pairs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} · {p.name}
          </option>
        ))}
      </select>
      <span className="mt-calc__picker-flag" aria-hidden>
        {value ? (pairs.find((p) => p.id === value)?.code ?? '•••').slice(0, 3) : '•••'}
      </span>
    </div>
  );
}
