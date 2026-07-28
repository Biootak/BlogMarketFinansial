/**
 * SettlementWaterfall — signature moment of the settlement page.
 *
 * یک «جریان عددی» سه مرحله‌ای که منطق واقعی تسویه را تجسم می‌کند:
 *   gross volume  →  platform fee  →  net to exchange
 *
 * هر مرحله یک «تکهٔ آبشار» (waterfall segment) است؛ اختلاف بین gross و net
 * به‌صورت بصری به‌عنوان fee «کم» می‌شود. انیمیشن: عددهای اصلی با
 * self-drawing stroke و subtle pulse روی fee segment.
 *
 * Server Component — همه props از قبل serialize شده‌اند.
 */

import { Coins, Percent, Wallet } from 'lucide-react';
import s from './SettlementWaterfall.module.css';

interface Props {
  /** gross volume (minor units — مثل بقیهٔ settlement: ÷100) */
  totalVolume: number;
  /** platform fee (minor units) */
  platformFee: number;
  /** net to exchange (minor units) */
  exchangeNet: number;
  /** primary currency label */
  currency: string;
}

function fmtCompact(v: number): string {
  return new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(v / 100);
}

function fmtExact(v: number): string {
  return new Intl.NumberFormat('fa-IR').format(v / 100);
}

export default function SettlementWaterfall({
  totalVolume,
  platformFee,
  exchangeNet,
  currency,
}: Props) {
  const feePct = totalVolume > 0 ? (platformFee / totalVolume) * 100 : 0;
  const netPct = totalVolume > 0 ? (exchangeNet / totalVolume) * 100 : 0;

  // عرض‌ها برای bar سه‌تکه‌ای
  const grossW = 100;
  const feeW = totalVolume > 0 ? (platformFee / totalVolume) * 100 : 0;
  const netW = totalVolume > 0 ? (exchangeNet / totalVolume) * 100 : 0;

  return (
    <section className={s.waterfall} aria-label="جریان تسویه">
      <div className={s.header}>
        <span className={s.eyebrow}>
          <span className={s.dot} aria-hidden />
          جریان تسویه
        </span>
        <h2 className={s.title}>از حجم معاملات تا درآمد خالص</h2>
        <p className={s.sub}>
          هر دورهٔ تسویه، یک آبشار سه‌مرحله‌ای را طی می‌کند — کارمزد پلتفرم از
          حجم کل کسر و مابقی به صرافی تخصیص می‌یابد.
        </p>
      </div>

      {/* ── Waterfall segments (3 columns) ───────────────────────────── */}
      <div className={s.segments} role="list">
        {/* Segment 1 — gross */}
        <div className={s.segment} data-tone="emerald" role="listitem">
          <div className={s.segmentHead}>
            <span className={s.segmentIcon} data-tone="emerald" aria-hidden>
              <Coins size={14} strokeWidth={1.75} />
            </span>
            <span className={s.segmentLabel}>حجم کل معاملات</span>
          </div>
          <div className={s.segmentValue}>
            <span className={s.valueNumber}>{fmtCompact(totalVolume)}</span>
            <span className={s.valueCurrency}>{currency}</span>
          </div>
          <div className={s.segmentBar} data-tone="emerald" aria-hidden>
            <span className={s.barFill} style={{ width: '100%' }} />
          </div>
          <div className={s.segmentMeta}>
            <span className={s.metaKey}>مبنای محاسبه</span>
            <span className={s.metaVal}>۱۰۰٪</span>
          </div>
        </div>

        {/* Arrow 1 → 2 */}
        <div className={s.connector} aria-hidden>
          <svg viewBox="0 0 24 16" width="100%" height="16" preserveAspectRatio="none">
            <line
              x1="0"
              y1="8"
              x2="22"
              y2="8"
              stroke="var(--at-line-strong)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <path
              d="M16 4 L22 8 L16 12"
              fill="none"
              stroke="var(--at-line-strong)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Segment 2 — fee */}
        <div className={s.segment} data-tone="amber" role="listitem">
          <div className={s.segmentHead}>
            <span className={s.segmentIcon} data-tone="amber" aria-hidden>
              <Percent size={14} strokeWidth={1.75} />
            </span>
            <span className={s.segmentLabel}>کارمزد پلتفرم</span>
          </div>
          <div className={s.segmentValue}>
            <span className={s.valueNumber} data-tone="amber">
              −{fmtCompact(platformFee)}
            </span>
            <span className={s.valueCurrency}>{currency}</span>
          </div>
          <div className={s.segmentBar} data-tone="amber" aria-hidden>
            <span className={s.barFill} style={{ width: `${Math.max(2, feeW)}%` }} />
          </div>
          <div className={s.segmentMeta}>
            <span className={s.metaKey}>سهم پلتفرم</span>
            <span className={s.metaVal}>{new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(feePct)}٪</span>
          </div>
        </div>

        {/* Arrow 2 → 3 */}
        <div className={s.connector} aria-hidden>
          <svg viewBox="0 0 24 16" width="100%" height="16" preserveAspectRatio="none">
            <line
              x1="0"
              y1="8"
              x2="22"
              y2="8"
              stroke="var(--at-line-strong)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <path
              d="M16 4 L22 8 L16 12"
              fill="none"
              stroke="var(--at-line-strong)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Segment 3 — net */}
        <div className={s.segment} data-tone="violet" role="listitem">
          <div className={s.segmentHead}>
            <span className={s.segmentIcon} data-tone="violet" aria-hidden>
              <Wallet size={14} strokeWidth={1.75} />
            </span>
            <span className={s.segmentLabel}>درآمد خالص صرافی</span>
          </div>
          <div className={s.segmentValue}>
            <span className={s.valueNumber} data-tone="violet">
              {fmtCompact(exchangeNet)}
            </span>
            <span className={s.valueCurrency}>{currency}</span>
          </div>
          <div className={s.segmentBar} data-tone="violet" aria-hidden>
            <span className={s.barFill} style={{ width: `${Math.max(2, netW)}%` }} />
          </div>
          <div className={s.segmentMeta}>
            <span className={s.metaKey}>قابل پرداخت</span>
            <span className={s.metaVal}>{new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(netPct)}٪</span>
          </div>
        </div>
      </div>

      {/* ── Identity equation (mathematical anchor) ──────────────────── */}
      <div className={s.equation} aria-hidden>
        <span className={s.eqNumber}>{fmtExact(totalVolume)}</span>
        <span className={s.eqOp}>−</span>
        <span className={s.eqNumber} data-tone="amber">
          {fmtExact(platformFee)}
        </span>
        <span className={s.eqOp}>=</span>
        <span className={s.eqNumber} data-tone="violet">
          {fmtExact(exchangeNet)}
        </span>
        <span className={s.eqCurrency}>{currency}</span>
      </div>
    </section>
  );
}
