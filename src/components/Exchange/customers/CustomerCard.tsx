/**
 * CustomerCard — کارت متراکم مشتری (Cockpit UI).
 *
 * جایگزین ردیف جدول: در یک کارت ۲۲۰×auto همه چیز را نشان می‌دهد
 * (avatar + name + phone + city + status + KYC + risk + last seen).
 */

import { CustomerStatusBadge } from '@/components/Dashboard/primitives';
import type { CustomerRow } from '@/actions/exchange-customers';
import {
  KYC_META,
  KYC_STATUS_META,
  STATUS_META,
  riskBucket,
} from '@/lib/customer-segments';
import {
  getInitials,
  riskLabel,
  riskTone,
  formatRelative,
  formatPhone,
} from '@/lib/customer-format';
import { Check, ShieldAlert } from 'lucide-react';
import type { CSSProperties } from 'react';
import s from './CustomerCard.module.css';

interface Props {
  customer: CustomerRow;
  selected?: boolean;
  canSelect?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (customer: CustomerRow) => void;
}

function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h) % 360;
}

export function CustomerCard({
  customer,
  selected = false,
  canSelect = false,
  onSelect,
  onClick,
}: Props) {
  const hue = avatarHue(customer.fullName);
  const statusMeta = STATUS_META[customer.status as keyof typeof STATUS_META];
  const kycMeta = KYC_META[customer.kycLevel] ?? { label: customer.kycLevel, tone: 'muted' as const };
  const kycStatusMeta =
    KYC_STATUS_META[customer.kycStatus] ?? { label: customer.kycStatus, tone: 'muted' as const };
  const tone = riskTone(customer.riskScore);
  const bucket = riskBucket(customer.riskScore);
  const riskFillPct = Math.max(2, Math.min(100, customer.riskScore));

  return (
    <article
      className={s.card}
      data-selected={selected || undefined}
      data-tone={tone}
      data-status={customer.status}
      onClick={() => onClick?.(customer)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(customer);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`مشتری ${customer.fullName}`}
    >
      {/* Selection checkbox */}
      {canSelect && (
        <button
          type="button"
          className={s.selectBtn}
          data-on={selected || undefined}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(customer.id);
          }}
          aria-label={selected ? 'لغو انتخاب' : 'انتخاب'}
          aria-pressed={selected}
        >
          {selected && <Check size={12} strokeWidth={3} aria-hidden />}
        </button>
      )}

      {/* Header: avatar + name + status */}
      <header className={s.head}>
        <span
          className={s.avatar}
          style={{
            background: `oklch(91% 0.04 ${hue})`,
            color: `oklch(36% 0.12 ${hue})`,
          }}
          aria-hidden
        >
          {getInitials(customer.fullName)}
        </span>
        <div className={s.headText}>
          <h3 className={s.name}>{customer.fullName}</h3>
          <span className={s.sub} dir="ltr">
            {formatPhone(customer.phone)}
          </span>
        </div>
        <CustomerStatusBadge status={customer.status} />
      </header>

      {/* Meta grid: city · KYC · risk · last seen */}
      <dl className={s.metaGrid}>
        <div className={s.metaItem}>
          <dt className={s.metaLabel}>شهر</dt>
          <dd className={s.metaValue}>{customer.city ?? '—'}</dd>
        </div>
        <div className={s.metaItem}>
          <dt className={s.metaLabel}>KYC</dt>
          <dd className={s.metaValue} data-tone={kycMeta.tone}>
            {kycMeta.label}
          </dd>
        </div>
        <div className={s.metaItem}>
          <dt className={s.metaLabel}>وضعیت KYC</dt>
          <dd className={s.metaValue} data-tone={kycStatusMeta.tone}>
            {kycStatusMeta.label}
          </dd>
        </div>
        <div className={s.metaItem}>
          <dt className={s.metaLabel}>عضویت</dt>
          <dd className={s.metaValue}>{formatRelative(customer.createdAt)}</dd>
        </div>
      </dl>

      {/* Risk bar (always visible — main signal) */}
      <div className={s.riskBar} data-tone={tone}>
        <div className={s.riskBarHead}>
          <span className={s.riskLabel}>
            {bucket === 'high' && <ShieldAlert size={11} aria-hidden />}
            ریسک
          </span>
          <span className={s.riskScore}>{customer.riskScore}</span>
        </div>
        <div className={s.riskTrack} aria-hidden>
          <div className={s.riskFill} style={{ '--pct': `${riskFillPct}%` } as CSSProperties} />
        </div>
        <span className={s.riskText}>{riskLabel(customer.riskScore)}</span>
      </div>

      {/* Status semantic caption */}
      {statusMeta && (
        <p className={s.caption} data-tone={statusMeta.tone}>
          {statusMeta.description}
        </p>
      )}
    </article>
  );
}

export default CustomerCard;
