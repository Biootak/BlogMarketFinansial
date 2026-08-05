/**
 * TransactionsTable — جدول تراکنش‌های صرافی.
 *
 * از DataTable primitive (موجود در repo) استفاده می‌کند — هیچ markup تکراری.
 * ستون‌ها: ردیف، نوع/وضعیت، مشتری/طرف حساب، مبلغ، ارز، کارمزد، تاریخ، عملیات.
 * تبدیل amount از string (BigInt-safe) به فرمت قابل نمایش.
 *
 * Server Component — props از قبل serialize شده‌اند.
 */

import type { TransactionRow } from '@/actions/exchange-transactions';
import { type Column, DataTable } from '@/components/Dashboard/primitives';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Receipt,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import s from './TransactionsTable.module.css';

const KIND_META: Record<
  string,
  {
    label: string;
    Icon: typeof Send;
    tone: 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose' | 'muted';
  }
> = {
  DEPOSIT: { label: 'واریز', Icon: ArrowDownLeft, tone: 'emerald' },
  WITHDRAWAL: { label: 'برداشت', Icon: ArrowUpRight, tone: 'rose' },
  EXCHANGE: { label: 'صرافی', Icon: RefreshCw, tone: 'cyan' },
  TRANSFER: { label: 'انتقال', Icon: Send, tone: 'violet' },
  FEE: { label: 'کارمزد', Icon: Receipt, tone: 'amber' },
};

const STATUS_META: Record<
  string,
  { label: string; tone: 'emerald' | 'amber' | 'rose' | 'muted'; Icon: typeof CheckCircle2 }
> = {
  COMPLETED: { label: 'تکمیل', tone: 'emerald', Icon: CheckCircle2 },
  PENDING: { label: 'در انتظار', tone: 'amber', Icon: Clock },
  FAILED: { label: 'ناموفق', tone: 'rose', Icon: XCircle },
  CANCELLED: { label: 'لغو', tone: 'muted', Icon: XCircle },
};

const fmtNum = (v: string | number): string => {
  const n = typeof v === 'string' ? Number(v) : v;
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(n / 100);
};

const fmtDate = (s: string): string =>
  new Intl.DateTimeFormat('fa-IR', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(s));

interface Props {
  rows: TransactionRow[];
  total: number;
  className?: string;
}

export default function TransactionsTable({ rows, total, className }: Props) {
  const columns: Column<TransactionRow>[] = [
    {
      key: 'kind',
      header: 'نوع',
      width: 110,
      collapse: false,
      render: (r) => {
        const meta = KIND_META[r.kind] ?? { label: r.kind, Icon: Send, tone: 'muted' as const };
        const Icon = meta.Icon;
        return (
          <span className={s.kind} data-tone={meta.tone}>
            <span className={s.kindIcon} data-tone={meta.tone} aria-hidden>
              <Icon size={12} strokeWidth={1.75} />
            </span>
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'customer',
      header: 'مشتری / طرف حساب',
      collapse: false,
      render: (r) => (
        <div className={s.customerCell}>
          <span className={s.customerName}>{r.customer?.fullName ?? r.counterparty ?? '—'}</span>
          {r.customer?.phone ? <span className={s.customerPhone}>{r.customer.phone}</span> : null}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'مبلغ',
      width: 130,
      collapse: false,
      render: (r) => (
        <span className={s.amount} data-tone={r.kind === 'WITHDRAWAL' ? 'rose' : 'emerald'}>
          {r.kind === 'WITHDRAWAL' ? '−' : '+'}
          {fmtNum(r.amount)}
          <em className={s.amountCurrency}>{r.currency}</em>
        </span>
      ),
    },
    {
      key: 'dest',
      header: 'مقصد',
      width: 100,
      collapse: true,
      render: (r) =>
        r.destAmount && r.destCurrency ? (
          <span className={s.dest}>
            {fmtNum(r.destAmount)} <em className={s.destCurrency}>{r.destCurrency}</em>
          </span>
        ) : (
          <span className={s.muted}>—</span>
        ),
    },
    {
      key: 'fee',
      header: 'کارمزد',
      width: 90,
      collapse: true,
      render: (r) =>
        r.fee && Number(r.fee) > 0 ? (
          <span className={s.fee}>
            {fmtNum(r.fee)} <em className={s.feeCurrency}>IRR</em>
          </span>
        ) : (
          <span className={s.muted}>—</span>
        ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      width: 100,
      collapse: false,
      render: (r) => {
        const meta = STATUS_META[r.status] ?? {
          label: r.status,
          tone: 'muted' as const,
          Icon: Clock,
        };
        const Icon = meta.Icon;
        return (
          <span className={s.status} data-tone={meta.tone}>
            <Icon size={11} strokeWidth={2} aria-hidden />
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'date',
      header: 'تاریخ',
      width: 120,
      collapse: true,
      render: (r) => <span className={s.date}>{fmtDate(r.createdAt)}</span>,
    },
  ];

  return (
    <section className={`${s.section} ${className ?? ''}`} aria-label="تراکنش‌ها">
      <header className={s.head}>
        <div className={s.headLeft}>
          <span className={s.eyebrow}>
            <Receipt size={11} strokeWidth={1.75} aria-hidden />
            تراکنش‌ها
          </span>
          <h2 className={s.title}>لیست کامل تراکنش‌ها</h2>
        </div>
        <span className={s.total}>{new Intl.NumberFormat('fa-IR').format(total)} رکورد</span>
      </header>

      <div className="overflow-x-auto">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} ariaLabel="جدول تراکنش‌ها" />
      </div>
    </section>
  );
}
