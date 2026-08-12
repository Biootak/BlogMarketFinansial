/**
 * StatusBadge + KindBadge + CustomerStatusBadge — badge‌های مشترک داشبورد.
 *
 * CSS module — tokens only (--ds-* / --nova-*) — no inline styles.
 */

import { TX_KIND_FA, TX_STATUS_FA, type TxStatusColor } from '@/lib/exchange-labels';
import s from './StatusBadge.module.css';

// ─── KindBadge ────────────────────────────────────────────────────────────

interface KindBadgeProps {
  kind: string;
  label?: string;
}

export function KindBadge({ kind, label }: KindBadgeProps) {
  return <span className={s.kindBadge}>{label ?? TX_KIND_FA[kind] ?? kind}</span>;
}

// ─── StatusBadge ──────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  config?: TxStatusColor;
}

const STATUS_TONE: Record<string, string> = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  PROCESSING: 'processing',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REVERSED: 'reversed',
};

export function StatusBadge({ status, config }: StatusBadgeProps) {
  const conf = config ?? TX_STATUS_FA[status];
  if (!conf) return <span className={s.statusBadge}>{status}</span>;

  return (
    <span className={`${s.statusBadge} ${s[STATUS_TONE[status] ?? 'default']}`}>{conf.label}</span>
  );
}

// ─── CustomerStatusBadge ──────────────────────────────────────────────────

const CUSTOMER_TONE: Record<string, string> = {
  ACTIVE: 'customerActive',
  PROSPECT: 'customerProspect',
  FROZEN: 'customerFrozen',
  CLOSED: 'customerClosed',
};

const CUSTOMER_LABEL: Record<string, string> = {
  ACTIVE: 'فعال',
  PROSPECT: 'احتمالی',
  FROZEN: 'مسدود',
  CLOSED: 'بسته',
};

interface CustomerStatusBadgeProps {
  status: string;
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  const tone = CUSTOMER_TONE[status];
  const label = CUSTOMER_LABEL[status];
  if (!tone) return <span className={s.statusBadge}>{status}</span>;

  return <span className={`${s.statusBadge} ${s[tone]}`}>{label}</span>;
}
