/**
 * TransactionDetailView — نمایش یک تراکنش با همه جزئیات.
 *
 * ساختار بصری:
 *   ─────────────────────────────────────────────
 *   [Hero]   ۱۲۳٬۴۵۶ AFN     [Sign badge]      ← مبلغ با rail رنگی
 *            واریز از طرف مشتری
 *            [status pill] · [زمان]
 *   ─────────────────────────────────────────────
 *   [left col 2fr]            [right col 1fr]
 *   Amount Transit visual     مشتری (کارت)
 *   (اگر EXCHANGE)            زمان دقیق
 *                             کارمزد
 *   تب‌ها:                    [Actions]
 *     - جزئیات                [Print receipt]
 *     - یادداشت‌ها             [Reverse]
 *   ─────────────────────────────────────────────
 *   [Actions rail — drawer ها: reverse, edit]
 */

'use client';

import type { CustomerRow } from '@/actions/exchange-customers';
import type { TransactionRow } from '@/actions/exchange-transactions';
import { TX_KIND_FA, TX_STATUS_FA } from '@/lib/exchange-labels';
import { faNum, formatAmount, formatAmountShort } from '@/lib/exchange-tx-formatters';
import {
  ArrowLeftRight,
  CalendarDays,
  CircleDollarSign,
  Clipboard,
  Coins,
  CornerUpRight,
  CreditCard,
  ExternalLink,
  FileText,
  Hash,
  type LucideIcon,
  MapPin,
  Phone,
  Printer,
  Send,
  StickyNote,
  User,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import s from './TransactionDetailView.module.css';

const KIND_ICON: Record<string, LucideIcon> = {
  DEPOSIT: CircleDollarSign,
  WITHDRAWAL: Send,
  EXCHANGE: ArrowLeftRight,
  TRANSFER: Send,
  FEE: Coins,
  SETTLEMENT: WalletCards,
  ADJUSTMENT: FileText,
};

const STATUS_KEY: Record<string, 'pending' | 'progress' | 'success' | 'danger' | 'cancelled'> = {
  PENDING: 'pending',
  PROCESSING: 'progress',
  COMPLETED: 'success',
  FAILED: 'danger',
  REVERSED: 'danger',
  CANCELLED: 'cancelled',
};

const TABS = [
  { id: 'details', label: 'جزئیات' },
  { id: 'notes', label: 'یادداشت' },
  { id: 'system', label: 'سیستم' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function TransactionDetailView({
  transaction,
  exchangeName,
  canEdit,
  canAdd,
  customers,
}: {
  transaction: TransactionRow;
  exchangeName: string;
  canEdit: boolean;
  canAdd: boolean;
  customers: CustomerRow[];
}) {
  const [tab, setTab] = useState<TabId>('details');
  const Icon = KIND_ICON[transaction.kind] ?? CircleDollarSign;
  const kindLabel = TX_KIND_FA[transaction.kind] ?? transaction.kind;
  const statusConf = TX_STATUS_FA[transaction.status];
  const statusKey = STATUS_KEY[transaction.status] ?? 'pending';
  const isCredit = transaction.kind === 'DEPOSIT';
  const isDebit = transaction.kind === 'WITHDRAWAL' || transaction.kind === 'FEE';
  const sign = isCredit ? '+' : isDebit ? '−' : '';
  const customer = customers.find((c) => c.id === transaction.customerId);
  const isExchange = transaction.kind === 'EXCHANGE';

  return (
    <article className={s.root} data-tone={isCredit ? 'credit' : isDebit ? 'debit' : 'neutral'}>
      {/* ── Hero (rail رنگی + مبلغ بزرگ) ─────────────────────────────── */}
      <header className={s.hero}>
        <span className={s.heroRail} aria-hidden />
        <div className={s.heroIcon}>
          <Icon size={18} strokeWidth={1.6} aria-hidden />
        </div>
        <div className={s.heroMain}>
          <div className={s.heroTopRow}>
            <span className={s.kindLabel}>{kindLabel}</span>
            <span className={s.statusPill} data-status={statusKey}>
              <span className={s.statusDot} aria-hidden />
              {statusConf?.label ?? transaction.status}
            </span>
          </div>
          <h1 className={s.amount} dir="ltr">
            <span className={s.amountSign} aria-hidden>
              {sign}
            </span>
            <span className={s.amountValue}>
              {formatAmount(transaction.amount, transaction.currency).replace(
                ` ${transaction.currency}`,
                '',
              )}
            </span>
            <span className={s.amountCurrency}>{transaction.currency}</span>
          </h1>
          {isExchange && transaction.destAmount && transaction.destCurrency && (
            <div className={s.transit} aria-label="مقصد تراکنش">
              <ArrowLeftRight size={12} aria-hidden className={s.transitIcon} />
              <span className={s.transitFrom}>
                {formatAmount(transaction.amount, transaction.currency)}
              </span>
              <span className={s.transitArrow} aria-hidden>
                ←
              </span>
              <span className={s.transitTo}>
                {formatAmount(transaction.destAmount, transaction.destCurrency)}
              </span>
            </div>
          )}
        </div>
        <div className={s.heroMeta}>
          <time className={s.heroTime} dateTime={transaction.createdAt} suppressHydrationWarning>
            {new Date(transaction.createdAt).toLocaleString('fa-IR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          <span className={s.heroId}>
            <Hash size={10} aria-hidden />
            <span dir="ltr">{transaction.id.slice(0, 8)}</span>
          </span>
        </div>
      </header>

      {/* ── 2-column body ────────────────────────────────────────────── */}
      <div className={s.body}>
        {/* ── Left: Tabs + content ─────────────────────────────────── */}
        <section className={s.leftCol}>
          <nav className={s.tabs} role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={s.tab}
                data-active={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className={s.tabContent}>
            {tab === 'details' && (
              <div className={s.detailsGrid}>
                <DetailItem
                  icon={User}
                  label="مشتری"
                  value={
                    customer ? (
                      <Link href={`/exchange/customers/${customer.id}`} className={s.linkValue}>
                        {customer.fullName}
                        <ExternalLink size={10} aria-hidden />
                      </Link>
                    ) : transaction.customer?.fullName ? (
                      transaction.customer.fullName
                    ) : (
                      '—'
                    )
                  }
                />
                <DetailItem
                  icon={Phone}
                  label="تماس"
                  value={
                    (customer?.phone ?? transaction.customer?.phone) ? (
                      <span dir="ltr">{customer?.phone ?? transaction.customer?.phone}</span>
                    ) : (
                      '—'
                    )
                  }
                />
                <DetailItem icon={CreditCard} label="ارز" value={transaction.currency} />
                <DetailItem
                  icon={Coins}
                  label="کارمزد"
                  value={
                    Number.parseFloat(transaction.fee) > 0
                      ? formatAmount(transaction.fee, transaction.currency)
                      : 'بدون کارمزد'
                  }
                />
                {transaction.rate && (
                  <DetailItem
                    icon={ArrowLeftRight}
                    label="نرخ تبدیل"
                    value={<span dir="ltr">{faNum(transaction.rate)}</span>}
                  />
                )}
                {transaction.counterparty && (
                  <DetailItem icon={MapPin} label="طرف حساب" value={transaction.counterparty} />
                )}
                <DetailItem
                  icon={CalendarDays}
                  label="تاریخ ثبت"
                  value={
                    <span suppressHydrationWarning>
                      {new Date(transaction.createdAt).toLocaleString('fa-IR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  }
                />
                <DetailItem
                  icon={CalendarDays}
                  label="آخرین تغییر"
                  value={
                    <span suppressHydrationWarning>
                      {new Date(transaction.updatedAt).toLocaleString('fa-IR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  }
                />
              </div>
            )}

            {tab === 'notes' && (
              <div className={s.notesBox}>
                {transaction.note ? (
                  <p className={s.noteText}>{transaction.note}</p>
                ) : (
                  <p className={s.noteEmpty}>یادداشتی برای این تراکنش ثبت نشده است.</p>
                )}
              </div>
            )}

            {tab === 'system' && (
              <div className={s.systemBox}>
                <DetailItem
                  icon={Hash}
                  label="شناسه یکتا"
                  value={
                    <span dir="ltr" className={s.mono}>
                      {transaction.id}
                    </span>
                  }
                />
                {transaction.idempotencyKey && (
                  <DetailItem
                    icon={Hash}
                    label="کلید یکتایی"
                    value={
                      <span dir="ltr" className={s.mono}>
                        {transaction.idempotencyKey}
                      </span>
                    }
                  />
                )}
                <DetailItem icon={MapPin} label="صرافی" value={exchangeName} />
              </div>
            )}
          </div>
        </section>

        {/* ── Right: Side card (actions + summary) ──────────────────── */}
        <aside className={s.rightCol}>
          <div className={s.summaryCard}>
            <h2 className={s.summaryTitle}>خلاصه سریع</h2>
            <ul className={s.summaryList}>
              <li className={s.summaryItem}>
                <span>مبلغ ناخالص</span>
                <strong className={s.summaryVal} dir="ltr">
                  {formatAmountShort(transaction.amount, transaction.currency)}
                </strong>
              </li>
              <li className={s.summaryItem}>
                <span>کارمزد</span>
                <strong className={s.summaryVal} dir="ltr">
                  {formatAmountShort(transaction.fee, transaction.currency)}
                </strong>
              </li>
              <li className={s.summaryItem}>
                <span>وضعیت</span>
                <strong className={s.summaryVal}>{statusConf?.label ?? transaction.status}</strong>
              </li>
            </ul>
          </div>

          <div className={s.actionsCard}>
            <h2 className={s.summaryTitle}>اقدامات</h2>
            <div className={s.actionsList}>
              <button type="button" className={s.actionBtn} onClick={() => window.print()}>
                <Printer size={12} aria-hidden />
                <span>چاپ رسید</span>
              </button>
              <button
                type="button"
                className={s.actionBtn}
                onClick={() => {
                  void navigator.clipboard.writeText(transaction.id);
                }}
              >
                <Clipboard size={12} aria-hidden />
                <span>کپی شناسه</span>
              </button>
              {customer && (
                <Link href={`/exchange/customers/${customer.id}`} className={s.actionBtn}>
                  <User size={12} aria-hidden />
                  <span>پرونده مشتری</span>
                  <ExternalLink size={9} aria-hidden className={s.actionExt} />
                </Link>
              )}
              {canEdit && transaction.status === 'COMPLETED' && (
                <button
                  type="button"
                  className={`${s.actionBtn} ${s.actionDanger}`}
                  disabled
                  aria-label="برگشت تراکنش — فقط در نسخه‌های آتی"
                >
                  <CornerUpRight size={12} aria-hidden />
                  <span>برگشت تراکنش</span>
                </button>
              )}
              {canAdd && (
                <Link href="/exchange/transactions" className={`${s.actionBtn} ${s.actionPrimary}`}>
                  <StickyNote size={12} aria-hidden />
                  <span>ثبت تراکنش جدید</span>
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={s.detailItem}>
      <span className={s.detailIcon} aria-hidden>
        <Icon size={11} strokeWidth={1.6} />
      </span>
      <div className={s.detailBody}>
        <span className={s.detailLabel}>{label}</span>
        <span className={s.detailValue}>{value}</span>
      </div>
    </div>
  );
}
