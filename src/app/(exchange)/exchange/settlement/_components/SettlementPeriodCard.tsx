/**
 * SettlementPeriodCard — یک کارت فشرده برای هر دورهٔ تسویه.
 *
 * نمایش متراکم از: شماره/ID، بازهٔ تاریخ، status badge، KPI های فشرده.
 * روی hover: lift -1px + border روشن‌تر. تبدیل به tile از طریق CSS Module.
 *
 * Client Component — برای استفاده از interactive highlight روی hover و click.
 */

import { BadgeCheck, CheckCircle2, Clock, Receipt } from 'lucide-react';
import { useState } from 'react';
import s from './SettlementPeriodCard.module.css';
import { STATUS_META, type SettlementRow, type SettlementStatus } from './settlement-state';

const _faNum = new Intl.NumberFormat('fa-IR');

const STATUS_ICON = {
  PENDING: Clock,
  APPROVED: BadgeCheck,
  PAID: CheckCircle2,
  CANCELLED: Receipt,
} satisfies Record<SettlementStatus, typeof Clock>;

const fmtNum = (v: string | number): string =>
  new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(v) / 100);

const fmtExact = (v: string | number): string =>
  _faNum.format(Number(v) / 100);

const fmtDate = (d: Date): string =>
  new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', year: '2-digit' }).format(
    new Date(d),
  );

interface Props {
  row: SettlementRow;
  selected: boolean;
  onSelect: () => void;
  index: number;
}

export default function SettlementPeriodCard({ row, selected, onSelect, index }: Props) {
  const [hover, setHover] = useState(false);
  const meta = STATUS_META[row.status as SettlementStatus];
  const Icon = STATUS_ICON[row.status as SettlementStatus] ?? Receipt;

  return (
    <button
      type="button"
      className={s.card}
      data-tone={meta.tone}
      data-selected={selected || undefined}
      data-hover={hover || undefined}
      style={{ '--i': index } as React.CSSProperties}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={selected}
      aria-label={`دورهٔ ${fmtDate(row.periodStart)} تا ${fmtDate(row.periodEnd)}`}
    >
      {/* status icon top-right */}
      <div className={s.statusIcon} data-tone={meta.tone} aria-hidden>
        <Icon size={12} strokeWidth={2} />
      </div>

      {/* period range */}
      <div className={s.period}>
        <span className={s.periodLabel}>دورهٔ</span>
        <span className={s.periodDate}>
          {fmtDate(row.periodStart)} <span className={s.periodSep}>—</span> {fmtDate(row.periodEnd)}
        </span>
      </div>

      {/* KPI: deals */}
      <div className={s.metric}>
        <span className={s.metricLabel}>معاملات</span>
        <span className={s.metricValue}>
          {_faNum.format(row.dealCount)}
        </span>
      </div>

      {/* KPI: gross volume */}
      <div className={s.metric}>
        <span className={s.metricLabel}>حجم کل</span>
        <span className={s.metricValue} data-tone="emerald">
          {fmtNum(row.totalVolume)} <em className={s.metricCurrency}>{row.currency}</em>
        </span>
      </div>

      {/* KPI: net (focal) */}
      <div className={s.metric} data-focal>
        <span className={s.metricLabel}>خالص دریافتی</span>
        <span className={s.metricValue} data-tone="violet" data-focal>
          {fmtExact(row.exchangeNet)} <em className={s.metricCurrency}>{row.currency}</em>
        </span>
      </div>

      {/* status pill (bottom) */}
      <div className={s.statusPill} data-tone={meta.tone}>
        <span className={s.statusDot} data-tone={meta.tone} aria-hidden />
        {meta.label}
      </div>

      {/* selection ring overlay */}
      <span className={s.selectionRing} aria-hidden />
    </button>
  );
}
