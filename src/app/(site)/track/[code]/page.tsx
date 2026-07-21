/**
 * /track/[code] — صفحه عمومی پیگیری معامله ارزی
 *
 * Server Component — revalidate هر ۶۰ ثانیه.
 * نمایش وضعیت CurrencyDeal با timeline بصری.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { getDealByTracking } from '@/actions/currency-deals';
import CopyButton from '@/components/fintech/CopyButton';
import {
  AlertCircle,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import s from './track.module.css';

export const revalidate = 60;

interface Props {
  params: Promise<{ code: string }>;
}

const STATUS_CONFIG = {
  PENDING: {
    labelFa: 'در انتظار بررسی',
    colorClass: s.statusPending,
    icon: Clock,
  },
  CONFIRMED: {
    labelFa: 'تأیید شد',
    colorClass: s.statusConfirmed,
    icon: CheckCircle2,
  },
  PROCESSING: {
    labelFa: 'در حال انجام',
    colorClass: s.statusProcessing,
    icon: RefreshCw,
  },
  COMPLETED: {
    labelFa: 'تکمیل شد',
    colorClass: s.statusCompleted,
    icon: CheckCircle2,
  },
  CANCELLED: {
    labelFa: 'لغو شد',
    colorClass: s.statusCancelled,
    icon: XCircle,
  },
  DISPUTED: {
    labelFa: 'مورد اختلاف',
    colorClass: s.statusDisputed,
    icon: AlertCircle,
  },
  REFUNDED: {
    labelFa: 'برگشت داده شد',
    colorClass: s.statusRefunded,
    icon: ArrowRight,
  },
} as const;

type DealStatus = keyof typeof STATUS_CONFIG;

const TIMELINE_STEPS: DealStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED'];

function getStepClass(step: DealStatus, currentStatus: string): string {
  const terminalStatuses = ['CANCELLED', 'DISPUTED', 'REFUNDED'];
  if (terminalStatuses.includes(currentStatus)) {
    const currentIdx = TIMELINE_STEPS.indexOf(currentStatus as DealStatus);
    const stepIdx = TIMELINE_STEPS.indexOf(step);
    if (currentIdx !== -1 && stepIdx < currentIdx) return s.stepDone;
    if (step === currentStatus) return s.stepCancelled;
    return s.stepPending;
  }
  const statusOrder = TIMELINE_STEPS;
  const currentIdx = statusOrder.indexOf(currentStatus as DealStatus);
  const stepIdx = statusOrder.indexOf(step);
  if (stepIdx < currentIdx) return s.stepDone;
  if (stepIdx === currentIdx) return s.stepActive;
  return s.stepPending;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const deal = await getDealByTracking(code.toUpperCase());

  if (deal) {
    return {
      title: `پیگیری ${code} | کیف پول دیجیتال`,
      description: `وضعیت معامله ${code}: ${deal.fromCurrency} به ${deal.toCurrency}`,
      robots: { index: false },
    };
  }

  return {
    title: 'پیگیری معامله',
    robots: { index: false },
  };
}

export default async function TrackPage({ params }: Props) {
  const { code } = await params;
  const deal = await getDealByTracking(code.toUpperCase());

  const statusCfg =
    deal && deal.status in STATUS_CONFIG
      ? STATUS_CONFIG[deal.status as DealStatus]
      : null;

  const StatusIcon = statusCfg?.icon ?? AlertCircle;

  if (!deal) {
    return (
      <main className={s.page}>
        <div className={s.notFoundWrap}>
          <div className={s.notFoundCard}>
            <AlertCircle size={48} className={s.notFoundIcon} aria-hidden />
            <h1 className={s.notFoundTitle}>معامله یافت نشد</h1>
            <p className={s.notFoundSub}>
              معامله‌ای با کد <strong dir="ltr">{code}</strong> یافت نشد. کد پیگیری را دوباره
              بررسی کنید.
            </p>
            <Link href="/transfer" className={s.notFoundLink}>
              ثبت درخواست جدید
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const fromAmountNum = Number.parseFloat(deal.fromAmount);
  const toAmountNum = Number.parseFloat(deal.toAmount);
  const appliedRateNum = Number.parseFloat(deal.appliedRate);

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(n);

  const formatRate = (n: number) =>
    new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(n);

  const formatDate = (d: Date | string) =>
    new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d));

  const statusLogs = (deal as { statusLogs?: Array<{ toStatus: string; note: string | null; createdAt: Date }> }).statusLogs ?? [];

  return (
    <main className={s.page}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={s.hero} aria-label="اطلاعات معامله">
        <div className={s.heroAmbient} aria-hidden />
        <div className={s.heroHairline} aria-hidden />
        <div className={s.heroInner}>
          {/* Status badge */}
          {statusCfg && (
            <div className={`${s.heroBadge} ${statusCfg.colorClass}`}>
              <span className={s.heroBadgeDot} aria-hidden />
              <StatusIcon size={12} strokeWidth={2} aria-hidden />
              {statusCfg.labelFa}
            </div>
          )}

          {/* Title */}
          <h1 className={s.heroTitle}>پیگیری معامله</h1>

          {/* Tracking code + copy */}
          <div className={s.trackCodeWrap}>
            <span className={s.trackCode} dir="ltr" aria-label={`کد پیگیری ${deal.trackingCode}`}>
              {deal.trackingCode}
            </span>
            <CopyButton text={deal.trackingCode} label="کپی" />
          </div>
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className={s.content}>
        {/* Summary card */}
        <section className={s.summaryCard} aria-label="جزئیات مبلغ">
          <div className={s.currencies}>
            <div className={s.currencyBox}>
              <span className={s.currencyCode}>{deal.fromCurrency}</span>
              <span
                className={s.currencyAmount}
                dir="ltr"
                aria-label={`${formatAmount(fromAmountNum)} ${deal.fromCurrency}`}
              >
                {formatAmount(fromAmountNum)}
              </span>
              <span className={s.currencyLabel}>پرداختی</span>
            </div>
            <div className={s.arrow} aria-hidden>
              <ArrowLeftRight size={24} strokeWidth={1.5} />
            </div>
            <div className={s.currencyBox}>
              <span className={s.currencyCode}>{deal.toCurrency}</span>
              <span
                className={s.currencyAmount}
                dir="ltr"
                aria-label={`${formatAmount(toAmountNum)} ${deal.toCurrency}`}
              >
                {formatAmount(toAmountNum)}
              </span>
              <span className={s.currencyLabel}>دریافتی</span>
            </div>
          </div>
          <div className={s.rateRow}>
            نرخ اعمال‌شده:{' '}
            <span className={s.rateValue} dir="ltr">
              {formatRate(appliedRateNum)}
            </span>
          </div>
        </section>

        {/* Exchange info */}
        {deal.exchangeName && (
          <div className={s.exchangeInfo} aria-label="صرافی">
            <Building2 size={16} strokeWidth={1.5} aria-hidden />
            <span className={s.exchangeName}>{deal.exchangeName}</span>
            {deal.exchangeCity && (
              <span className={s.exchangeCity}>{deal.exchangeCity}</span>
            )}
          </div>
        )}

        {/* Timeline */}
        <section aria-label="مراحل معامله">
          <div className={s.timelineTitle}>مراحل پردازش</div>
          <div className={s.timeline} role="list">
            {TIMELINE_STEPS.map((step) => {
              const cfg = STATUS_CONFIG[step];
              const StepIcon = cfg.icon;
              const stepClass = getStepClass(step, deal.status);
              const logEntry = statusLogs.find((l) => l.toStatus === step);
              const isDone = stepClass === s.stepDone || stepClass === s.stepActive;

              return (
                <div
                  key={step}
                  className={`${s.timelineStep} ${stepClass}`}
                  role="listitem"
                  aria-current={stepClass === s.stepActive ? 'step' : undefined}
                >
                  <div className={s.stepCircle} aria-hidden>
                    {isDone ? (
                      <StepIcon size={12} strokeWidth={2.5} />
                    ) : null}
                  </div>
                  <div className={s.stepBody}>
                    <span className={s.stepLabel}>{cfg.labelFa}</span>
                    {logEntry && (
                      <time
                        className={s.stepTime}
                        dateTime={new Date(logEntry.createdAt).toISOString()}
                      >
                        {formatDate(logEntry.createdAt)}
                      </time>
                    )}
                    {logEntry?.note && (
                      <span className={s.stepNote}>{logEntry.note}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Terminal cancelled/disputed/refunded step */}
            {['CANCELLED', 'DISPUTED', 'REFUNDED'].includes(deal.status) && (
              <div className={`${s.timelineStep} ${s.stepCancelled}`} role="listitem">
                <div className={s.stepCircle} aria-hidden>
                  <XCircle size={12} strokeWidth={2} />
                </div>
                <div className={s.stepBody}>
                  <span className={s.stepLabel}>
                    {STATUS_CONFIG[deal.status as DealStatus]?.labelFa ?? deal.status}
                  </span>
                  {statusLogs.find((l) => l.toStatus === deal.status) && (
                    <time
                      className={s.stepTime}
                      dateTime={new Date(statusLogs.find((l) => l.toStatus === deal.status)!.createdAt).toISOString()}
                    >
                      {formatDate(statusLogs.find((l) => l.toStatus === deal.status)!.createdAt)}
                    </time>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Dates */}
        <div className={s.datesSection}>
          <div className={s.dateItem}>
            <span className={s.dateLabel}>تاریخ ثبت</span>
            <time className={s.dateValue} dateTime={new Date(deal.createdAt).toISOString()}>
              {formatDate(deal.createdAt)}
            </time>
          </div>
          {deal.confirmedAt && (
            <div className={s.dateItem}>
              <span className={s.dateLabel}>تأیید شد</span>
              <time className={s.dateValue} dateTime={new Date(deal.confirmedAt).toISOString()}>
                {formatDate(deal.confirmedAt)}
              </time>
            </div>
          )}
          {deal.completedAt && (
            <div className={s.dateItem}>
              <span className={s.dateLabel}>تکمیل شد</span>
              <time className={s.dateValue} dateTime={new Date(deal.completedAt).toISOString()}>
                {formatDate(deal.completedAt)}
              </time>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className={s.backRow}>
          <Link href="/transfer" className={s.backLink}>
            <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
            بازگشت به صفحه انتقال
          </Link>
        </div>
      </div>
    </main>
  );
}
