/**
 * /track/[code] — صفحه پیگیری وضعیت معامله
 *
 * Server Component — داده از DB با getDealByTracking.
 * اطلاعات حساس (customerPhone partial) نشان داده می‌شود.
 */

import { getDealByTracking } from '@/actions/currency-deals';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import s from './TrackingPage.module.css';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `پیگیری معامله ${code} | صرافی`,
    description: 'وضعیت معامله ارزی خود را پیگیری کنید',
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; desc: string }> = {
  PENDING: {
    label: 'در انتظار تایید',
    color: 'warning',
    desc: 'معامله شما ثبت شده و منتظر تایید صرافی است.',
  },
  CONFIRMED: {
    label: 'تایید شد',
    color: 'info',
    desc: 'صرافی معامله را تایید کرده — در حال پردازش.',
  },
  PROCESSING: {
    label: 'در حال انجام',
    color: 'info',
    desc: 'معامله در حال پردازش است.',
  },
  COMPLETED: {
    label: 'تکمیل شد',
    color: 'success',
    desc: 'معامله با موفقیت انجام شد.',
  },
  CANCELLED: {
    label: 'لغو شد',
    color: 'error',
    desc: 'این معامله لغو شده است.',
  },
  DISPUTED: {
    label: 'در اختلاف',
    color: 'error',
    desc: 'این معامله دارای اختلاف است — با پشتیبانی تماس بگیرید.',
  },
  REFUNDED: {
    label: 'بازگشت داده شد',
    color: 'success',
    desc: 'مبلغ شما بازگشت داده شده است.',
  },
};

const CHANNEL_LABEL: Record<string, string> = {
  ONLINE: 'آنلاین',
  INPERSON: 'حضوری',
  PHONE: 'تلفنی',
};

function formatFa(n: string | number): string {
  const num = typeof n === 'string' ? Number.parseFloat(n) : n;
  if (!Number.isFinite(num) || num === 0) return '—';
  return new Intl.NumberFormat('fa-IR').format(Math.round(num));
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default async function TrackingPage({ params }: Props) {
  const { code } = await params;
  // بررسی ساده format کد — DL- + alphanumeric
  if (!/^DL-[A-Z0-9]+-[A-Z0-9]+$/i.test(code)) notFound();

  const deal = await getDealByTracking(code.toUpperCase());
  if (!deal) notFound();

  const statusInfo = STATUS_MAP[deal.status] ?? {
    label: deal.status,
    color: 'default',
    desc: '',
  };

  return (
    <main className={s.root}>
      <div className={s.container}>
        {/* Header */}
        <header className={s.header}>
          <h1 className={s.title}>پیگیری معامله</h1>
          <p className={s.trackingCode} aria-label={`کد پیگیری: ${deal.trackingCode}`}>
            {deal.trackingCode}
          </p>
        </header>

        {/* Status card */}
        <div className={`${s.statusCard} ${s[`statusCard--${statusInfo.color}`]}`}>
          <div className={s.statusDot} aria-hidden />
          <div>
            <div className={s.statusLabel}>{statusInfo.label}</div>
            {statusInfo.desc && <div className={s.statusDesc}>{statusInfo.desc}</div>}
          </div>
        </div>

        {/* Deal details */}
        <section className={s.detailsCard} aria-label="جزئیات معامله">
          <h2 className={s.sectionTitle}>جزئیات معامله</h2>
          <dl className={s.grid}>
            <div className={s.row}>
              <dt className={s.label}>صرافی</dt>
              <dd className={s.value}>{deal.exchangeName ?? '—'}</dd>
            </div>
            {deal.exchangeCity && (
              <div className={s.row}>
                <dt className={s.label}>شهر</dt>
                <dd className={s.value}>{deal.exchangeCity}</dd>
              </div>
            )}
            <div className={s.row}>
              <dt className={s.label}>ارز مبدأ</dt>
              <dd className={s.value + ' tabular-nums'}>
                {formatFa(deal.fromAmount)} {deal.fromCurrency}
              </dd>
            </div>
            <div className={s.row}>
              <dt className={s.label}>ارز مقصد</dt>
              <dd className={s.value + ' tabular-nums'}>
                {deal.toAmount && Number(deal.toAmount) > 0
                  ? `${formatFa(deal.toAmount)} ${deal.toCurrency}`
                  : `${deal.toCurrency} — در انتظار تایید نرخ`}
              </dd>
            </div>
            {deal.appliedRate && Number(deal.appliedRate) > 0 && (
              <div className={s.row}>
                <dt className={s.label}>نرخ اعمال‌شده</dt>
                <dd className={s.value + ' tabular-nums'}>{formatFa(deal.appliedRate)}</dd>
              </div>
            )}
            <div className={s.row}>
              <dt className={s.label}>نوع معامله</dt>
              <dd className={s.value}>{CHANNEL_LABEL[deal.channel] ?? deal.channel}</dd>
            </div>
            <div className={s.row}>
              <dt className={s.label}>نام مشتری</dt>
              <dd className={s.value}>{deal.customerName}</dd>
            </div>
            <div className={s.row}>
              <dt className={s.label}>شماره تماس</dt>
              <dd className={s.value + ' tabular-nums'}>{maskPhone(deal.customerPhone)}</dd>
            </div>
            <div className={s.row}>
              <dt className={s.label}>تاریخ ثبت</dt>
              <dd className={s.value}>{formatDate(deal.createdAt)}</dd>
            </div>
            {deal.completedAt && (
              <div className={s.row}>
                <dt className={s.label}>تاریخ تکمیل</dt>
                <dd className={s.value}>{formatDate(deal.completedAt)}</dd>
              </div>
            )}
            {deal.note && (
              <div className={s.row}>
                <dt className={s.label}>یادداشت</dt>
                <dd className={s.value}>{deal.note}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Help */}
        <footer className={s.footer}>
          <p>برای پیگیری بیشتر با صرافی مربوطه تماس بگیرید.</p>
          <p className={s.footNote}>
            کد پیگیری خود را نزد خود نگه دارید. این اطلاعات فقط با ارائه کد قابل مشاهده است.
          </p>
        </footer>
      </div>
    </main>
  );
}
