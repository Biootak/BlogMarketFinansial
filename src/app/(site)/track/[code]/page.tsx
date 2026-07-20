/**
 * /track/[code] — صفحه پیگیری یکپارچه
 *
 * دو نوع کد پشتیبانی می‌شود:
 *   BT-XXXXXXXX-XXXXXX  →  ServiceRequest (سیستم قدیمی خدمات ارزی)
 *   DL-XXXXX-XXXX       →  CurrencyDeal   (معامله صرافی جدید)
 *
 * Server Component — هر دو route به‌صورت SSR رندر می‌شوند.
 */

import { getDealByTracking } from '@/actions/currency-deals';
import { getServiceRequestByTrackingCode } from '@/actions/serviceRequestActions';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  ArrowLeftRight,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import TrackingPageClient from './_components/TrackingPageClient';
import s from './TrackingPage.module.css';

interface Props {
  params: Promise<{ code: string }>;
}

const IS_DEAL = (code: string) => /^DL-/i.test(code);
const IS_SERVICE = (code: string) => /^BT-/i.test(code);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const upper = code.trim().toUpperCase();
  const title = IS_DEAL(upper)
    ? `پیگیری معامله ${upper} | صرافی`
    : `پیگیری درخواست ${upper} | خدمات ارزی`;
  return {
    title,
    description: 'وضعیت درخواست یا معامله ارزی خود را پیگیری کنید',
    robots: { index: false, follow: false },
  };
}

// ─── Status metadata ────────────────────────────────────────────────────────

type StatusColor = 'success' | 'warning' | 'error' | 'info';

interface StatusInfo {
  label: string;
  color: StatusColor;
  desc: string;
  Icon: React.ElementType;
}

const STATUS_MAP: Record<string, StatusInfo> = {
  PENDING: {
    label: 'در انتظار تایید',
    color: 'warning',
    desc: 'معامله شما ثبت شده و منتظر تایید صرافی است.',
    Icon: Clock,
  },
  CONFIRMED: {
    label: 'تایید شد',
    color: 'info',
    desc: 'صرافی معامله را تایید کرده — در حال پردازش.',
    Icon: BadgeCheck,
  },
  PROCESSING: {
    label: 'در حال انجام',
    color: 'info',
    desc: 'معامله در حال پردازش است.',
    Icon: Loader2,
  },
  COMPLETED: {
    label: 'معامله تکمیل شد',
    color: 'success',
    desc: 'مبلغ با موفقیت منتقل شد.',
    Icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'لغو شد',
    color: 'error',
    desc: 'این معامله لغو شده است.',
    Icon: Ban,
  },
  DISPUTED: {
    label: 'در اختلاف',
    color: 'error',
    desc: 'این معامله دارای اختلاف است — با پشتیبانی تماس بگیرید.',
    Icon: RefreshCw,
  },
  REFUNDED: {
    label: 'بازگشت داده شد',
    color: 'success',
    desc: 'مبلغ شما بازگشت داده شده است.',
    Icon: RotateCcw,
  },
};

const CHANNEL_LABEL: Record<string, string> = {
  ONLINE: 'آنلاین',
  INPERSON: 'حضوری',
  PHONE: 'تلفنی',
};

// ─── Stepper config ─────────────────────────────────────────────────────────

const STEPS: { key: string; label: string }[] = [
  { key: 'PENDING',    label: 'ثبت' },
  { key: 'CONFIRMED',  label: 'تایید' },
  { key: 'PROCESSING', label: 'پردازش' },
  { key: 'COMPLETED',  label: 'انجام شد' },
];

// Map each status to stepper progress index (0-based)
const STATUS_STEP: Record<string, number> = {
  PENDING:    0,
  CONFIRMED:  1,
  PROCESSING: 2,
  COMPLETED:  3,
  CANCELLED:  -1, // error state
  DISPUTED:   -1,
  REFUNDED:   3,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function TrackingPage({ params }: Props) {
  const { code } = await params;
  const upper = code.trim().toUpperCase();

  // ── ServiceRequest (BT-*) ──────────────────────────────────────────────────
  if (IS_SERVICE(upper)) {
    if (!/^BT-[A-F0-9]{8}-[A-F0-9]{6}$/i.test(upper)) notFound();
    const res = await getServiceRequestByTrackingCode(upper);
    return (
      <main className={s.root}>
        <div className={s.container}>
          <div className={s.breadcrumb}>
            <ArrowLeft size={12} />
            <span>پیگیری درخواست</span>
          </div>
          <TrackingPageClient
            code={upper}
            initialData={res.success && res.data ? res.data : null}
            initialError={!res.success ? (res.message ?? 'خطا') : null}
          />
        </div>
      </main>
    );
  }

  // ── CurrencyDeal (DL-*) ────────────────────────────────────────────────────
  if (!IS_DEAL(upper) || !/^DL-[A-Z0-9]+-[A-Z0-9]+$/i.test(upper)) notFound();

  const deal = await getDealByTracking(upper);
  if (!deal) notFound();

  const statusInfo: StatusInfo = STATUS_MAP[deal.status] ?? {
    label: deal.status,
    color: 'info' as StatusColor,
    desc: '',
    Icon: Wallet,
  };

  const activeStep = STATUS_STEP[deal.status] ?? 0;
  const isTerminal = deal.status === 'CANCELLED' || deal.status === 'DISPUTED';

  // First letter(s) of exchange name for avatar
  const avatarInitial = deal.exchangeName
    ? deal.exchangeName.trim().charAt(0)
    : '?';

  const { Icon: StatusIcon } = statusInfo;

  return (
    <main className={s.root}>
      <div className={s.container}>

        {/* ── Breadcrumb ── */}
        <div className={s.breadcrumb} aria-label="مسیر ناوبری">
          <ArrowLeft size={12} aria-hidden />
          <span>پیگیری معامله</span>
        </div>

        {/* ── Hero status ── */}
        <section
          className={`${s.hero} ${s[`hero--${statusInfo.color}`]}`}
          aria-label={`وضعیت: ${statusInfo.label}`}
        >
          <div className={s.heroInner}>
            <div className={s.statusRing} aria-hidden>
              <StatusIcon size={22} strokeWidth={1.75} />
            </div>
            <div className={s.heroContent}>
              <h1 className={s.heroStatusLabel}>{statusInfo.label}</h1>
              {statusInfo.desc && (
                <p className={s.heroStatusDesc}>{statusInfo.desc}</p>
              )}
              <div className={s.heroCode} dir="ltr" aria-label={`کد پیگیری: ${deal.trackingCode}`}>
                {deal.trackingCode}
              </div>
            </div>
          </div>
        </section>

        {/* ── Progress stepper (فقط برای states فعال) ── */}
        {!isTerminal && (
          <nav className={s.stepper} aria-label="مراحل پیشرفت معامله">
            {STEPS.map((step, idx) => {
              const isDone   = idx < activeStep;
              const isActive = idx === activeStep;
              const cls = isDone
                ? s['stepItem--done']
                : isActive
                  ? s['stepItem--active']
                  : '';
              return (
                <div
                  key={step.key}
                  className={`${s.stepItem} ${cls}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className={s.stepDot} aria-hidden>
                    {isDone ? <CheckCircle2 size={13} strokeWidth={2.5} /> : idx + 1}
                  </div>
                  <span className={s.stepLabel}>{step.label}</span>
                </div>
              );
            })}
          </nav>
        )}

        {/* ── Deal details ── */}
        <section className={s.detailsCard} aria-label="جزئیات معامله">
          <h2 className={s.sectionTitle}>جزئیات معامله</h2>

          {/* Exchange highlight */}
          {deal.exchangeName && (
            <div className={s.exchangeHighlight}>
              <div className={s.exchangeAvatar} aria-hidden>{avatarInitial}</div>
              <div>
                <div className={s.exchangeName}>{deal.exchangeName}</div>
                {deal.exchangeCity && (
                  <div className={s.exchangeCity}>{deal.exchangeCity}</div>
                )}
              </div>
            </div>
          )}

          {/* Currency flow widget */}
          <div className={s.currencyFlow} aria-label="جریان ارز">
            <div className={s.currencyBlock}>
              <span className={s.currencyCode}>{deal.fromCurrency}</span>
              <span className={s.currencyAmount}>{formatFa(deal.fromAmount)}</span>
            </div>
            <div className={s.flowArrow} aria-hidden>
              <ArrowLeftRight size={16} strokeWidth={1.75} />
            </div>
            <div className={s.currencyBlock} style={{ textAlign: 'end' }}>
              <span className={s.currencyCode}>{deal.toCurrency}</span>
              <span className={s.currencyAmount}>
                {deal.toAmount && Number(deal.toAmount) > 0
                  ? formatFa(deal.toAmount)
                  : '—'}
              </span>
            </div>
          </div>

          {/* Secondary details */}
          <dl className={s.grid}>
            {deal.appliedRate && Number(deal.appliedRate) > 0 && (
              <div className={s.row}>
                <dt className={s.label}>نرخ اعمال‌شده</dt>
                <dd className={s.value}>{formatFa(deal.appliedRate)}</dd>
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
              <dd className={s.value}>{maskPhone(deal.customerPhone)}</dd>
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

        {/* ── Footer ── */}
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
