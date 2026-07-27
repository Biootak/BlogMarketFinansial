'use client';

/**
 * AccountDetail — «برگه حساب» (دفتر کل تکی)
 * ----------------------------------------------------------------------------
 *  - Account header:  موجودی برجسته + status rail + meta
 *  - Quick stats:     تعداد، میانگین، سقف (KeyValue)
 *  - Ledger:          دفتر ۲۰ ردیف آخر با running balance (execution rail)
 *  - Risk:            نمایش frozen until
 *  - Empty:           اگر ledger خالی باشد
 */

import type { CustomerAccountDetail } from '@/actions/customer-portal';
import {
  ACCOUNT_TYPE_LABEL,
  faDate,
  faDateTime,
  faNum,
  relativeTime,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import {
  KeyValueRow,
  LiveDot,
  SectionHeader,
  StatusPill,
  StatusRail,
} from '@/app/(customer)/customer/_lib/customer-ui';
import { Activity, ArrowDownLeft, ArrowUpRight, CreditCard, Lock, Snowflake, Wallet } from 'lucide-react';
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

const STATUS_CSSKEY: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  FROZEN: 'warning',
  PENDING: 'neutral',
  CLOSED: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'فعال',
  FROZEN: 'منجمد',
  PENDING: 'در انتظار',
  CLOSED: 'بسته',
};

export default function AccountDetail({ account, ledger }: Props) {
  const statusKey = STATUS_CSSKEY[account.status] ?? 'neutral';
  const creditTotal = ledger
    .filter((l) => l.direction === 'CREDIT')
    .reduce((s, l) => s + l.amount, 0);
  const debitTotal = ledger
    .filter((l) => l.direction === 'DEBIT')
    .reduce((s, l) => s + l.amount, 0);
  const netFlow = creditTotal - debitTotal;
  const isFrozen = account.status === 'FROZEN';

  return (
    <div className={s.root} dir="rtl">
      {/* ── Account Hero ─────────────────────────────────────────────── */}
      <section
        className={s.hero}
        data-status={statusKey}
        aria-label={`جزئیات حساب ${account.currency}`}
      >
        <StatusRail variant={statusKey} />
        <div className={s.heroInner}>
          <div className={s.heroLeft}>
            <div className={s.heroEyebrow}>
              <span className={s.heroEyebrowIcon} aria-hidden>
                <Wallet size={11} />
              </span>
              <span>{ACCOUNT_TYPE_LABEL[account.type] ?? account.type}</span>
              {account.label && (
                <>
                  <span className={s.heroDivider} aria-hidden />
                  <span className={s.heroLabel}>{account.label}</span>
                </>
              )}
            </div>
            <div className={s.heroBalance}>
              <span className={s.heroBalanceNumber}>{faNum(account.balance)}</span>
              <span className={s.heroBalanceUnit}>{account.currency}</span>
            </div>
            <div className={s.heroMeta}>
              <StatusPill variant={statusKey}>
                <StatusRailInline />
                {STATUS_LABEL[account.status] ?? account.status}
              </StatusPill>
              <span className={s.heroMetaSep} aria-hidden />
              <span className={s.heroMetaDate}>
                <LiveDot size={4} tone="brand" />
                افتتاح {faDate(account.createdAt)}
              </span>
            </div>
          </div>

          <div className={s.heroRight}>
            {isFrozen ? (
              <div className={s.frozenCard} role="status">
                <span className={s.frozenIcon} aria-hidden>
                  <Snowflake size={12} />
                </span>
                <div className={s.frozenText}>
                  <strong>حساب منجمد</strong>
                  {account.frozenUntil && (
                    <span>تا {faDate(account.frozenUntil)}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className={s.healthyCard} role="status">
                <span className={s.healthyIcon} aria-hidden>
                  <Activity size={12} />
                </span>
                <div className={s.healthyText}>
                  <strong>عملیاتی</strong>
                  <span>آماده تراکنش</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Quick Stats (KeyValue) ────────────────────────────────────── */}
      <section className={s.statsCard} aria-label="آمار کلی">
        <div className={s.statBlock}>
          <span className={s.statLabel}>
            <ArrowDownLeft size={10} aria-hidden />
            کل ورودی
          </span>
          <span className={s.statValue} data-tone="credit">
            +{faNum(creditTotal)}
          </span>
          <span className={s.statUnit}>{account.currency}</span>
        </div>
        <div className={s.statBlock}>
          <span className={s.statLabel}>
            <ArrowUpRight size={10} aria-hidden />
            کل خروجی
          </span>
          <span className={s.statValue} data-tone="debit">
            −{faNum(debitTotal)}
          </span>
          <span className={s.statUnit}>{account.currency}</span>
        </div>
        <div className={s.statBlock}>
          <span className={s.statLabel}>
            <CreditCard size={10} aria-hidden />
            جریان خالص
          </span>
          <span className={s.statValue} data-tone={netFlow >= 0 ? 'credit' : 'debit'}>
            {netFlow >= 0 ? '+' : '−'}
            {faNum(Math.abs(netFlow))}
          </span>
          <span className={s.statUnit}>{account.currency}</span>
        </div>
        <div className={s.statBlock}>
          <span className={s.statLabel}>
            <Activity size={10} aria-hidden />
            تعداد رکورد
          </span>
          <span className={s.statValue}>{faNum(ledger.length)}</span>
          <span className={s.statUnit}>ردیف</span>
        </div>
      </section>

      {/* ── Account Meta (KeyValue) ───────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={Lock} title="جزئیات حساب" />
        <div className={s.kvList}>
          <KeyValueRow label="نوع حساب" value={ACCOUNT_TYPE_LABEL[account.type] ?? account.type} />
          <KeyValueRow label="ارز" value={account.currency} mono />
          <KeyValueRow
            label="شناسه حساب"
            value={account.id.slice(0, 12) + '…'}
            mono
            dir="ltr"
          />
          <KeyValueRow
            label="موجودی فعلی"
            value={
              <span style={{ color: 'var(--ds-text-primary)', fontWeight: 700 }}>
                {faNum(account.balance)} {account.currency}
              </span>
            }
            mono
          />
          <KeyValueRow
            label="تاریخ افتتاح"
            value={faDate(account.createdAt)}
          />
          {account.frozenUntil && (
            <KeyValueRow
              label="پایان انجماد"
              value={faDate(account.frozenUntil)}
            />
          )}
        </div>
      </section>

      {/* ── Ledger ───────────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={Activity}
          title="دفتر کل"
          sub={`${faNum(ledger.length)} ردیف اخیر`}
        />
        {ledger.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon} aria-hidden>
              <Activity size={18} />
            </span>
            <strong>هیچ حرکتی ثبت نشده</strong>
            <p>اولین تراکنش شما پس از فعال‌سازی حساب اینجا نمایش داده می‌شود.</p>
          </div>
        ) : (
          <ol className={s.ledger}>
            {ledger.map((row, i) => {
              const isCredit = row.direction === 'CREDIT';
              const toneKey: 'credit' | 'debit' = isCredit ? 'credit' : 'debit';
              return (
                <li
                  key={row.id}
                  className={s.ledgerRow}
                  data-tone={toneKey}
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <span className={s.ledgerIndex} aria-hidden>
                    {faNum(ledger.length - i)}
                  </span>
                  <span className={s.ledgerIcon} aria-hidden>
                    {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                  </span>
                  <div className={s.ledgerMain}>
                    <span className={s.ledgerDescription}>
                      {row.description ?? (isCredit ? 'واریز' : 'برداشت')}
                    </span>
                    <span className={s.ledgerDate} title={faDateTime(row.createdAt)}>
                      {relativeTime(row.createdAt)}
                    </span>
                  </div>
                  <div className={s.ledgerRight}>
                    <span
                      className={s.ledgerAmount}
                      data-tone={toneKey}
                    >
                      {isCredit ? '+' : '−'}
                      {faNum(row.amount)}
                    </span>
                    <span className={s.ledgerBalance}>
                      مانده {faNum(row.runningBalance)} {row.currency}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

// Small inline rail for inside the pill
function StatusRailInline() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        inlineSize: 4,
        blockSize: 4,
        borderRadius: '50%',
        background: 'currentColor',
        marginInlineEnd: '0.4em',
      }}
    />
  );
}
