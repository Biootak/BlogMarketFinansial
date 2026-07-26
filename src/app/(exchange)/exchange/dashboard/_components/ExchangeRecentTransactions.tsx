/**
 * ExchangeRecentTransactions — آخرین تراکنش‌های صراف.
 *
 * Server Component: داده را مستقیم از DB می‌گیرد.
 * هیچ useEffect / client fetch ندارد.
 */

import { getTransactions } from '@/actions/exchange-transactions';
import { TX_KIND_FA, TX_STATUS_FA } from '@/lib/exchange-labels';
import { formatJalaliCompact } from '@/lib/format-jalali';
import { ArrowLeft, CircleDollarSign } from 'lucide-react';
import Link from 'next/link';

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
      {/* ── Header ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--at-line)',
        }}
      >
        <CircleDollarSign
          className="w-4 h-4"
          style={{ color: 'var(--at-accent)', flexShrink: 0 }}
          aria-hidden
        />
        <span style={{ fontWeight: 600, fontSize: 'var(--ds-text-sm)', flex: 1 }}>
          آخرین تراکنش‌ها
        </span>
        <Link
          href="/exchange/transactions"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--at-accent)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
          aria-label="مشاهده همه تراکنش‌ها"
        >
          همه
          <ArrowLeft className="w-3 h-3" aria-hidden />
        </Link>
      </div>

      {/* ── Rows ───────────────────────────────────────── */}
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
          {rows.map((row) => {
            const st = TX_STATUS_FA[row.status] ?? {
              label: row.status,
              color: 'var(--at-fg-subtle)',
            };
            return (
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
                {/* مشتری + تاریخ */}
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--at-fg)',
                      fontSize: 'var(--ds-text-sm)',
                    }}
                  >
                    {row.customer?.fullName ?? '—'}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--at-fg-subtle)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatJalaliCompact(row.createdAt)}
                  </div>
                </div>

                {/* نوع تراکنش */}
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'var(--at-accent-subtle)',
                    color: 'var(--at-accent)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {TX_KIND_FA[row.kind] ?? row.kind}
                </span>

                {/* مبلغ */}
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--at-fg)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {new Intl.NumberFormat('fa-IR').format(Number(row.amount) / 100)} {row.currency}
                </span>

                {/* وضعیت */}
                <span
                  style={{
                    fontSize: '11px',
                    color: st.color,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer link ────────────────────────────────── */}
      {rows.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--at-line)',
            textAlign: 'center',
          }}
        >
          <Link
            href="/exchange/transactions"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--at-accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            مشاهده همه تراکنش‌ها
          </Link>
        </div>
      )}
    </div>
  );
}
