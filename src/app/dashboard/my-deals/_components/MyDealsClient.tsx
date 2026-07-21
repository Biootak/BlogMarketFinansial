'use client';

/**
 * MyDealsClient — نمایش معاملات ارزی کاربر
 *
 * A5-fix (2026-07): UI برای تاریخچه CurrencyDeal های کاربر.
 * داده‌ها از server (page.tsx) به عنوان initialDeals ارسال می‌شوند.
 */

import type { DealRow } from '@/actions/currency-deals';
import { ArrowLeftRight, CheckCircle2, Clock, PackageSearch, XCircle } from 'lucide-react';
import s from './MyDealsClient.module.css';

// ─── وضعیت‌ها ────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number }>; color: string }
> = {
  PENDING: { label: 'در انتظار', icon: Clock, color: 'var(--ds-color-warning)' },
  CONFIRMED: { label: 'تایید شده', icon: CheckCircle2, color: 'var(--ds-color-info)' },
  PROCESSING: { label: 'در حال انجام', icon: ArrowLeftRight, color: 'var(--ds-color-info)' },
  COMPLETED: { label: 'تکمیل شده', icon: CheckCircle2, color: 'var(--ds-color-success)' },
  CANCELLED: { label: 'لغو شده', icon: XCircle, color: 'var(--ds-color-danger)' },
  DISPUTED: { label: 'مورد اعتراض', icon: XCircle, color: 'var(--ds-color-warning)' },
  REFUNDED: { label: 'بازگشت وجه', icon: CheckCircle2, color: 'var(--ds-color-success)' },
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

interface Props {
  initialDeals: DealRow[];
}

export default function MyDealsClient({ initialDeals }: Props) {
  if (initialDeals.length === 0) {
    return (
      <section className={s.page}>
        <header className={s.head}>
          <div>
            <h1 className={s.title}>معاملات ارزی من</h1>
            <p className={s.subtitle}>تاریخچه معاملات ارزی شما با صرافی‌های عضو پلتفرم</p>
          </div>
          <a href="/money-transfer" className={s.newBtn}>
            <ArrowLeftRight size={14} aria-hidden="true" />
            معامله جدید
          </a>
        </header>
        <div className={s.empty}>
          <PackageSearch size={40} strokeWidth={1.2} className={s.emptyIcon} aria-hidden />
          <h2 className={s.emptyTitle}>هنوز معامله‌ای ثبت نشده</h2>
          <p className={s.emptyDesc}>با مراجعه به صفحه نرخ‌ها، اولین معامله ارزی خود را ثبت کنید.</p>
          <a href="/money-transfer" className={s.emptyBtn}>
            مشاهده نرخ‌ها و صرافی‌ها
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className={s.page}>
      <header className={s.head}>
        <div>
          <h1 className={s.title}>معاملات ارزی من</h1>
          <p className={s.subtitle}>
            {new Intl.NumberFormat('fa-IR').format(initialDeals.length)} معامله ثبت‌شده
          </p>
        </div>
        <a href="/money-transfer" className={s.newBtn}>
          <ArrowLeftRight size={14} aria-hidden="true" />
          معامله جدید
        </a>
      </header>

      <div className={s.list} role="list">
        {initialDeals.map((deal) => {
          const meta = STATUS_META[deal.status] ?? STATUS_META.PENDING;
          const Icon = meta.icon;
          return (
            <article key={deal.id} className={s.card} role="listitem">
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
                  <span className={s.toAmount}>{formatAmount(deal.toAmount, deal.toCurrency)}</span>
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
