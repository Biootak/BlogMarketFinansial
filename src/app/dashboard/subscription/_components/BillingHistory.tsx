'use client';

/**
 * BillingHistory — جدول تاریخچه صورتحساب
 *
 * ویژگی‌ها:
 *   - جدول رخدادهای اشتراک (ارتقاء/تنزل/تمدید/لغو)
 *   - نشان‌دهنده نوع، پلن، مبلغ، وضعیت
 *   - responsive (در موبایل به list تبدیل می‌شود)
 */

import { Calendar, ChevronLeft, FileText, Hash, Receipt } from 'lucide-react';
import { useState } from 'react';
import s from './BillingHistory.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

interface Event {
  id: string;
  kind: string;
  fromPlan: string | null;
  toPlan: string;
  amount: string;
  currency: string;
  invoiceNo: string | null;
  status: string;
  paymentMethod: string | null;
  validUntil: string | null;
  createdAt: string;
}

const KIND_FA: Record<string, string> = {
  UPGRADE: 'ارتقاء',
  DOWNGRADE: 'تنزل',
  RENEWAL: 'تمدید',
  CANCEL: 'لغو',
  TRIAL_START: 'شروع دوره آزمایشی',
};

const STATUS_FA: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'پرداخت شده', cls: 'ok' },
  PENDING: { label: 'در انتظار', cls: 'pending' },
  FAILED: { label: 'ناموفق', cls: 'fail' },
  REFUNDED: { label: 'بازگشت', cls: 'muted' },
};

const METHOD_FA: Record<string, string> = {
  CARD: 'کارت بانکی',
  BANK_TRANSFER: 'حواله بانکی',
  CRYPTO: 'ارز دیجیتال',
};

const PLAN_FA: Record<string, string> = {
  free: 'رایگان',
  pro: 'حرفه‌ای',
  business: 'سازمانی',
};

function fmtAmount(amount: string, currency: string): string {
  const num = Number(amount) / 100;
  if (num === 0) return '—';
  // AFN: عدد فارسی + " AFN" بعد از عدد (نه «ف» جلوی عدد)
  if (currency === 'AFN') {
    const formatted = new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(num);
    return `${formatted} AFN`;
  }
  try {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${_faNum.format(num)} ${currency}`;
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function BillingHistory({ events }: { events: Event[] }) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const filtered = events.filter((e) => {
    if (filter === 'paid') return e.status === 'PAID';
    if (filter === 'pending') return e.status === 'PENDING';
    return true;
  });

  if (events.length === 0) {
    return (
      <section className={s.empty} aria-label="تاریخچه صورتحساب">
        <Receipt size={32} aria-hidden className={s.emptyIcon} />
        <h3 className={s.emptyTitle}>تاریخچه‌ای وجود ندارد</h3>
        <p className={s.emptyDesc}>هنوز هیچ تراکنش اشتراکی ثبت نشده است.</p>
      </section>
    );
  }

  return (
    <section className={s.root} aria-label="تاریخچه صورتحساب">
      <header className={s.head}>
        <h2 className={s.title}>
          <FileText size={15} aria-hidden />
          تاریخچه صورتحساب
        </h2>
        <div className={s.filter} role="tablist" aria-label="فیلتر">
          {[
            { id: 'all', label: 'همه' },
            { id: 'paid', label: 'پرداخت‌شده' },
            { id: 'pending', label: 'در انتظار' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`${s.filterTab} ${filter === f.id ? s.filterTabActive : ''}`}
              onClick={() => setFilter(f.id as typeof filter)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className={s.filterEmpty}>موردی یافت نشد</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">نوع</th>
                  <th scope="col">پلن</th>
                  <th scope="col">مبلغ</th>
                  <th scope="col">روش پرداخت</th>
                  <th scope="col">شماره فاکتور</th>
                  <th scope="col">تاریخ</th>
                  <th scope="col">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const st = STATUS_FA[e.status] ?? { label: e.status, cls: 'muted' };
                  return (
                    <tr key={e.id}>
                      <td>{KIND_FA[e.kind] ?? e.kind}</td>
                      <td>
                        <span className={s.planChange}>
                          {e.fromPlan && (
                            <span className={s.planFrom}>{PLAN_FA[e.fromPlan] ?? e.fromPlan}</span>
                          )}
                          {e.fromPlan && (
                            <ChevronLeft size={12} aria-hidden className={s.planArrow} />
                          )}
                          <span className={s.planTo}>{PLAN_FA[e.toPlan] ?? e.toPlan}</span>
                        </span>
                      </td>
                      <td className={s.amountCell}>{fmtAmount(e.amount, e.currency)}</td>
                      <td>
                        {e.paymentMethod ? (METHOD_FA[e.paymentMethod] ?? e.paymentMethod) : '—'}
                      </td>
                      <td className={s.invoiceCell} dir="ltr">
                        {e.invoiceNo ? (
                          <span className={s.invoiceNo}>
                            <Hash size={10} aria-hidden /> {e.invoiceNo}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className={s.dateCell}>
                          <Calendar size={11} aria-hidden />
                          {fmtDate(e.createdAt)}
                        </span>
                      </td>
                      <td>
                        <span className={`${s.statusBadge} ${s[`status_${st.cls}`]}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className={s.list}>
            {filtered.map((e) => {
              const st = STATUS_FA[e.status] ?? { label: e.status, cls: 'muted' };
              return (
                <li key={e.id} className={s.listItem}>
                  <div className={s.listHead}>
                    <span className={s.listKind}>{KIND_FA[e.kind] ?? e.kind}</span>
                    <span className={`${s.statusBadge} ${s[`status_${st.cls}`]}`}>{st.label}</span>
                  </div>
                  <div className={s.listBody}>
                    <div className={s.listRow}>
                      <span>پلن</span>
                      <span>
                        {e.fromPlan && `${PLAN_FA[e.fromPlan]} ← `}
                        <strong>{PLAN_FA[e.toPlan] ?? e.toPlan}</strong>
                      </span>
                    </div>
                    <div className={s.listRow}>
                      <span>مبلغ</span>
                      <span>{fmtAmount(e.amount, e.currency)}</span>
                    </div>
                    <div className={s.listRow}>
                      <span>تاریخ</span>
                      <span dir="ltr">{fmtDate(e.createdAt)}</span>
                    </div>
                    {e.invoiceNo && (
                      <div className={s.listRow}>
                        <span>فاکتور</span>
                        <span className={s.invoiceNo} dir="ltr">
                          {e.invoiceNo}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
