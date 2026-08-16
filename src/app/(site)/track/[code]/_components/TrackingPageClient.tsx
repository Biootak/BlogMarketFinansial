'use client';

/**
 * TrackingPageClient — پیگیری درخواست سرویس (کدهای SR یا BT)
 *
 * نسخه‌ی ۲۰۲۶: هماهنگ با زبان طراحی پریمیوم صفحه‌ی معامله ارزی
 * (هیروی تیره + استپر با نوار پیشرفت + کارت پشتیبانی).
 * کامپوننت کلاینت است چون دکمه‌ی رفرش زنده و کپی لینک دارد.
 */

import { getServiceRequestByTrackingCode } from '@/actions/serviceRequestActions';
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Hash,
  History,
  LifeBuoy,
  ListChecks,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import t from '../track.module.css';
import PrintReceiptButton, { type ReceiptData } from './PrintReceiptButton';
import TrackShareButton from './TrackShareButton';
import s from './TrackingPageClient.module.css';

// ─── Constants ────────────────────────────────────────────────────────────── //

const STATUS_CONFIG = {
  PENDING: {
    label: 'در انتظار بررسی',
    icon: Clock,
    cls: t.statusPending,
    help: 'درخواست شما ثبت شده و در صف بررسی کارشناسان است.',
  },
  IN_PROGRESS: {
    label: 'در حال انجام',
    icon: RefreshCw,
    cls: t.statusProcessing,
    help: 'درخواست در حال انجام است؛ معمولاً همین امروز تکمیل می‌شود.',
  },
  COMPLETED: {
    label: 'تکمیل شده',
    icon: CheckCircle2,
    cls: t.statusCompleted,
    help: 'درخواست با موفقیت تکمیل شد. رسید برای شما ارسال شده است.',
  },
  CANCELLED: {
    label: 'لغو شده',
    icon: XCircle,
    cls: t.statusCancelled,
    help: 'این درخواست لغو شده است. برای جزئیات بیشتر با پشتیبانی تماس بگیرید.',
  },
} as const;

const STEPS = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
type StepKey = (typeof STEPS)[number];
type StatusKey = keyof typeof STATUS_CONFIG;

const FA_DIGITS = ['۱', '۲', '۳'];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

const SERVICE_LABELS: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد فریلنسری',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار/اشتراک',
  GIFT_CARD: 'گیفت کارت',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  CRYPTO_BUY: 'خرید ارز دیجیتال',
  CRYPTO_SELL: 'فروش ارز دیجیتال',
  PAYPAL_TRANSFER: 'انتقال پی‌پال / اسکریل',
  MOBILE_TOPUP: 'شارژ موبایل',
  BILL_PAYMENT: 'پرداخت قبض',
  OTHER: 'سایر خدمات',
};

function getStepClass(step: StepKey, status: StatusKey, terminalFrom: string | null): string {
  if (status === 'CANCELLED') {
    const stepIdx = STEPS.indexOf(step);
    const fromIdx = terminalFrom ? STEPS.indexOf(terminalFrom as StepKey) : -1;
    if (fromIdx !== -1 && stepIdx < fromIdx) return t.stepDone;
    if (fromIdx !== -1 && stepIdx === fromIdx) return t.stepCancelled;
    return t.stepPending;
  }
  const curIdx = STEPS.indexOf(status as StepKey);
  const stepIdx = STEPS.indexOf(step);
  if (stepIdx < curIdx) return t.stepDone;
  // COMPLETED حالت پایانی است — مرحله‌ی آخر «انجام‌شده» است نه «فعال»
  if (stepIdx === curIdx) return status === 'COMPLETED' ? t.stepDone : t.stepActive;
  return t.stepPending;
}

// ─── Types ────────────────────────────────────────────────────────────────── //

interface StatusLogEntry {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: Date | string;
}

export interface TrackingData {
  trackingCode: string;
  fullName: string;
  serviceType: string;
  amount: string;
  currency: string;
  status: StatusKey;
  urgency: string;
  description: string | null;
  contactMethod: string | null;
  estimatedCompletionAt: Date | string | null;
  externalTxId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  statusLogs: StatusLogEntry[];
}

// ─── Props ────────────────────────────────────────────────────────────────── //

interface Props {
  code: string;
  initialData: TrackingData | null;
  initialError: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────── //

function formatDate(d: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

// ─── Component ────────────────────────────────────────────────────────────── //

export default function TrackingPageClient({ code, initialData, initialError }: Props) {
  const [data, setData] = useState<TrackingData | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Refresh ─────────────────────────────────────────────────────────────── //
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getServiceRequestByTrackingCode(code);
      if (res.success && res.data) {
        setData(res.data as unknown as TrackingData);
      } else {
        setError('error' in res ? res.error.message : 'درخواستی با این کد یافت نشد.');
      }
    } catch {
      setError('خطا در بارگذاری وضعیت. دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  // ── Copy share link ──────────────────────────────────────────────────────── //
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // ── Auto-refresh (polling) ──────────────────────────────────────────────── //
  // هر ۴۵ ثانیه وضعیت را تازه می‌کند؛ وقتی وضعیت پایانی شد (کامل/لغو) یا
  // تب مخفی بود پل نمی‌کند. دکمه‌ی رفرش دستی همیشه در دسترس است.
  const currentStatus = data?.status;
  useEffect(() => {
    if (!currentStatus || currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
      return;
    }
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 45_000);
    return () => clearInterval(id);
  }, [currentStatus, refresh]);

  const status = data ? STATUS_CONFIG[data.status] : null;
  const StatusIcon = status?.icon;
  const isCancelled = data?.status === 'CANCELLED';

  // رسید چاپی فقط برای درخواست تکمیل‌شده
  const receiptData: ReceiptData | null =
    data?.status === 'COMPLETED'
      ? {
          docTitle: 'رسید درخواست خدمات',
          trackingCode: data.trackingCode,
          statusFa: 'تکمیل شده',
          completedAtFa: (() => {
            const doneLog = data.statusLogs.find((l) => l.toStatus === 'COMPLETED');
            return doneLog ? formatDate(doneLog.createdAt) : undefined;
          })(),
          primaryLabel: 'مبلغ درخواست',
          primaryValue: `${data.amount} ${data.currency}`,
          lines: [
            { label: 'نوع سرویس', value: SERVICE_LABELS[data.serviceType] ?? data.serviceType },
            { label: 'تاریخ ثبت', value: formatDate(data.createdAt) },
            ...(data.estimatedCompletionAt
              ? [{ label: 'زمان تخمینی تکمیل', value: formatDate(data.estimatedCompletionAt) }]
              : []),
            ...(data.externalTxId ? [{ label: 'شناسه تراکنش', value: data.externalTxId }] : []),
          ],
          footerNote: 'این رسید توسط سامانه‌ی کیف پول دیجیتال صادر شده است.',
        }
      : null;

  // پیشرفت: PENDING=0, IN_PROGRESS=50, COMPLETED=100؛ لغو → آخرین مرحله‌ی رسیده
  const terminalLog = isCancelled
    ? (data?.statusLogs.find((l) => l.toStatus === 'CANCELLED') ?? null)
    : null;
  const activeIdx = isCancelled
    ? STEPS.indexOf((terminalLog?.fromStatus ?? '') as StepKey)
    : data
      ? STEPS.indexOf(data.status as StepKey)
      : -1;
  const progressPct = data
    ? Math.max(0, Math.round((Math.max(0, activeIdx) / (STEPS.length - 1)) * 100))
    : 0;

  const counterLabel = isCancelled
    ? (status?.label ?? '')
    : `مرحله ${FA_DIGITS[Math.max(0, activeIdx)] ?? '—'} از ۳`;

  return (
    <div className={s.root}>
      {/* ── Error state ── */}
      {error && !data && (
        <div className={s.errorBox} role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* ════════════ Hero ════════════ */}
          <section className={t.hero} aria-label="اطلاعات درخواست">
            <div className={t.heroAmbient} aria-hidden />
            <div className={t.heroHairline} aria-hidden />
            <div className={t.heroInner}>
              {status && StatusIcon && (
                <div className={`${t.heroBadge} ${status.cls}`}>
                  <span className={t.heroBadgeDot} aria-hidden />
                  <StatusIcon size={12} strokeWidth={2} aria-hidden />
                  {status.label}
                </div>
              )}

              <h1 className={t.heroTitle}>پیگیری درخواست</h1>

              <div className={t.trackCodeWrap}>
                <span className={t.trackCode} dir="ltr" aria-label={`کد پیگیری ${code}`}>
                  {code}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  className={s.heroIconBtn}
                  aria-label={copied ? 'لینک کپی شد' : 'کپی لینک پیگیری'}
                >
                  {copied ? (
                    <Check size={13} strokeWidth={2} />
                  ) : (
                    <Copy size={13} strokeWidth={1.75} />
                  )}
                  {copied ? 'کپی شد!' : 'کپی'}
                </button>
                <TrackShareButton />
                {receiptData && <PrintReceiptButton receipt={receiptData} />}
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className={s.heroIconBtn}
                  aria-label="بروزرسانی وضعیت"
                >
                  <RefreshCw size={13} className={loading ? s.spinning : ''} />
                </button>
              </div>

              <div className={t.heroUpdated} aria-label="آخرین به‌روزرسانی">
                <span className={t.heroUpdatedDot} aria-hidden />
                آخرین به‌روزرسانی:{' '}
                <time dateTime={new Date(data.updatedAt).toISOString()}>
                  {formatDate(data.updatedAt)}
                </time>
              </div>
            </div>
          </section>

          {/* ════════════ Content ════════════ */}
          <div className={t.content}>
            {/* ── Summary card ── */}
            <section className={t.summaryCard} aria-label="جزئیات درخواست">
              <div className={s.amountRow}>
                <div className={s.amountMain}>
                  <span className={s.amountLabel}>مبلغ درخواست</span>
                  <div className={s.amountValueRow}>
                    <span className={s.amountValue} dir="ltr">
                      {data.amount}
                    </span>
                    <span className={s.amountCurrency}>{data.currency}</span>
                  </div>
                </div>
                <div className={s.chips}>
                  <span className={s.serviceChip}>
                    {SERVICE_LABELS[data.serviceType] ?? data.serviceType}
                  </span>
                  {data.urgency === 'URGENT' && <span className={s.urgentChip}>فوری</span>}
                </div>
              </div>

              <dl className={s.infoList}>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>نام</dt>
                  <dd className={s.infoValue}>{data.fullName}</dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>
                    <CalendarClock size={12} aria-hidden />
                    تاریخ ثبت
                  </dt>
                  <dd className={s.infoValue}>{formatDate(data.createdAt)}</dd>
                </div>
                {data.estimatedCompletionAt && (
                  <div className={s.infoRow}>
                    <dt className={s.infoLabel}>
                      <CalendarClock size={12} aria-hidden />
                      زمان تخمینی تکمیل
                    </dt>
                    <dd className={s.infoValue}>{formatDate(data.estimatedCompletionAt)}</dd>
                  </div>
                )}
                {data.externalTxId && (
                  <div className={s.infoRow}>
                    <dt className={s.infoLabel}>
                      <Hash size={12} aria-hidden />
                      شناسه تراکنش
                    </dt>
                    <dd className={s.infoValue} dir="ltr">
                      {data.externalTxId}
                    </dd>
                  </div>
                )}
                {data.contactMethod && (
                  <div className={s.infoRow}>
                    <dt className={s.infoLabel}>
                      <MessageCircle size={12} aria-hidden />
                      روش تماس
                    </dt>
                    <dd className={s.infoValue}>
                      {data.contactMethod === 'telegram' ? 'تلگرام' : 'واتساپ'}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* ── توضیحات کاربر ── */}
            {data.description && (
              <section className={s.descCard} aria-label="توضیحات">
                <div className={s.descHeader}>
                  <MessageSquare size={13} aria-hidden />
                  <span>توضیحات شما</span>
                </div>
                <p className={s.descText}>{data.description}</p>
              </section>
            )}

            {/* ── Steps card ── */}
            <section className={t.stepsCard} aria-label="مراحل درخواست">
              <div className={t.stepsHead}>
                <div className={t.stepsHeading}>
                  <span className={t.stepsIcon} aria-hidden>
                    <ListChecks size={17} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h2 className={t.stepsTitle}>مراحل پردازش</h2>
                    <p className={t.stepsSubtitle}>مسیر پیشرفت درخواست</p>
                  </div>
                </div>
                <span className={`${t.stepsCounter} ${status?.cls ?? ''}`}>{counterLabel}</span>
              </div>

              <div className={t.progressMeta}>
                <span className={t.progressLabel}>پیشرفت پردازش</span>
                <span className={`${t.progressPct} ${isCancelled ? t.progressPctTerminal : ''}`}>
                  {new Intl.NumberFormat('fa-IR').format(progressPct)}٪
                </span>
              </div>
              <div
                className={t.progressTrack}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
                aria-valuetext={`${progressPct} درصد از ${STEPS.length} مرحله`}
                aria-label="پیشرفت پردازش درخواست"
                tabIndex={0}
              >
                <div
                  className={`${t.progressFill} ${isCancelled ? t.progressFillTerminal : ''}`}
                  style={{ '--p': progressPct / 100 } as CSSProperties}
                />
              </div>

              <p className={`${t.statusLine} ${isCancelled ? t.statusLineTerminal : ''}`}>
                {StatusIcon && <StatusIcon size={14} className={t.statusLineIcon} aria-hidden />}
                <span>{status?.help ?? ''}</span>
              </p>

              <ol className={t.timeline}>
                {STEPS.map((step, i) => {
                  const cfg = STATUS_CONFIG[step];
                  const StepIcon = cfg.icon;
                  const stepCls = getStepClass(step, data.status, terminalLog?.fromStatus ?? null);
                  const isDone = stepCls === t.stepDone;
                  const isActive = stepCls === t.stepActive;
                  const logEntry = data.statusLogs.find((l) => l.toStatus === step);

                  return (
                    <li
                      key={step}
                      className={`${t.timelineStep} ${stepCls}`}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      <span className={t.stepNode} aria-hidden>
                        {isDone ? <StepIcon size={13} strokeWidth={2.5} /> : null}
                        {isActive ? (
                          <>
                            <StepIcon size={13} strokeWidth={2.25} />
                            <span className={t.stepPulse} />
                          </>
                        ) : null}
                        {!isDone && !isActive ? FA_DIGITS[i] : null}
                      </span>
                      <div className={t.stepBody}>
                        <span className={t.stepLabel}>{cfg.label}</span>
                        {logEntry && (
                          <time
                            className={t.stepTime}
                            dateTime={new Date(logEntry.createdAt).toISOString()}
                          >
                            {formatDate(logEntry.createdAt)}
                          </time>
                        )}
                        {logEntry?.note && <span className={t.stepNote}>{logEntry.note}</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {isCancelled && (
                <div className={`${t.terminalCallout} ${status?.cls ?? ''}`}>
                  {StatusIcon && (
                    <StatusIcon size={16} className={t.terminalCalloutIcon} aria-hidden />
                  )}
                  <div>
                    <span className={t.terminalCalloutTitle}>{status?.label}</span>
                    {terminalLog && (
                      <time
                        className={t.terminalCalloutTime}
                        dateTime={new Date(terminalLog.createdAt).toISOString()}
                      >
                        {formatDate(terminalLog.createdAt)}
                      </time>
                    )}
                    <p className={t.terminalCalloutText}>{status?.help}</p>
                  </div>
                </div>
              )}
            </section>

            {/* ── History ── */}
            {data.statusLogs.length > 0 && (
              <section className={s.historyCard} aria-label="تاریخچه وضعیت">
                <div className={s.historyHeader}>
                  <History size={13} aria-hidden />
                  <span>تاریخچه وضعیت</span>
                </div>
                <ol className={s.historyList}>
                  {data.statusLogs.map((log, i) => (
                    <li key={`${log.toStatus}-${log.createdAt}-${i}`} className={s.historyItem}>
                      <span className={s.historyDot} aria-hidden />
                      <div className={s.historyBody}>
                        <span className={s.historyStatus}>
                          {log.fromStatus
                            ? `${STATUS_LABELS[log.fromStatus] ?? log.fromStatus} ← `
                            : ''}
                          {STATUS_LABELS[log.toStatus] ?? log.toStatus}
                        </span>
                        {log.note && <span className={s.historyNote}>{log.note}</span>}
                        <time className={s.historyTime}>{formatDate(log.createdAt)}</time>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* ── Support CTA ── */}
            <section className={t.supportCard} aria-label="پشتیبانی">
              <span className={t.supportIcon} aria-hidden>
                <LifeBuoy size={18} strokeWidth={1.75} />
              </span>
              <div className={t.supportBody}>
                <h2 className={t.supportTitle}>سؤالی درباره این درخواست دارید؟</h2>
                <p className={t.supportText}>کارشناسان ما همه‌روزه آماده‌ی پاسخگویی هستند.</p>
              </div>
              <Link href="/support" className={t.supportLink}>
                تماس با پشتیبانی
                <ArrowLeft size={14} strokeWidth={2} aria-hidden />
              </Link>
            </section>

            {/* ── Back ── */}
            <div className={t.backRow}>
              <Link href="/money-transfer" className={t.backLink}>
                <ArrowLeftRight size={14} strokeWidth={1.75} aria-hidden />
                بازگشت به صفحه ثبت درخواست
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
