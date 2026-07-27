/**
 * ExchangeRecentTransactions — آخرین تراکنش‌های صراف.
 *
 * Server Component. version 2026-07-27 — visual rewrite به سبک
 * «rich card row» با dot رنگی kind + status pill.
 */

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import s from './ExchangeDashboard.module.css';
import { TX_KIND_FA, TX_STATUS_LABEL, TX_KIND_COLOR } from '@/lib/exchange-labels';
import type { TransactionRow } from '@/actions/exchange-transactions';

function formatAmount(amountStr: string, currency: string): string {
  return `${new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number(BigInt(amountStr)) / 100,
  )} ${currency}`;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

export default function ExchangeRecentTransactions({
  transactions,
  limit = 8,
}: {
  transactions: TransactionRow[];
  limit?: number;
}) {
  const items = transactions.slice(0, limit);

  if (items.length === 0) {
    return (
      <div className={s.recentEmpty}>
        هنوز تراکنشی ثبت نشده است.
      </div>
    );
  }

  return (
    <>
      <ul className={s.recentList} aria-label="آخرین تراکنش‌ها">
        {items.map((t) => {
          const kindColor = TX_KIND_COLOR[t.kind] ?? 'var(--at-fg-muted)';
          const statusLabel = TX_STATUS_LABEL[t.status] ?? t.status;
          const date = new Date(t.createdAt);
          const isToday = new Date().toDateString() === date.toDateString();
          return (
            <li key={t.id}>
              <Link
                href={`/exchange/transactions/${t.id}`}
                className={s.recentItem}
                aria-label={`${t.customer?.fullName ?? 'تراکنش'} — ${TX_KIND_FA[t.kind] ?? t.kind}`}
              >
                <span
                  className={s.recentKindDot}
                  style={{ background: kindColor }}
                  aria-hidden
                />
                <span className={s.recentMain}>
                  <span className={s.recentName}>
                    {t.customer?.fullName ?? t.counterparty ?? 'بدون نام'}
                  </span>
                  <span className={s.recentDate}>
                    {isToday ? 'امروز' : formatDate(t.createdAt)} · {formatTime(t.createdAt)}
                    {' · '}
                    {TX_KIND_FA[t.kind] ?? t.kind}
                  </span>
                </span>
                <span className={s.recentAmount} dir="ltr">
                  {formatAmount(t.amount, t.currency)}
                </span>
                <span className={s.recentStatus} data-status={t.status}>
                  {statusLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {transactions.length > limit && (
        <div className={s.recentFooter}>
          <Link href="/exchange/transactions" className={s.recentFooterLink}>
            مشاهده همه ({new Intl.NumberFormat('fa-IR').format(transactions.length)} تراکنش)
            <ChevronLeft size={12} aria-hidden style={{ transform: 'scaleX(-1)' }} />
          </Link>
        </div>
      )}
    </>
  );
}
