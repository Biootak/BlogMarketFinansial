/**
 * /track/[code] — صفحه عمومی پیگیری معامله ارزی
 *
 * Server Component — revalidate هر ۶۰ ثانیه.
 * نمایش وضعیت CurrencyDeal با timeline بصری پریمیوم.
 *
 * امنیت (public — بدون auth):
 *  - کد پیگیری قبل از کوئری دیتابیس با regex اعتبارسنجی می‌شود (DoS guard)
 *  - rate limit مخصوص `deal-track` (۲۰/دقیقه per IP) ضد enumeration
 *  - هیچ فیلد حساسی رندر نمی‌شود (نام/تلفن/ایمیل/internalNote)
 *  - همه‌ی خروجی‌ها توسط React escape می‌شوند (ضد XSS)
 */

import { getDealByTracking } from '@/actions/currency-deals';
import { getServiceRequestByTrackingCode } from '@/actions/serviceRequestActions';
import CopyButton from '@/components/fintech/CopyButton';
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Clock,
  LifeBuoy,
  ListChecks,
  PackageCheck,
  RefreshCw,
  SearchX,
  XCircle,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import TrackSearchBox from './_components/TrackSearchBox';
import TrackShareButton from './_components/TrackShareButton';
import TrackingPageClient, { type TrackingData } from './_components/TrackingPageClient';
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

const TERMINAL_STATUSES: DealStatus[] = ['CANCELLED', 'DISPUTED', 'REFUNDED'];

/** توضیح یک‌خطی وضعیت فعلی — به کاربر می‌گوید الان چه خبر است */
const STATUS_HELP: Record<DealStatus, string> = {
  PENDING: 'درخواست شما ثبت شده و در صف بررسی کارشناسان است. معمولاً همین امروز نتیجه اعلام می‌شود.',
  CONFIRMED: 'معامله تأیید شد و آماده‌ی شروع پردازش است.',
  PROCESSING: 'معامله در حال انجام است؛ معمولاً همین امروز تکمیل می‌شود.',
  COMPLETED: 'معامله با موفقیت تکمیل شد. مبلغ به مقصد واریز شده است.',
  CANCELLED: 'این معامله لغو شده است. برای جزئیات بیشتر با پشتیبانی تماس بگیرید.',
  DISPUTED: 'روی این معامله اعتراض ثبت شده و کارشناسان در حال بررسی آن هستند.',
  REFUNDED: 'وجه این معامله به شما بازگردانده شده است.',
};

const CHANNEL_LABELS: Record<string, string> = {
  ONLINE: 'ثبت آنلاین',
  INPERSON: 'ثبت حضوری',
  PHONE: 'ثبت تلفنی',
};

const FA_DIGITS = ['۱', '۲', '۳', '۴'];

function getStepClass(
  step: DealStatus,
  currentStatus: string,
  terminalFrom?: string | null,
): string {
  if (TERMINAL_STATUSES.includes(currentStatus as DealStatus)) {
    const stepIdx = TIMELINE_STEPS.indexOf(step);
    const fromIdx = terminalFrom ? TIMELINE_STEPS.indexOf(terminalFrom as DealStatus) : -1;
    if (fromIdx !== -1 && stepIdx < fromIdx) return s.stepDone;
    if (fromIdx !== -1 && stepIdx === fromIdx) return s.stepCancelled;
    return s.stepPending;
  }
  const currentIdx = TIMELINE_STEPS.indexOf(currentStatus as DealStatus);
  const stepIdx = TIMELINE_STEPS.indexOf(step);
  if (stepIdx < currentIdx) return s.stepDone;
  // وضعیت COMPLETED یک حالت پایانی است — مرحله‌ی آخر هم «انجام‌شده» است نه «فعال»
  if (stepIdx === currentIdx) return currentStatus === 'COMPLETED' ? s.stepDone : s.stepActive;
  return s.stepPending;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const [deal, serviceRes] = await Promise.all([
    getDealByTracking(code.toUpperCase()),
    getServiceRequestByTrackingCode(code.toUpperCase()),
  ]);

  if (deal) {
    return {
      title: `پیگیری ${code} | کیف پول دیجیتال`,
      description: `وضعیت معامله ${code}: ${deal.fromCurrency} به ${deal.toCurrency}`,
      robots: { index: false },
    };
  }

  if (serviceRes.success && serviceRes.data) {
    return {
      title: `پیگیری درخواست ${code}`,
      description: `وضعیت درخواست ${code}: ${serviceRes.data.status}`,
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
  const normalized = code.toUpperCase();
  // هر دو نوع کد پیگیری را پشتیبانی کن:
  //  - CurrencyDeal (معامله ارزی — UI کامل با timeline)
  //  - ServiceRequest (درخواست سرویس — TrackingPageClient که قبلاً dead code بود)
  const [deal, serviceRes] = await Promise.all([
    getDealByTracking(normalized),
    getServiceRequestByTrackingCode(normalized),
  ]);

  // درخواست سرویس → TrackingPageClient (public tracking)
  if (!deal && serviceRes.success && serviceRes.data) {
    return (
      <main className={s.page}>
        <TrackingPageClient
          code={normalized}
          initialData={serviceRes.data as unknown as TrackingData}
          initialError={null}
        />
      </main>
    );
  }

  const statusCfg =
    deal && deal.status in STATUS_CONFIG ? STATUS_CONFIG[deal.status as DealStatus] : null;

  const StatusIcon = statusCfg?.icon ?? AlertCircle;

  if (!deal) {
    return (
      <main className={s.page}>
        <section className={s.nfSection} aria-label="معامله یافت نشد">
          <div className={s.nfAmbient} aria-hidden />
          <div className={s.nfHairline} aria-hidden />
          <div className={s.nfInner}>
            {/* آیکون در حلقه‌ی نوری */}
            <div className={s.nfIconRing} aria-hidden>
              <span className={s.nfIconHalo} />
              <SearchX size={34} strokeWidth={1.4} />
            </div>

            <h1 className={s.nfTitle}>معامله یافت نشد</h1>
            <p className={s.nfSub}>
              کد{' '}
              <code dir="ltr" className={s.nfCode}>
                {code}
              </code>{' '}
              در سامانه‌ی ما ثبت نشده است.
            </p>

            {/* نکات بررسی */}
            <ul className={s.nfHints}>
              <li>کد را از پیامک، ایمیل یا پیام تلگرامِ تأیید کپی کنید</li>
              <li>
                به حروف لاتین و خط تیره دقت کنید — مثل{' '}
                <code dir="ltr" className={s.nfHintCode}>
                  DL-2026-1007
                </code>
              </li>
              <li>اگر همین الان ثبت کرده‌اید، چند لحظه بعد دوباره تلاش کنید</li>
            </ul>

            {/* جستجوی مجدد */}
            <TrackSearchBox initial={code} />

            {/* اقدام‌ها */}
            <div className={s.nfActions}>
              <Link href="/money-transfer" className={s.nfPrimary}>
                ثبت درخواست جدید
                <ArrowLeft size={14} strokeWidth={2} aria-hidden />
              </Link>
              <Link href="/support" className={s.nfSecondary}>
                تماس با پشتیبانی
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const fromAmountNum = Number.parseFloat(deal.fromAmount);
  const toAmountNum = Number.parseFloat(deal.toAmount);
  const appliedRateNum = Number.parseFloat(deal.appliedRate);
  const feeNum = Number.parseFloat(deal.feeAmount);

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

  const statusLogs =
    (
      deal as {
        statusLogs?: Array<{
          toStatus: string;
          fromStatus: string | null;
          note: string | null;
          createdAt: Date;
        }>;
      }
    ).statusLogs ?? [];

  const isTerminal = TERMINAL_STATUSES.includes(deal.status as DealStatus);
  const terminalLog = isTerminal
    ? (statusLogs.find((l) => l.toStatus === deal.status) ?? null)
    : null;

  // شاخص مرحله‌ی فعلی (برای terminal: آخرین مرحله‌ای که معامله به آن رسیده بود)
  const activeIdx = isTerminal
    ? TIMELINE_STEPS.indexOf((terminalLog?.fromStatus ?? '') as DealStatus)
    : TIMELINE_STEPS.indexOf(deal.status as DealStatus);

  const progressPct = isTerminal
    ? Math.max(0, Math.round((Math.max(0, activeIdx) / (TIMELINE_STEPS.length - 1)) * 100))
    : Math.round((Math.max(0, activeIdx) / (TIMELINE_STEPS.length - 1)) * 100);

  const progressStyle = { '--p': progressPct / 100 } as CSSProperties;

  const counterLabel = isTerminal
    ? (statusCfg?.labelFa ?? deal.status)
    : `مرحله ${FA_DIGITS[Math.max(0, activeIdx)] ?? '—'} از ۴`;

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
            <TrackShareButton />
          </div>

          {/* Last update */}
          <div className={s.heroUpdated} aria-label="آخرین به‌روزرسانی">
            <span className={s.heroUpdatedDot} aria-hidden />
            آخرین به‌روزرسانی:{' '}
            <time dateTime={new Date(deal.updatedAt).toISOString()}>
              {formatDate(deal.updatedAt)}
            </time>
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

          <div className={s.metaRow}>
            <div className={s.rateRow}>
              نرخ اعمال‌شده:{' '}
              <span className={s.rateValue} dir="ltr">
                {formatRate(appliedRateNum)}
              </span>
            </div>
            {CHANNEL_LABELS[deal.channel] && (
              <span className={s.channelChip}>{CHANNEL_LABELS[deal.channel]}</span>
            )}
          </div>

          {feeNum > 0 && (
            <div className={s.feeRow}>
              کارمزد:{' '}
              <span className={s.feeValue} dir="ltr">
                {formatAmount(feeNum)} {deal.toCurrency}
              </span>
            </div>
          )}

          {deal.note && (
            <div className={s.noteBox}>
              <span className={s.noteLabel}>یادداشت شما</span>
              <p className={s.noteText}>{deal.note}</p>
            </div>
          )}
        </section>

        {/* Exchange info */}
        {deal.exchangeName && (
          <div className={s.exchangeInfo} aria-label="صرافی">
            <Building2 size={16} strokeWidth={1.5} aria-hidden />
            <span className={s.exchangeName}>{deal.exchangeName}</span>
            {deal.exchangeCity && <span className={s.exchangeCity}>{deal.exchangeCity}</span>}
          </div>
        )}

        {/* ── Timeline — مراحل پردازش ─────────────────────────────────────── */}
        <section className={s.stepsCard} aria-label="مراحل معامله">
          {/* Header */}
          <div className={s.stepsHead}>
            <div className={s.stepsHeading}>
              <span className={s.stepsIcon} aria-hidden>
                <ListChecks size={17} strokeWidth={1.75} />
              </span>
              <div>
                <h2 className={s.stepsTitle}>مراحل پردازش</h2>
                <p className={s.stepsSubtitle}>مسیر پیشرفت معامله</p>
              </div>
            </div>
            <span className={`${s.stepsCounter} ${statusCfg?.colorClass ?? ''}`}>
              {counterLabel}
            </span>
          </div>
          {/* Progress rail */}
          <div className={s.progressMeta}>
            <span className={s.progressLabel}>پیشرفت پردازش</span>
            <span className={`${s.progressPct} ${isTerminal ? s.progressPctTerminal : ''}`}>
              {new Intl.NumberFormat('fa-IR').format(progressPct)}٪
            </span>
          </div>
          <div
            className={s.progressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            aria-valuetext={`${progressPct} درصد از ${TIMELINE_STEPS.length} مرحله`}
            aria-label="پیشرفت پردازش معامله"
            tabIndex={0}
          >
            <div
              className={`${s.progressFill} ${isTerminal ? s.progressFillTerminal : ''}`}
              style={progressStyle}
            />
          </div>
          {/* One-line status explainer */}
          <p className={`${s.statusLine} ${isTerminal ? s.statusLineTerminal : ''}`}>
            <StatusIcon size={14} className={s.statusLineIcon} aria-hidden />
            <span>{STATUS_HELP[deal.status as DealStatus] ?? ''}</span>
          </p>
          {/* Steps */}
          <ol className={s.timeline}>
            {TIMELINE_STEPS.map((step, i) => {
              const cfg = STATUS_CONFIG[step];
              const StepIcon = cfg.icon;
              const stepClass = getStepClass(step, deal.status, terminalLog?.fromStatus);
              const logEntry = statusLogs.find((l) => l.toStatus === step);
              const isDone = stepClass === s.stepDone;
              const isActive = stepClass === s.stepActive;

              return (
                <li
                  key={step}
                  className={`${s.timelineStep} ${stepClass}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className={s.stepNode} aria-hidden>
                    {isDone ? <StepIcon size={13} strokeWidth={2.5} /> : null}
                    {isActive ? (
                      <>
                        <StepIcon size={13} strokeWidth={2.25} />
                        <span className={s.stepPulse} />
                      </>
                    ) : null}
                    {!isDone && !isActive ? FA_DIGITS[i] : null}
                  </span>
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
                    {logEntry?.note && <span className={s.stepNote}>{logEntry.note}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
          {/* Terminal callout (cancelled / disputed / refunded) */}{' '}
          {isTerminal && (
            <div className={`${s.terminalCallout} ${statusCfg?.colorClass ?? ''}`}>
              <StatusIcon size={16} className={s.terminalCalloutIcon} aria-hidden />
              <div>
                <span className={s.terminalCalloutTitle}>{statusCfg?.labelFa ?? deal.status}</span>
                {terminalLog && (
                  <time
                    className={s.terminalCalloutTime}
                    dateTime={new Date(terminalLog.createdAt).toISOString()}
                  >
                    {formatDate(terminalLog.createdAt)}
                  </time>
                )}
                <p className={s.terminalCalloutText}>{STATUS_HELP[deal.status as DealStatus]}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Dates ────────────────────────────────────────────────────────── */}
        <div className={s.datesSection} aria-label="تاریخ‌های مهم">
          <div className={s.dateItem}>
            <span className={s.dateIcon} aria-hidden>
              <CalendarPlus size={15} strokeWidth={1.75} />
            </span>
            <span className={s.dateLabel}>تاریخ ثبت</span>
            <time className={s.dateValue} dateTime={new Date(deal.createdAt).toISOString()}>
              {formatDate(deal.createdAt)}
            </time>
          </div>
          {deal.confirmedAt && (
            <div className={s.dateItem}>
              <span className={s.dateIcon} aria-hidden>
                <BadgeCheck size={15} strokeWidth={1.75} />
              </span>
              <span className={s.dateLabel}>تأیید شد</span>
              <time className={s.dateValue} dateTime={new Date(deal.confirmedAt).toISOString()}>
                {formatDate(deal.confirmedAt)}
              </time>
            </div>
          )}
          {deal.completedAt && (
            <div className={s.dateItem}>
              <span className={s.dateIcon} aria-hidden>
                <PackageCheck size={15} strokeWidth={1.75} />
              </span>
              <span className={s.dateLabel}>تکمیل شد</span>
              <time className={s.dateValue} dateTime={new Date(deal.completedAt).toISOString()}>
                {formatDate(deal.completedAt)}
              </time>
            </div>
          )}
        </div>

        {/* ── Support CTA ───────────────────────────────────────────────────── */}
        <section className={s.supportCard} aria-label="پشتیبانی">
          <span className={s.supportIcon} aria-hidden>
            <LifeBuoy size={18} strokeWidth={1.75} />
          </span>
          <div className={s.supportBody}>
            <h2 className={s.supportTitle}>سؤالی درباره این معامله دارید؟</h2>
            <p className={s.supportText}>کارشناسان ما همه‌روزه آماده‌ی پاسخگویی هستند.</p>
          </div>
          <Link href="/support" className={s.supportLink}>
            تماس با پشتیبانی
            {/* CTA رو به جلو در RTL باید به چپ اشاره کند */}
            <ArrowLeft size={14} strokeWidth={2} aria-hidden />
          </Link>
        </section>

        {/* Back link */}
        <div className={s.backRow}>
          <Link href="/money-transfer" className={s.backLink}>
            <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
            بازگشت به صفحه انتقال
          </Link>
        </div>
      </div>
    </main>
  );
}
