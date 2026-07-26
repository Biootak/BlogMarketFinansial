'use client';

import type { CustomerAccountDetail } from '@/actions/customer-portal';
import { EmptyState, Section } from '@/components/Dashboard/primitives';
import { ArrowDownLeft, ArrowUpRight, FileText } from 'lucide-react';
import Link from 'next/link';
import s from './AccountDetail.module.css';

interface LedgerRow {
  id: string;
  direction: string;
  amount: number;
  currency: string;
  runningBalance: number;
  description: string | null;
  createdAt: Date;
}

interface Props {
  account: CustomerAccountDetail;
  ledger: LedgerRow[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'در انتظار فعال‌سازی',
  ACTIVE: 'فعال',
  FROZEN: 'منجمد',
  CLOSED: 'بسته',
};

const TYPE_LABEL: Record<string, string> = {
  WALLET: 'کیف پول',
  SAVINGS: 'پس‌انداز',
  CHECKING: 'جاری',
  INVESTMENT: 'سرمایه‌گذاری',
};

function formatNum(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

export default function AccountDetail({ account, ledger }: Props) {
  return (
    <div className={s.root}>
      {/* Account summary card */}
      <div className={s.summaryCard} data-status={account.status}>
        <div className={s.summaryTop}>
          <div className={s.summaryTypeBlock}>
            <span className={s.summaryType}>{TYPE_LABEL[account.type] ?? account.type}</span>
            {account.label && <span className={s.summaryLabel}>{account.label}</span>}
          </div>
          <span className={s.summaryStatus} data-status={account.status}>
            {STATUS_LABEL[account.status] ?? account.status}
          </span>
        </div>

        <div className={s.summaryBalance}>
          <span className={s.summaryAmt}>{formatNum(account.balance)}</span>
          <span className={s.summaryCur}>{account.currency}</span>
        </div>

        {account.frozenUntil && (
          <p className={s.frozenNote}>
            منجمد تا: {new Intl.DateTimeFormat('fa-IR').format(account.frozenUntil)}
          </p>
        )}

        <p className={s.summaryDate}>
          افتتاح:{' '}
          {new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(account.createdAt)}
        </p>
      </div>

      {/* Ledger */}
      <Section title="دفتر حساب — آخرین تراکنش‌ها">
        {ledger.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="سابقه‌ای وجود ندارد"
            description="تراکنشی برای این حساب ثبت نشده است"
          />
        ) : (
          <div className={s.ledgerList}>
            <div className={s.ledgerHeader}>
              <span>شرح</span>
              <span>مبلغ</span>
              <span>مانده</span>
              <span>تاریخ</span>
            </div>
            {ledger.map((row) => (
              <div key={row.id} className={s.ledgerRow}>
                <div className={s.ledgerIcon} data-credit={row.direction === 'CREDIT'} aria-hidden>
                  {row.direction === 'CREDIT' ? (
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className={s.ledgerDesc}>
                  {row.description ?? (row.direction === 'CREDIT' ? 'واریز' : 'برداشت')}
                </span>
                <span className={s.ledgerAmt} data-credit={row.direction === 'CREDIT'}>
                  {row.direction === 'CREDIT' ? '+' : '−'}
                  {formatNum(row.amount)} {row.currency}
                </span>
                <span className={s.ledgerBal}>{formatNum(row.runningBalance)}</span>
                <span className={s.ledgerDate}>{formatDate(row.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Link href="/customer/accounts" className={s.backLink}>
        بازگشت به حساب‌ها
      </Link>
    </div>
  );
}
