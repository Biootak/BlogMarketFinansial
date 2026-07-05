'use client';

/**
 * TrustStrip — single horizontal row of numeric trust stats.
 *
 * Design intent:
 * - Tabular-nums, big numbers, small label below — Vercel-style metrics.
 * - 2-col on mobile, 4-col on desktop.
 * - Inline vertical separators between cells.
 *
 * 2026-07-05: built new. Replaces no prior equivalent.
 */

interface Props {
  /** Total transfer volume in USD (formatted in source). */
  totalVolume?: string;
  /** Number of supported currencies. */
  currencies?: number;
  /** Number of destination countries. */
  countries?: number;
  /** Years of operation. */
  yearsActive?: number;
  /** Average response time in minutes. */
  responseTimeMin?: number;
  /** Customer satisfaction percentage. */
  satisfactionPct?: number;
}

export default function TrustStrip(props: Props) {
  const {
    totalVolume = '۲۴۰M+',
    currencies = 35,
    countries = 50,
    yearsActive = 8,
    responseTimeMin = 15,
    satisfactionPct = 98,
  } = props;

  const toFa = (n: number) =>
    new Intl.NumberFormat('fa-IR').format(n);

  return (
    <div className="mt-trust" role="list">
      <div className="mt-trust__cell" role="listitem">
        <span className="mt-trust__num">
          <span>{totalVolume}</span>
          <span className="mt-trust__num-suffix">$</span>
        </span>
        <span className="mt-trust__label">حجم تراکنش سالانه</span>
      </div>

      <div className="mt-trust__cell" role="listitem">
        <span className="mt-trust__num">
          <span>{toFa(currencies)}</span>
          <span className="mt-trust__num-suffix">+</span>
        </span>
        <span className="mt-trust__label">ارز قابل پشتیبانی</span>
      </div>

      <div className="mt-trust__cell" role="listitem">
        <span className="mt-trust__num">
          <span>{toFa(countries)}</span>
          <span className="mt-trust__num-suffix">+</span>
        </span>
        <span className="mt-trust__label">کشور مقصد</span>
      </div>

      <div className="mt-trust__cell" role="listitem">
        <span className="mt-trust__num">
          <span>{toFa(yearsActive)}</span>
          <span className="mt-trust__num-suffix">سال</span>
        </span>
        <span className="mt-trust__label">سابقه فعالیت مستمر</span>
      </div>
    </div>
  );
}