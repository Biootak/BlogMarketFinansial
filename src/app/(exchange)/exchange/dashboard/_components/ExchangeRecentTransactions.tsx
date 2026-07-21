/**
 * ExchangeRecentTransactions — آخرین تراکنش‌های صراف.
 *
 * Server Component: داده را مستقیم از DB می‌گیرد.
 * هیچ useEffect / client fetch ندارد.
 */

import { getTransactions } from '@/actions/exchange-transactions';
import { CircleDollarSign } from 'lucide-react';

const KIND_FA: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  EXCHANGE: 'صرافی',
  TRANSFER: 'انتقال',
  FEE: 'کارمزد',
};

const STATUS_FA: Record<string, string> = {
  COMPLETED: 'تکمیل',
  PENDING: 'در انتظار',
  FAILED: 'ناموفق',
  CANCELLED: 'لغو',
};

export default async function ExchangeRecentTransactions({
  exchangeId,
}: {
  exchangeId: string;
}) {
  const { rows } = await getTransactions(exchangeId, { limit: 8 });

  return (
    <div
      style={{
        background: 'var(--at-surface)',
        border: '1px solid var(--at-line)',
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--at-line)',
        }}
      >
        <CircleDollarSign className="w-4 h-4" style={{ color: 'var(--at-accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 'var(--ds-text-sm)' }}>آخرین تراکنش‌ها</span>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--at-fg-subtle)',
            fontSize: 'var(--ds-text-sm)',
          }}
        >
          هنوز تراکنشی ثبت نشده است.
        </div>
      ) : (
        <div>
          {rows.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: '12px',
                alignItems: 'center',
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid var(--at-line)',
                fontSize: 'var(--ds-text-sm)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--at-fg)' }}>
                  {row.customer?.fullName ?? '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--at-fg-subtle)' }}>
                  {row.customer?.phone ?? ''}
                </div>
              </div>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'var(--at-accent-subtle)',
                  color: 'var(--at-accent)',
                }}
              >
                {KIND_FA[row.kind] ?? row.kind}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--at-fg)' }}>
                {new Intl.NumberFormat('fa-IR').format(Number(row.amount) / 100)} {row.currency}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: row.status === 'COMPLETED' ? 'oklch(45% 0.14 145)' : 'var(--at-fg-subtle)',
                }}
              >
                {STATUS_FA[row.status] ?? row.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
