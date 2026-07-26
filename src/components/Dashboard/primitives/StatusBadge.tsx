/**
 * StatusBadge + KindBadge — badge‌های مشترک برای وضعیت و نوع تراکنش.
 *
 * قبلاً در هر workspace یک `.kindBadge` / `.statusBadge` جداگانه بود.
 * از این component همه داشبوردها استفاده می‌کنند.
 */

import { TX_KIND_FA, TX_STATUS_FA, type TxStatusColor } from '@/lib/exchange-labels';

// ─── KindBadge ────────────────────────────────────────────────────────────

interface KindBadgeProps {
  kind: string;
  /** label override — اگر داده نشه از TX_KIND_FA می‌آید */
  label?: string;
}

const kindStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  borderRadius: '20px',
  fontSize: '11px',
  fontWeight: 600,
  background: 'var(--at-accent-subtle)',
  color: 'var(--at-accent)',
  whiteSpace: 'nowrap',
};

export function KindBadge({ kind, label }: KindBadgeProps) {
  return <span style={kindStyle}>{label ?? TX_KIND_FA[kind] ?? kind}</span>;
}

// ─── StatusBadge ──────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  /** override کامل — اگر داده نشه از TX_STATUS_FA می‌آید */
  config?: TxStatusColor;
}

const statusBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  borderRadius: '20px',
  fontSize: '11px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const STATUS_BG: Record<string, string> = {
  COMPLETED: 'oklch(95% 0.08 145)',
  PENDING: 'oklch(95% 0.06 85)',
  PROCESSING: 'oklch(95% 0.05 250)',
  FAILED: 'oklch(95% 0.06 25)',
  CANCELLED: 'oklch(93% 0 0)',
  REVERSED: 'oklch(95% 0.06 60)',
};

export function StatusBadge({ status, config }: StatusBadgeProps) {
  const conf = config ?? TX_STATUS_FA[status];
  if (!conf) return <span style={{ ...statusBase, color: 'var(--at-fg-subtle)' }}>{status}</span>;

  return (
    <span
      style={{
        ...statusBase,
        background: STATUS_BG[status] ?? 'oklch(93% 0 0)',
        color: conf.color,
      }}
    >
      {conf.label}
    </span>
  );
}

// ─── CustomerStatusBadge ──────────────────────────────────────────────────

const CUSTOMER_STATUS_COLORS: Record<string, { label: string; bg: string; fg: string }> = {
  ACTIVE: { label: 'فعال', bg: 'oklch(95% 0.08 145)', fg: 'oklch(40% 0.12 145)' },
  PROSPECT: { label: 'احتمالی', bg: 'oklch(95% 0.06 85)', fg: 'oklch(40% 0.1 80)' },
  FROZEN: { label: 'مسدود', bg: 'oklch(95% 0.06 50)', fg: 'oklch(40% 0.1 50)' },
  CLOSED: { label: 'بسته', bg: 'oklch(93% 0 0)', fg: 'oklch(45% 0 0)' },
};

interface CustomerStatusBadgeProps {
  status: string;
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  const conf = CUSTOMER_STATUS_COLORS[status];
  if (!conf)
    return (
      <span style={{ ...statusBase, background: 'oklch(93% 0 0)', color: 'oklch(45% 0 0)' }}>
        {status}
      </span>
    );

  return <span style={{ ...statusBase, background: conf.bg, color: conf.fg }}>{conf.label}</span>;
}
