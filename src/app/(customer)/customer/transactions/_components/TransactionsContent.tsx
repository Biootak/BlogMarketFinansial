'use client';

/**
 * TransactionsContent — «دفتر اجرا» (Execution Ledger)
 * ----------------------------------------------------------------------------
 *  - Filter strip: کاشی‌های نوع تراکنش + وضعیت (clickable)
 *  - Summary: کارت خلاصه (تعداد، موفق، در انتظار، ناموفق)
 *  - Timeline: لیست ledger با rail رنگی + amount + status pill
 *  - Pagination: صفحه‌بندی (page > 1 و hasMore)
 *  - Empty: صفر تراکنش
 */

import type { CustomerTransactionRow } from '@/actions/customer-portal';
import {
  KIND_CSSKEY,
  KIND_LABEL,
  STATUS_LABEL,
  TXN_KIND_FILTERS,
  TXN_STATUS_CSSKEY,
  TXN_STATUS_FILTERS,
  faAmount,
  faDateTime,
  faNum,
  relativeTime,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import { KindIcon, SectionHeader, StatusPill } from '@/app/(customer)/customer/_lib/customer-ui';
import { Activity, AlertCircle, CheckCircle2, Clock, History, Inbox } from 'lucide-react';
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

export default function TransactionsContent({
  initialRows,
  total,
  page,
  hasMore,
  filterKind,
  filterStatus,
}: Props) {
  const router = useRouter();

  // Stats
  const completed = initialRows.filter((r) => r.status === 'COMPLETED').length;
  const pending = initialRows.filter(
    (r) => r.status === 'PENDING' || r.status === 'PROCESSING',
  ).length;
  const failed = initialRows.filter(
    (r) => r.status === 'FAILED' || r.status === 'CANCELLED',
  ).length;
  const sumAfn = initialRows
    .filter((r) => r.currency === 'AFN')
    .reduce((sum, r) => sum + r.amount, 0);

  function setParam(key: 'kind' | 'status' | 'page', value: string) {
    const sp = new URLSearchParams();
    if (key !== 'kind' && filterKind) sp.set('kind', filterKind);
    if (key !== 'status' && filterStatus) sp.set('status', filterStatus);
    if (value) sp.set(key, value);
    if (key !== 'page' && page > 1) sp.set('page', String(page));
    router.push(`/customer/transactions?${sp.toString()}`);
  }

  return (
    <div className={s.root} dir="rtl">
      {/* ── Summary Strip ────────────────────────────────────────────── */}
      <section className={s.summary} aria-label="خلاصه تراکنش‌ها">
        <article className={s.summaryCard} data-tone="neutral">
          <div className={s.summaryTop}>
            <span className={s.summaryLabel}>تعداد کل</span>
            <span className={s.summaryIcon} aria-hidden><History size={15} /></span>
          </div>
          <span className={s.summaryValue}>{faNum(total)}</span>
          <span className={s.summarySub}>تراکنش ثبت شده</span>
        </article>
        <article className={s.summaryCard} data-tone="credit">
          <div className={s.summaryTop}>
            <span className={s.summaryLabel}>موفق</span>
            <span className={s.summaryIcon} aria-hidden><CheckCircle2 size={15} /></span>
          </div>
          <span className={s.summaryValue}>{faNum(completed)}</span>
          <span className={s.summarySub}>در این صفحه</span>
        </article>
        <article className={s.summaryCard} data-tone="warning">
          <div className={s.summaryTop}>
            <span className={s.summaryLabel}>در انتظار</span>
            <span className={s.summaryIcon} aria-hidden><Clock size={15} /></span>
          </div>
          <span className={s.summaryValue}>{faNum(pending)}</span>
          <span className={s.summarySub}>نیازمند اقدام</span>
        </article>
        <article className={s.summaryCard} data-tone="danger">
          <div className={s.summaryTop}>
            <span className={s.summaryLabel}>ناموفق</span>
            <span className={s.summaryIcon} aria-hidden><AlertCircle size={15} /></span>
          </div>
          <span className={s.summaryValue}>{faNum(failed)}</span>
          <span className={s.summarySub}>لغو/خطا</span>
        </article>
      </section>

      {/* ── Filter Strip ────────────────────────────────────────────── */}
      <section className={s.filters} aria-label="فیلتر تراکنش‌ها">
        <div className={s.filterGroup}>
          <span className={s.filterGroupLabel}>نوع تراکنش</span>
          <div className={s.filterChips}>
            {TXN_KIND_FILTERS.map((opt) => {
              const active = filterKind === opt.value || (opt.value === '' && !filterKind);
              return (
                <button
                  key={opt.value || 'all'}
                  type="button"
                  className={s.chip}
                  data-active={active}
                  onClick={() => setParam('kind', opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className={s.filterGroup}>
          <span className={s.filterGroupLabel}>وضعیت</span>
          <div className={s.filterChips}>
            {TXN_STATUS_FILTERS.map((opt) => {
              const active = filterStatus === opt.value || (opt.value === '' && !filterStatus);
              return (
                <button
                  key={opt.value || 'all'}
                  type="button"
                  className={s.chip}
                  data-active={active}
                  onClick={() => setParam('status', opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Transactions List ───────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={Activity}
          title="دفتر اجرا"
          sub={`صفحه ${faNum(page)} از ${faNum(Math.max(1, Math.ceil(total / 20)))}`}
        />
        {initialRows.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon} aria-hidden>
              <Inbox size={20} />
            </span>
            <strong>تراکنشی یافت نشد</strong>
            <p>
              {filterKind || filterStatus
                ? 'با فیلتر فعلی تراکنشی وجود ندارد. فیلترها را تغییر دهید.'
                : 'اولین تراکنش شما پس از فعال‌سازی اینجا نمایش داده می‌شود.'}
            </p>
          </div>
        ) : (
          <ol className={s.list}>
            {initialRows.map((txn, i) => {
              const statusKey = TXN_STATUS_CSSKEY[txn.status] ?? 'neutral';
              const kindKey = KIND_CSSKEY[txn.kind] ?? 'neutral';
              const isCredit = kindKey === 'credit';
              const isDebit = kindKey === 'debit';
              return (
                <li
                  key={txn.id}
                  className={s.row}
                  data-status={statusKey}
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <a
                    href={`/customer/transactions/${txn.id}`}
                    className={s.rowLink}
                    aria-label={`${KIND_LABEL[txn.kind] ?? txn.kind} - ${faAmount(txn.amount, txn.currency)}`}
                  >
                    <span className={s.rowDot} aria-hidden />
                    <span className={s.rowIcon} data-kind={txn.kind} aria-hidden>
                      <KindIcon kind={txn.kind} size={14} />
                    </span>
                    <div className={s.rowMain}>
                      <span className={s.rowKind}>{KIND_LABEL[txn.kind] ?? txn.kind}</span>
                      <span className={s.rowMeta}>
                        <span title={faDateTime(txn.createdAt)}>{relativeTime(txn.createdAt)}</span>
                        {txn.counterparty && (
                          <>
                            <span className={s.rowMetaDot} aria-hidden />
                            <span className={s.rowCounter}>{txn.counterparty}</span>
                          </>
                        )}
                        {txn.note && (
                          <>
                            <span className={s.rowMetaDot} aria-hidden />
                            <span className={s.rowNote}>{txn.note}</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className={s.rowRight}>
                      <span
                        className={s.rowAmount}
                        data-tone={isDebit ? 'debit' : isCredit ? 'credit' : 'neutral'}
                      >
                        {isCredit ? '+' : isDebit ? '−' : ''}
                        {faNum(txn.amount)}
                        <span className={s.rowCurrency}> {txn.currency}</span>
                      </span>
                      {txn.destAmount && txn.destCurrency && (
                        <span className={s.rowDest}>
                          → {faNum(txn.destAmount)} {txn.destCurrency}
                        </span>
                      )}
                      <StatusPill variant={statusKey}>
                        {STATUS_LABEL[txn.status] ?? txn.status}
                      </StatusPill>
                    </div>
                  </a>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {(page > 1 || hasMore) && (
        <nav className={s.pagination} aria-label="صفحه‌بندی">
          {page > 1 ? (
            <button
              type="button"
              className={s.pageBtn}
              onClick={() => setParam('page', String(page - 1))}
              aria-label="صفحه قبلی"
            >
              قبلی
            </button>
          ) : (
            <span className={s.pageBtn} aria-disabled>
              قبلی
            </span>
          )}
          <span className={s.pageInfo}>صفحه {faNum(page)}</span>
          {hasMore ? (
            <button
              type="button"
              className={s.pageBtn}
              onClick={() => setParam('page', String(page + 1))}
              aria-label="صفحه بعدی"
            >
              بعدی
            </button>
          ) : (
            <span className={s.pageBtn} aria-disabled>
              بعدی
            </span>
          )}
        </nav>
      )}

      {/* ── Footer (sum) ────────────────────────────────────────────── */}
      {initialRows.length > 0 && sumAfn > 0 && (
        <footer className={s.sumFoot}>
          <span className={s.sumFootLabel}>مجموع مبالغ این صفحه (AFN):</span>
          <span className={s.sumFootValue}>{faNum(Math.round(sumAfn * 100) / 100)} AFN</span>
        </footer>
      )}
    </div>
  );
}
