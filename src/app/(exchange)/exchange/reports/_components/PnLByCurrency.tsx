/**
 * PnLByCurrency — جدول/bar chart از P&L تفکیک‌شده به‌ازای هر ارز.
 *
 * ساختار: یک لیست فشرده از ارزها به‌همراه bar افقی که نشان‌دهندهٔ
 * سهم از volume است. در سمت راست، فیلدهای کلیدی: deal count, avg deal.
 * شبیه یک «ledger» ارزی است — کاربرد تحلیلی سریع.
 */

import { ArrowDown, ArrowUp, Scale } from 'lucide-react';
import s from './PnLByCurrency.module.css';

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

export interface PnLRow {
  currency: string;
  totalVolume: number;
  totalFee: number;
  dealCount: number;
  avgDealSize: number;
}

interface Props {
  rows: PnLRow[];
}

const TONE_MAP: Record<string, 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose' | 'slate'> = {
  AFN: 'emerald',
  USD: 'emerald',
  EUR: 'cyan',
  IRR: 'amber',
  AED: 'violet',
  GBP: 'cyan',
  PKR: 'amber',
  SAR: 'violet',
  TRY: 'rose',
  default: 'slate',
};

const fmtCompact = (v: number): string =>
  new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);

const fmtExact = (v: number): string =>
  new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(v);

export default function PnLByCurrency({ rows }: Props) {
  if (rows.length === 0) {
    return null;
  }

  const maxVol = Math.max(1, ...rows.map((r) => r.totalVolume));
  const totalFee = rows.reduce((acc, r) => acc + r.totalFee, 0);

  return (
    <section className={s.section} aria-label="P&L تفکیکی ارزها">
      <header className={s.head}>
        <div className={s.headLeft}>
          <span className={s.eyebrow}>
            <Scale size={11} strokeWidth={1.75} aria-hidden />
            P&L تفکیکی
          </span>
          <h2 className={s.title}>حجم و کارمزد به‌ازای هر ارز</h2>
        </div>
        <span className={s.totalFee}>
          مجموع کارمزد:{' '}
          <strong>
            {fmtCompact(totalFee)} <em className={s.totalFeeCurrency}>IRR</em>
          </strong>
        </span>
      </header>

      <ul className={s.list}>
        {rows.map((r, i) => {
          const ratio = (r.totalVolume / maxVol) * 100;
          const tone = TONE_MAP[r.currency] ?? TONE_MAP.default;
          return (
            <li
              key={r.currency}
              className={s.row}
              data-tone={tone}
              style={{ '--i': i } as React.CSSProperties}
            >
              <div className={s.rowHead}>
                <span className={s.currencyChip} data-tone={tone}>
                  {r.currency}
                </span>
                <div className={s.rowValues}>
                  <span className={s.rowVolume}>{fmtExact(r.totalVolume)}</span>
                  <span className={s.rowCurrency}>{r.currency}</span>
                </div>
              </div>

              <div className={s.barTrack} aria-hidden>
                <span
                  className={s.barFill}
                  data-tone={tone}
                  style={{ width: `${Math.max(2, ratio)}%` }}
                />
              </div>

              <div className={s.rowMeta}>
                <span className={s.metaPill}>
                  <span className={s.metaPillLabel}>معاملات</span>
                  <span className={s.metaPillValue}>{_faNum.format(r.dealCount)}</span>
                </span>
                <span className={s.metaPill}>
                  <span className={s.metaPillLabel}>میانگین</span>
                  <span className={s.metaPillValue}>
                    {fmtCompact(r.avgDealSize)}
                    <em className={s.metaPillCurrency}>{r.currency}</em>
                  </span>
                </span>
                <span className={s.metaPill} data-fee>
                  <span className={s.metaPillLabel}>کارمزد</span>
                  <span className={s.metaPillValue} data-tone="amber">
                    {fmtCompact(r.totalFee)}
                    <em className={s.metaPillCurrency}>IRR</em>
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className={s.footnote} aria-hidden>
        <span className={s.footnoteItem}>
          <ArrowUp size={10} strokeWidth={2} aria-hidden />
          حجم بیشتر
        </span>
        <span className={s.footnoteItem}>
          <ArrowDown size={10} strokeWidth={2} aria-hidden />
          حجم کمتر
        </span>
      </footer>
    </section>
  );
}
