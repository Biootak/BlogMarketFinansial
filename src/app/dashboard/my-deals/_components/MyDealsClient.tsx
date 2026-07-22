'use client';

/**
 * MyDealsClient — نمایش معاملات ارزی کاربر با pagination
 *
 * داده‌ها از getMyDeals (Server Action) با page/limit fetch می‌شوند.
 * Pattern: همان MyRequestsClient — loading/error/empty/pagination states.
 */

import { type DealRow, getMyDeals } from '@/actions/currency-deals';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  PackageSearch,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './MyDealsClient.module.css';

// ─── وضعیت‌ها ────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number }>; color: string }
> = {
  PENDING: { label: 'در انتظار', icon: Clock, color: 'var(--ds-status-pending-fg)' },
  CONFIRMED: { label: 'تایید شده', icon: CheckCircle2, color: 'var(--ds-status-progress-fg)' },
  PROCESSING: {
    label: 'در حال انجام',
    icon: ArrowLeftRight,
    color: 'var(--ds-status-progress-fg)',
  },
  COMPLETED: { label: 'تکمیل شده', icon: CheckCircle2, color: 'var(--ds-status-success-fg)' },
  CANCELLED: { label: 'لغو شده', icon: XCircle, color: 'var(--ds-status-error-fg)' },
  DISPUTED: { label: 'مورد اعتراض', icon: XCircle, color: 'var(--ds-status-pending-fg)' },
  REFUNDED: { label: 'بازگشت وجه', icon: CheckCircle2, color: 'var(--ds-status-success-fg)' },
};

const CHANNEL_FA: Record<string, string> = {
  ONLINE: 'آنلاین',
  INPERSON: 'حضوری',
  PHONE: 'تلفنی',
};

// ─── formatters ──────────────────────────────────────────────────────────────

function formatAmount(amount: string, currency: string): string {
  const num = Number(amount);
  return `${new Intl.NumberFormat('fa-IR').format(num)} ${currency}`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

const PAGE_LIMIT = 10;

export default function MyDealsClient() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageRef = useRef(page);
  pageRef.current = page;

  const fetchDeals = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    const result = await getMyDeals({ page: p, limit: PAGE_LIMIT });
    if (result.success && result.data) {
      setDeals(result.data.deals);
      setTotalPages(result.data.pagination.totalPages);
      setTotal(result.data.pagination.total);
    } else {
      setError(!result.success && result.error?.message ? result.error.message : 'خطایی رخ داد.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeals(page);
  }, [fetchDeals, page]);

  return (
    <section className={s.page}>
      {/* Header */}
      <header className={s.head}>
        <div>
          <h1 className={s.title}>معاملات ارزی من</h1>
          <p className={s.subtitle}>
            {loading
              ? 'در حال بارگذاری…'
              : error
                ? 'تاریخچه معاملات ارزی شما'
                : total > 0
                  ? `${new Intl.NumberFormat('fa-IR').format(total)} معامله ثبت‌شده`
                  : 'تاریخچه معاملات ارزی شما با صرافی‌های عضو پلتفرم'}
          </p>
        </div>
        <a href="/money-transfer" className={s.newBtn}>
          <ArrowLeftRight size={14} aria-hidden="true" />
          معامله جدید
        </a>
      </header>

      {/* Loading skeleton */}
      {loading && (
        <ul className={s.list} aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            <li key={i} className={s.skeleton} aria-hidden />
          ))}
        </ul>
      )}

      {/* Error */}
      {!loading && error && (
        <div className={s.errorBox} role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          {/* Bug-fix: retry button — بدون این کاربر مجبور بود صفحه را reload کند */}
          <button
            type="button"
            className={s.retryBtn}
            onClick={() => fetchDeals(page)}
            aria-label="تلاش مجدد"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && deals.length === 0 && (
        <div className={s.empty}>
          <PackageSearch size={40} strokeWidth={1.2} className={s.emptyIcon} aria-hidden />
          <h2 className={s.emptyTitle}>هنوز معامله‌ای ثبت نشده</h2>
          <p className={s.emptyDesc}>با مراجعه به صفحه نرخ‌ها، اولین معامله ارزی خود را ثبت کنید.</p>
          <a href="/money-transfer" className={s.emptyBtn}>
            مشاهده نرخ‌ها و صرافی‌ها
          </a>
        </div>
      )}

      {/* List */}
      {!loading && !error && deals.length > 0 && (
        <>
          <ul className={s.list}>
            {deals.map((deal) => {
              const meta = STATUS_META[deal.status] ?? STATUS_META.PENDING;
              const Icon = meta.icon;
              return (
                <li key={deal.id} className={s.card}>
                  {/* کد پیگیری + وضعیت */}
                  <div className={s.cardHead}>
                    <span className={s.trackingCode} aria-label="کد پیگیری">
                      {deal.trackingCode}
                    </span>
                    <span
                      className={s.statusBadge}
                      style={{ '--status-color': meta.color } as React.CSSProperties}
                      aria-label={`وضعیت: ${meta.label}`}
                    >
                      <Icon size={12} aria-hidden="true" />
                      {meta.label}
                    </span>
                  </div>

                  {/* جزئیات معامله */}
                  <div className={s.cardBody}>
                    <div className={s.amounts}>
                      <span className={s.fromAmount}>
                        {formatAmount(deal.fromAmount, deal.fromCurrency)}
                      </span>
                      <ArrowLeftRight size={14} className={s.arrowIcon} aria-hidden />
                      <span className={s.toAmount}>
                        {formatAmount(deal.toAmount, deal.toCurrency)}
                      </span>
                    </div>
                    <div className={s.meta}>
                      {deal.exchangeName ? (
                        <span className={s.metaItem}>
                          صرافی: {deal.exchangeName}
                          {deal.exchangeCity ? ` — ${deal.exchangeCity}` : ''}
                        </span>
                      ) : null}
                      <span className={s.metaItem}>
                        کانال: {CHANNEL_FA[deal.channel] ?? deal.channel}
                      </span>
                      <span className={s.metaItem}>تاریخ: {formatDate(deal.createdAt)}</span>
                      {deal.completedAt ? (
                        <span className={s.metaItem}>تکمیل: {formatDate(deal.completedAt)}</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className={s.pagination} aria-label="صفحه‌بندی معاملات">
              <button
                type="button"
                className={s.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                قبلی
              </button>
              <span className={s.pageInfo}>
                صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
              </span>
              <button
                type="button"
                className={s.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                بعدی
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
