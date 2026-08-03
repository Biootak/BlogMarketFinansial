/**
 * ExchangeCustomerSegmentation — segmented bar برای status + KYC.
 *
 * Server Component. رنگ از token می‌آید.
 */

import type { CustomerSegmentation } from '@/actions/exchange-dashboard';
import { CUSTOMER_STATUS_FA, CUSTOMER_STATUS_TONE, KYC_LEVEL_FA } from '@/lib/exchange-labels';
import s from './ExchangeDashboard.module.css';

function formatPercent(share: number): string {
  return new Intl.NumberFormat('fa-IR', { style: 'percent', maximumFractionDigits: 0 }).format(
    share,
  );
}

export default function ExchangeCustomerSegmentation({ data }: { data: CustomerSegmentation }) {
  const { byStatus, byKyc } = data;
  const total = byStatus.reduce((s, x) => s + x.count, 0);

  if (total === 0) {
    return <div className={s.flowEmpty}>هنوز مشتری ثبت نشده است.</div>;
  }

  // ordered: ACTIVE → PROSPECT → FROZEN → CLOSED
  const statusOrder = ['ACTIVE', 'PROSPECT', 'FROZEN', 'CLOSED'];
  const sortedStatus = statusOrder
    .map((st) => byStatus.find((x) => x.status === st))
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  const kycOrder = ['NONE', 'BASIC', 'ENHANCED', 'FULL'];
  const sortedKyc = kycOrder
    .map((lvl) => byKyc.find((x) => x.level === lvl))
    .filter((x): x is NonNullable<typeof x> => x !== undefined);

  return (
    <div className={s.segWrap}>
      <div>
        <div className={s.segLabel}>
          <span>وضعیت مشتری</span>
          <span dir="ltr" style={{ color: 'var(--at-fg-muted)' }}>
            {new Intl.NumberFormat('fa-IR').format(total)} نفر
          </span>
        </div>
        <div className={s.segBar} role="list">
          {sortedStatus.map((seg) => {
            const tone = CUSTOMER_STATUS_TONE[seg.status] ?? 'emerald';
            const label = CUSTOMER_STATUS_FA[seg.status]?.label ?? seg.status;
            return (
              <div
                key={seg.status}
                role="listitem"
                className={s.segSeg}
                data-tone={tone}
                style={{ flexBasis: `${Math.max(0.5, seg.share * 100)}%` }}
                title={`${label} — ${formatPercent(seg.share)}`}
              />
            );
          })}
        </div>
        <ul className={s.segLegend}>
          {sortedStatus.map((seg) => {
            const tone = CUSTOMER_STATUS_TONE[seg.status] ?? 'emerald';
            const label = CUSTOMER_STATUS_FA[seg.status]?.label ?? seg.status;
            return (
              <li key={seg.status}>
                <span className={s.segLegendDot} data-tone={tone} aria-hidden />
                <span className={s.segLegendLabel}>{label}</span>
                <span className={s.segLegendValue} dir="ltr">
                  {new Intl.NumberFormat('fa-IR').format(seg.count)} · {formatPercent(seg.share)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {sortedKyc.length > 0 && (
        <div>
          <div className={s.segLabel}>
            <span>سطح احراز هویت</span>
          </div>
          <div className={s.segBar} role="list">
            {sortedKyc.map((seg) => (
              <div
                key={seg.level}
                role="listitem"
                className={s.segSeg}
                data-tone="kyc"
                style={{ flexBasis: `${Math.max(0.5, seg.share * 100)}%` }}
                title={`${KYC_LEVEL_FA[seg.level] ?? seg.level} — ${formatPercent(seg.share)}`}
              />
            ))}
          </div>
          <ul className={s.segLegend}>
            {sortedKyc.map((seg) => (
              <li key={seg.level}>
                <span className={s.segLegendDot} data-tone="kyc" aria-hidden />
                <span className={s.segLegendLabel}>{KYC_LEVEL_FA[seg.level] ?? seg.level}</span>
                <span className={s.segLegendValue} dir="ltr">
                  {new Intl.NumberFormat('fa-IR').format(seg.count)} · {formatPercent(seg.share)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
