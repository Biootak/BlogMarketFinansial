'use client';

/**
 * RateCalculator — Wise-style "Send X, Get Y" widget.
 *
 *   • User enters an amount in the source currency.
 *   • Sees the result they would receive at the **best** available sell rate
 *     (i.e. what the user gets when selling their source to buy toman).
 *   • Shows how much they would lose at the **worst** available rate
 *     (transparent savings vs worst).
 *   • Shows the saving vs. the *average* exchange on the market.
 *
 *   This is the single most-trust-building widget on a rate-comparison
 *   page: users get an instant answer to "is this worth it?".
 *
 *   Architecture: client component; purely presentational — the rates are
 *   server-rendered as props so we never hit the network here. This keeps
 *   the page interactive on first paint even with no JS.
 */

import { ArrowLeftRight, Calculator, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import s from './RateCalculator.module.css';

export type CalcOption = {
  code: string;
  name: string;
  /** best sell rate = user sells toman → gets this currency */
  bestSell: number;
  /** best buy rate = user buys this currency with toman */
  bestBuy: number;
  /** average sell across all exchanges */
  avgSell: number;
  /** average buy across all exchanges */
  avgBuy: number;
  /** worst (highest) sell rate for transparency */
  worstSell: number;
  unit: string;
};

type Props = {
  options: CalcOption[];
  /** default source currency code (e.g. "USD") */
  defaultCode?: string;
  /** default amount the user enters */
  defaultAmount?: number;
};

const formatFa = (n: number, max = 2): string => {
  if (!Number.isFinite(n) || n === 0) return '—';
  if (Math.abs(n) < 1) {
    return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: max }).format(n);
  }
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: max }).format(Math.round(n));
};

const formatInt = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return '—';
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
};

export default function RateCalculator({
  options,
  defaultCode,
  defaultAmount = 1000,
}: Props) {
  const usable = options.filter((o) => o.bestSell > 0 && o.bestBuy > 0);
  const fallback = usable[0]?.code ?? '';
  const [code, setCode] = useState<string>(defaultCode ?? fallback);
  const [amount, setAmount] = useState<number>(defaultAmount);

  const option = useMemo(() => usable.find((o) => o.code === code) ?? usable[0], [usable, code]);

  if (usable.length === 0 || !option) {
    return (
      <div className={s.calcEmpty} role="status">
        <Calculator size={14} strokeWidth={2.5} aria-hidden />
        نرخ فعالی برای محاسبه موجود نیست.
      </div>
    );
  }

  // For the calculator:
  //  - "می‌دهید" = amount in toman
  //  - "دریافت می‌کنید" = amount / bestSell in target currency
  //  - "سود شما" = (best - worst) / best * 100
  const tomanAmount = amount;
  const youGet = tomanAmount / option.bestSell;
  const youWouldGetAtWorst = option.worstSell > 0 ? tomanAmount / option.worstSell : youGet;
  const youWouldGetAtAverage = option.avgSell > 0 ? tomanAmount / option.avgSell : youGet;
  const savingsVsAverage = youGet - youWouldGetAtAverage;
  const savingsVsWorst = youGet - youWouldGetAtWorst;
  const savingsPctVsAverage =
    option.avgSell > 0 ? ((option.bestSell - option.avgSell) / option.avgSell) * 100 : 0;
  const isUp = savingsPctVsAverage >= 0;

  return (
    <div className={s.calc} dir="rtl" aria-label="ماشین‌حساب نرخ">
      <header className={s.calcHeader}>
        <span className={s.calcEyebrow}>
          <Calculator size={12} strokeWidth={2.5} aria-hidden />
          ماشین‌حساب نرخ
        </span>
        <h3 className={s.calcTitle}>چقدر دریافت می‌کنید؟</h3>
      </header>

      <div className={s.calcBody}>
        {/* input row */}
        <div className={s.inputGroup}>
          <label className={s.inputLabel} htmlFor="rc-amount">
            شما می‌دهید
          </label>
          <div className={s.inputShell}>
            <input
              id="rc-amount"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={Number.isFinite(amount) ? amount : 0}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                setAmount(Number.isFinite(v) && v >= 0 ? v : 0);
              }}
              className={s.input}
              aria-label="مبلغ به تومان"
            />
            <span className={s.inputUnit}>تومان</span>
          </div>
        </div>

        <div className={s.swap} aria-hidden>
          <span className={s.swapIcon}>
            <ArrowLeftRight size={14} strokeWidth={2.5} />
          </span>
        </div>

        <div className={s.inputGroup}>
          <label className={s.inputLabel} htmlFor="rc-currency">
            دریافت می‌کنید
          </label>
          <div className={s.inputShell}>
            <select
              id="rc-currency"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={s.select}
              aria-label="انتخاب ارز مقصد"
            >
              {usable.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.code} — {o.name}
                </option>
              ))}
            </select>
            <span className={s.inputUnit}>{option.code}</span>
          </div>
        </div>

        {/* result row */}
        <div className={s.resultRow}>
          <div className={s.resultCell}>
            <span className={s.resultLabel}>دریافت شما (بهترین نرخ)</span>
            <span className={s.resultVal} dir="ltr">
              {formatFa(youGet, 4)}
              <span className={s.resultUnit}>{option.code}</span>
            </span>
          </div>
          <div className={s.resultCellMuted}>
            <span className={s.resultLabel}>اگر بدترین نرخ بگیرید</span>
            <span className={s.resultValSm} dir="ltr">
              {formatFa(youWouldGetAtWorst, 4)}
              <span className={s.resultUnit}>{option.code}</span>
            </span>
          </div>
        </div>

        {/* savings strip */}
        <div className={s.savings} role="status" aria-live="polite">
          <span className={s.savingsIcon} aria-hidden>
            <TrendingUp size={12} strokeWidth={2.5} />
          </span>
          <span className={s.savingsText}>
            {isUp ? (
              <>
                با بهترین نرخ،{' '}
                <span className={s.savingsStrong}>
                  {formatInt(savingsVsAverage)} {option.code}
                </span>{' '}
                بیشتر از میانگین بازار دریافت می‌کنید
              </>
            ) : (
              <>
                بهترین نرخ بازار در حال حاضر{' '}
                <span className={s.savingsStrong}>
                  {Math.abs(savingsPctVsAverage).toFixed(2)}٪
                </span>{' '}
                پایین‌تر از میانگین است
              </>
            )}
          </span>
        </div>

        {savingsVsWorst > 0.0001 && (
          <p className={s.savingsFine}>
            صرفه‌جویی در برابر بدترین نرخ:{' '}
            <strong>{formatFa(savingsVsWorst, 4)} {option.code}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
