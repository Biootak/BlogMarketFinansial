'use client';

import type { CustomerTransactionDetail } from '@/actions/customer-portal';
import Link from 'next/link';
import s from './TransactionDetail.module.css';

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
  PROCESSING: 'در حال پردازش',
  COMPLETED: 'انجام شده',
  FAILED: 'ناموفق',
  REVERSED: 'برگشت خورده',
  CANCELLED: 'لغو شده',
};

function isCredit(kind: string) {
  return kind === 'DEPOSIT' || kind === 'TRANSFER';
}

function formatNum(n: number, cur: string) {
  return `${new Intl.NumberFormat('fa-IR').format(n)} ${cur}`;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(d));
}

interface Row {
  label: string;
  value: React.ReactNode;
}

export default function TransactionDetail({ txn }: { txn: CustomerTransactionDetail }) {
  const credit = isCredit(txn.kind);

  const rows: Row[] = [
    { label: 'نوع', value: KIND_LABEL[txn.kind] ?? txn.kind },
    {
      label: 'مبلغ',
      value: (
        <span className={credit ? s.creditAmt : s.debitAmt}>
          {credit ? '+' : '−'}
          {formatNum(txn.amount, txn.currency)}
        </span>
      ),
    },
    ...(txn.destAmount && txn.destCurrency
      ? [
          {
            label: 'مبلغ مقصد',
            value: formatNum(txn.destAmount, txn.destCurrency),
          },
        ]
      : []),
    ...(txn.rate ? [{ label: 'نرخ تبدیل', value: String(txn.rate) }] : []),
    { label: 'کارمزد', value: formatNum(txn.fee, txn.currency) },
    {
      label: 'وضعیت',
      value: (
        <span className={s.statusBadge} data-status={txn.status}>
          {STATUS_LABEL[txn.status] ?? txn.status}
        </span>
      ),
    },
    ...(txn.counterparty ? [{ label: 'طرف تراکنش', value: txn.counterparty }] : []),
    ...(txn.note ? [{ label: 'یادداشت', value: txn.note }] : []),
    ...(txn.externalRef ? [{ label: 'مرجع خارجی', value: txn.externalRef }] : []),
    { label: 'تاریخ', value: formatDate(txn.createdAt) },
    { label: 'آخرین بروزرسانی', value: formatDate(txn.updatedAt) },
    {
      label: 'شناسه تراکنش',
      value: (
        <span dir="ltr" className={s.id}>
          {txn.id}
        </span>
      ),
    },
  ];

  return (
    <div className={s.root}>
      <div className={s.card}>
        <div className={s.header} data-credit={credit}>
          <span className={s.headerKind}>{KIND_LABEL[txn.kind] ?? txn.kind}</span>
          <span className={s.headerAmt} data-credit={credit}>
            {credit ? '+' : '−'}
            {formatNum(txn.amount, txn.currency)}
          </span>
        </div>

        <div className={s.rows}>
          {rows.map((row) => (
            <div key={row.label} className={s.row}>
              <span className={s.rowLabel}>{row.label}</span>
              <span className={s.rowValue}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <Link href="/customer/transactions" className={s.backLink}>
        بازگشت به تراکنش‌ها
      </Link>
    </div>
  );
}
