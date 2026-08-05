/**
 * TransactionsTable — جدول تراکنش‌های صرافی.
 *
 * دسکتاپ: DataTable primitive (flex table).
 * موبایل (≤640px): card list — هر ردیف یه کارت کامپکت.
 *
 * Server Component — props از قبل serialize شده‌اند.
 */

import type { TransactionRow } from '@/actions/exchange-transactions';
import { type Column, DataTable } from '@/components/Dashboard/primitives';
import {
  ArrowDownLeft,
  ArrowLeftRight,
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
      width: 90,
      collapse: false,
      render: (r) => {
        const meta = KIND_META[r.kind] ?? { label: r.kind, Icon: Send, tone: 'muted' as const };
        const Icon = meta.Icon;
        return (
          <span className={s.kind} data-tone={meta.tone}>
            <span className={s.kindIcon} data-tone={meta.tone} aria-hidden>
              <Icon size={11} strokeWidth={1.75} />
            </span>
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'customer',
      header: 'مشتری',
      width: 140,
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
      width: 150,
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
      width: 120,
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
      width: 110,
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
      width: 88,
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
            <Icon size={10} strokeWidth={2} aria-hidden />
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'date',
      header: 'تاریخ',
      width: 130,
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

      {/* ── Desktop: DataTable (hidden on mobile) ──────────────────── */}
      <div className={`${s.desktopOverrides} hidden sm:block overflow-x-auto`}>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} ariaLabel="جدول تراکنش‌ها" />
      </div>

      {/* ── Mobile: card list (hidden on sm+) ──────────────────────── */}
      <ol className={`${s.mobileList} flex sm:hidden`} aria-label="لیست تراکنش‌ها">
        {rows.length === 0 ? (
          <li className={s.mobileEmpty}>موردی یافت نشد</li>
        ) : (
          rows.map((r) => {
            const kind = KIND_META[r.kind] ?? { label: r.kind, Icon: Send, tone: 'muted' as const };
            const status = STATUS_META[r.status] ?? {
              label: r.status,
              tone: 'muted' as const,
              Icon: Clock,
            };
            const KindIcon = kind.Icon;
            const StatusIcon = status.Icon;
            const isOut = r.kind === 'WITHDRAWAL';
            const sign = isOut ? '−' : '+';
            return (
              <li key={r.id} className={s.mobileCard}>
                {/* ردیف بالا: آیکون + نوع + مبلغ */}
                <div className={s.mobileTop}>
                  <span className={s.kindIcon} data-tone={kind.tone} aria-hidden>
                    <KindIcon size={12} strokeWidth={1.75} />
                  </span>
                  <span className={s.mobileKind}>{kind.label}</span>
                  {r.kind === 'EXCHANGE' && r.destAmount && r.destCurrency && (
                    <span className={s.mobileExchange}>
                      <ArrowLeftRight size={9} aria-hidden />
                      {fmtNum(r.destAmount)} {r.destCurrency}
                    </span>
                  )}
                  <span className={s.mobileAmount} data-tone={isOut ? 'rose' : 'emerald'}>
                    {sign}
                    {fmtNum(r.amount)}
                    <em className={s.amountCurrency}>{r.currency}</em>
                  </span>
                </div>
                {/* ردیف پایین: مشتری + وضعیت + تاریخ */}
                <div className={s.mobileMeta}>
                  <span className={s.mobileCustomer}>
                    {r.customer?.fullName ?? r.counterparty ?? '—'}
                  </span>
                  <span className={s.dot} aria-hidden />
                  <span className={s.status} data-tone={status.tone}>
                    <StatusIcon size={9} strokeWidth={2} aria-hidden />
                    {status.label}
                  </span>
                  <span className={s.dot} aria-hidden />
                  <span className={s.date}>{fmtDate(r.createdAt)}</span>
                </div>
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}
