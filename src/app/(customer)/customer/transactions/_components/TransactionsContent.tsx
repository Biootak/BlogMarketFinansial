'use client';

import type { CustomerTransactionRow } from '@/actions/customer-portal';
import { EmptyState, Section } from '@/components/Dashboard/primitives';
import { CircleDollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import s from './TransactionsContent.module.css';

interface Props {
  initialRows: CustomerTransactionRow[];
  total: number;
  page: number;
  hasMore: boolean;
  filterKind: string;
  filterStatus: string;
}

const KIND_LABEL: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  TRANSFER: 'انتقال',
  EXCHANGE: 'تبدیل ارز',
  FEE: 'کارمزد',
  SETTLEMENT: 'تسویه',
  ADJUSTMENT: 'اصلاح',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'در انتظار',
  PROCESSING: 'پردازش',
  COMPLETED: 'موفق',
  FAILED: 'ناموفق',
  REVERSED: 'برگشتی',
  CANCELLED: 'لغو شده',
};

function isCredit(kind: string): boolean {
  return kind === 'DEPOSIT' || kind === 'TRANSFER';
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

function formatAmount(amount: number, currency: string): string {
  return `${new Intl.NumberFormat('fa-IR').format(amount)} ${currency}`;
}

const KIND_OPTIONS = [
  { value: '', label: 'همه نوع‌ها' },
  { value: 'DEPOSIT', label: 'واریز' },
  { value: 'WITHDRAWAL', label: 'برداشت' },
  { value: 'TRANSFER', label: 'انتقال' },
  { value: 'EXCHANGE', label: 'تبدیل ارز' },
  { value: 'FEE', label: 'کارمزد' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'COMPLETED', label: 'موفق' },
  { value: 'FAILED', label: 'ناموفق' },
  { value: 'CANCELLED', label: 'لغو شده' },
];

export default function TransactionsContent({
  initialRows,
  total,
  page,
  hasMore,
  filterKind,
  filterStatus,
}: Props) {
  const router = useRouter();

  const buildUrl = (opts: { page?: number; kind?: string; status?: string }) => {
    const params = new URLSearchParams();
    const p = opts.page ?? page;
    const k = opts.kind !== undefined ? opts.kind : filterKind;
    const st = opts.status !== undefined ? opts.status : filterStatus;
    if (p > 1) params.set('page', String(p));
    if (k) params.set('kind', k);
    if (st) params.set('status', st);
    return `/customer/transactions${params.size ? `?${params}` : ''}`;
  };

  return (
    <div className={s.root}>
      {/* Filters */}
      <div className={s.filters}>
        <select
          className={s.select}
          value={filterKind}
          aria-label="فیلتر نوع تراکنش"
          onChange={(e) => router.push(buildUrl({ kind: e.target.value, page: 1 }))}
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className={s.select}
          value={filterStatus}
          aria-label="فیلتر وضعیت"
          onChange={(e) => router.push(buildUrl({ status: e.target.value, page: 1 }))}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <span className={s.totalBadge}>{new Intl.NumberFormat('fa-IR').format(total)} تراکنش</span>
      </div>

      {/* List */}
      <Section>
        {initialRows.length === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="تراکنشی یافت نشد"
            description="با فیلتر انتخابی تراکنشی وجود ندارد"
          />
        ) : (
          <div className={s.txnList}>
            {initialRows.map((txn) => (
              <a key={txn.id} href={`/customer/transactions/${txn.id}`} className={s.txnRow}>
                <div className={s.txnDot} data-credit={isCredit(txn.kind)} aria-hidden />
                <div className={s.txnBody}>
                  <div className={s.txnTop}>
                    <span className={s.txnKind}>{KIND_LABEL[txn.kind] ?? txn.kind}</span>
                    <span className={s.txnAmount} data-credit={isCredit(txn.kind)}>
                      {isCredit(txn.kind) ? '+' : '−'}
                      {formatAmount(txn.amount, txn.currency)}
                    </span>
                  </div>
                  <div className={s.txnBottom}>
                    <span className={s.txnDate}>{formatDate(txn.createdAt)}</span>
                    {txn.destAmount && txn.destCurrency && (
                      <span className={s.txnDest}>
                        ← {formatAmount(txn.destAmount, txn.destCurrency)}
                      </span>
                    )}
                    {txn.counterparty && <span className={s.txnNote}>{txn.counterparty}</span>}
                    <span className={s.txnStatus} data-status={txn.status}>
                      {STATUS_LABEL[txn.status] ?? txn.status}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </Section>

      {/* Pagination */}
      {total > 20 && (
        <div className={s.pagination}>
          <button
            type="button"
            className={s.pageBtn}
            disabled={page <= 1}
            onClick={() => router.push(buildUrl({ page: page - 1 }))}
          >
            صفحه قبل
          </button>
          <span className={s.pageInfo}>
            صفحه {new Intl.NumberFormat('fa-IR').format(page)} از{' '}
            {new Intl.NumberFormat('fa-IR').format(Math.ceil(total / 20))}
          </span>
          <button
            type="button"
            className={s.pageBtn}
            disabled={!hasMore}
            onClick={() => router.push(buildUrl({ page: page + 1 }))}
          >
            صفحه بعد
          </button>
        </div>
      )}
    </div>
  );
}
