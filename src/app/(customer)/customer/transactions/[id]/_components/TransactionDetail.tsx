'use client';

/**
 * TransactionDetail — «سند اجرا» (Execution Receipt)
 * ----------------------------------------------------------------------------
 *  - Hero:     amount + status + kind (signature block)
 *  - Timeline: execution rail (created → updated → current status)
 *  - Detail:   key-value (rate, fee, external ref, etc.)
 *  - Note:     متن یادداشت تراکنش
 *  - Actions:  link back to list
 */

import type { CustomerTransactionDetail } from '@/actions/customer-portal';
import {
  KIND_CSSKEY,
  KIND_LABEL,
  STATUS_LABEL,
  TXN_STATUS_CSSKEY,
  faAmount,
  faDateTime,
  faDateTimeFull,
  faNum,
  relativeTime,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import {
  KindIcon,
  LiveDot,
  SectionHeader,
  StatusPill,
  ViewAllLink,
} from '@/app/(customer)/customer/_lib/customer-ui';
import { Activity, CheckCircle2, FileText, Hash, Layers, Receipt, User } from 'lucide-react';
import s from './TransactionDetail.module.css';

interface Props {
  txn: CustomerTransactionDetail;
}

export default function TransactionDetail({ txn }: Props) {
  const statusKey = TXN_STATUS_CSSKEY[txn.status] ?? 'neutral';
  const kindKey = KIND_CSSKEY[txn.kind] ?? 'neutral';
  const isCredit = kindKey === 'credit';
  const isDebit = kindKey === 'debit';

  return (
    <div className={s.root} dir="rtl">
      {/* ── Hero: signature receipt block ─────────────────────────────── */}
      <section className={s.hero} data-status={statusKey} data-tone={kindKey} aria-label="جزئیات تراکنش">
        <div className={s.heroTop}>
          <div className={s.heroKind}>
            <span className={s.heroIcon} aria-hidden>
              <KindIcon kind={txn.kind} size={14} />
            </span>
            <span className={s.heroKindLabel}>{KIND_LABEL[txn.kind] ?? txn.kind}</span>
            <StatusPill variant={statusKey}>
              <LiveDot size={4} tone={statusKey === 'success' ? 'success' : statusKey === 'danger' ? 'danger' : 'warning'} />
              {STATUS_LABEL[txn.status] ?? txn.status}
            </StatusPill>
          </div>
          <div className={s.heroAmount} data-tone={isDebit ? 'debit' : isCredit ? 'credit' : 'neutral'}>
            <span className={s.heroAmountNumber}>
              {isCredit ? '+' : isDebit ? '−' : ''}
              {faNum(txn.amount)}
            </span>
            <span className={s.heroAmountUnit}>{txn.currency}</span>
          </div>
          {txn.destAmount && txn.destCurrency && (
            <div className={s.heroDest} aria-label="مبلغ مقصد">
              <span className={s.heroDestIcon} aria-hidden>→</span>
              <span className={s.heroDestValue}>
                {faNum(txn.destAmount)} {txn.destCurrency}
              </span>
              {txn.rate && (
                <span className={s.heroDestRate}>
                  نرخ {faNum(txn.rate)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className={s.heroFoot}>
          <div className={s.heroMeta}>
            <span className={s.heroMetaLabel}>ایجاد</span>
            <span className={s.heroMetaValue} title={faDateTimeFull(txn.createdAt)}>
              {relativeTime(txn.createdAt)}
            </span>
          </div>
          <span className={s.heroSep} aria-hidden />
          <div className={s.heroMeta}>
            <span className={s.heroMetaLabel}>آخرین به‌روزرسانی</span>
            <span className={s.heroMetaValue} title={faDateTimeFull(txn.updatedAt)}>
              {faDateTime(txn.updatedAt)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Execution Timeline ────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={Activity} title="مراحل اجرا" />
        <ol className={s.timeline} aria-label="مراحل اجرای تراکنش">
          <li className={s.tlStep} data-done="true">
            <span className={s.tlDot} aria-hidden>
              <CheckCircle2 size={11} />
            </span>
            <div className={s.tlMain}>
              <span className={s.tlTitle}>درخواست ایجاد شد</span>
              <span className={s.tlDate}>{faDateTime(txn.createdAt)}</span>
            </div>
            <span className={s.tlStatus} data-status="success">
              تکمیل
            </span>
          </li>
          <li className={s.tlStep} data-done={txn.status === 'PROCESSING' || txn.status === 'COMPLETED' || txn.status === 'FAILED' || txn.status === 'REVERSED' || txn.status === 'CANCELLED'}>
            <span className={s.tlDot} aria-hidden>
              {txn.status === 'PENDING' ? <LiveDot size={6} tone="warning" /> : <CheckCircle2 size={11} />}
            </span>
            <div className={s.tlMain}>
              <span className={s.tlTitle}>
                {txn.status === 'PENDING' ? 'در انتظار پردازش' : 'پردازش انجام شد'}
              </span>
              <span className={s.tlDate}>
                {txn.status === 'PENDING' ? '—' : faDateTime(txn.updatedAt)}
              </span>
            </div>
            <span className={s.tlStatus} data-status={txn.status === 'PENDING' ? 'progress' : 'success'}>
              {txn.status === 'PENDING' ? 'جاری' : 'تکمیل'}
            </span>
          </li>
          <li className={s.tlStep} data-done={txn.status === 'COMPLETED'}>
            <span className={s.tlDot} aria-hidden>
              {txn.status === 'COMPLETED' ? (
                <CheckCircle2 size={11} />
              ) : txn.status === 'FAILED' || txn.status === 'REVERSED' ? (
                <span className={s.tlDotFail}>×</span>
              ) : (
                <LiveDot size={6} tone="neutral" />
              )}
            </span>
            <div className={s.tlMain}>
              <span className={s.tlTitle}>
                {txn.status === 'COMPLETED'
                  ? 'تسویه موفق'
                  : txn.status === 'FAILED'
                    ? 'ناموفق'
                    : txn.status === 'REVERSED'
                      ? 'برگشت خورده'
                      : txn.status === 'CANCELLED'
                        ? 'لغو شده'
                        : 'در انتظار تسویه'}
              </span>
              <span className={s.tlDate}>
                {txn.status === 'COMPLETED' || txn.status === 'FAILED' || txn.status === 'REVERSED' || txn.status === 'CANCELLED'
                  ? faDateTime(txn.updatedAt)
                  : '—'}
              </span>
            </div>
            <span
              className={s.tlStatus}
              data-status={
                txn.status === 'COMPLETED'
                  ? 'success'
                  : txn.status === 'FAILED' || txn.status === 'REVERSED'
                    ? 'danger'
                    : txn.status === 'CANCELLED'
                      ? 'cancelled'
                      : 'pending'
              }
            >
              {txn.status === 'COMPLETED'
                ? 'تکمیل'
                : txn.status === 'FAILED'
                  ? 'خطا'
                  : txn.status === 'REVERSED'
                    ? 'برگشت'
                    : txn.status === 'CANCELLED'
                      ? 'لغو'
                      : '—'}
            </span>
          </li>
        </ol>
      </section>

      {/* ── Detail KeyValue ───────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={Receipt} title="جزئیات" />
        <div className={s.kvList}>
          <KV label="نوع تراکنش" value={KIND_LABEL[txn.kind] ?? txn.kind} icon={Layers} />
          <KV label="ارز مبدأ" value={txn.currency} mono />
          {txn.destCurrency && <KV label="ارز مقصد" value={txn.destCurrency} mono />}
          {txn.rate && (
            <KV
              label="نرخ تبدیل"
              value={
                <span style={{ color: 'var(--ds-text-primary)', fontWeight: 700 }}>
                  {faNum(txn.rate)} {txn.currency}/{txn.destCurrency}
                </span>
              }
              mono
            />
          )}
          {txn.fee > 0 && (
            <KV
              label="کارمزد"
              value={
                <span style={{ color: 'var(--nova-down)', fontWeight: 700 }}>
                  −{faAmount(txn.fee, txn.currency)}
                </span>
              }
            />
          )}
          {txn.counterparty && (
            <KV
              label="طرف حساب"
              value={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
                  <User size={10} aria-hidden style={{ color: 'var(--ds-text-muted)' }} />
                  {txn.counterparty}
                </span>
              }
            />
          )}
          {txn.externalRef && (
            <KV
              label="شناسه مرجع"
              value={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
                  <Hash size={10} aria-hidden style={{ color: 'var(--ds-text-muted)' }} />
                  <code style={{ fontFamily: 'inherit' }} dir="ltr">
                    {txn.externalRef}
                  </code>
                </span>
              }
            />
          )}
          <KV label="شناسه داخلی" value={txn.id} mono dir="ltr" icon={Hash} />
          <KV label="زمان ایجاد" value={faDateTimeFull(txn.createdAt)} />
          <KV label="آخرین به‌روزرسانی" value={faDateTimeFull(txn.updatedAt)} />
        </div>
      </section>

      {/* ── Note (if exists) ──────────────────────────────────────────── */}
      {txn.note && (
        <section className={s.section}>
          <SectionHeader icon={FileText} title="یادداشت" />
          <div className={s.noteBox}>
            <FileText size={12} aria-hidden className={s.noteIcon} />
            <p className={s.noteText}>{txn.note}</p>
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className={s.foot}>
        <ViewAllLink href="/customer/transactions" icon={Activity}>
          بازگشت به همه تراکنش‌ها
        </ViewAllLink>
      </footer>
    </div>
  );
}

// ── KV helper ───────────────────────────────────────────────────────────── //

function KV({
  label,
  value,
  mono,
  dir,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  dir?: 'ltr' | 'rtl';
  icon?: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean; style?: React.CSSProperties }>;
}) {
  return (
    <div className={s.kvRow}>
      <span className={s.kvLabel}>
        {Icon && <Icon size={10} aria-hidden style={{ color: 'var(--ds-text-muted)' }} />}
        {label}
      </span>
      <span
        className={s.kvValue}
        data-mono={mono ? 'true' : undefined}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}
