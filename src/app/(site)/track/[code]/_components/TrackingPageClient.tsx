'use client';

import { getServiceRequestByTrackingCode } from '@/actions/serviceRequestActions';
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Hash,
  History,
  MessageSquare,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import s from './TrackingPageClient.module.css';

// ─── Constants ────────────────────────────────────────────────────────────── //

const STATUS_CONFIG = {
  PENDING: { label: 'در انتظار بررسی', icon: Clock, cls: s.statusPending },
  IN_PROGRESS: { label: 'در حال انجام', icon: RefreshCw, cls: s.statusProgress },
  COMPLETED: { label: 'تکمیل شده', icon: CheckCircle2, cls: s.statusDone },
  CANCELLED: { label: 'لغو شده', icon: XCircle, cls: s.statusCancelled },
} as const;

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
  OTHER: 'سایر خدمات',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

// ─── Types ────────────────────────────────────────────────────────────────── //

type StatusKey = keyof typeof STATUS_CONFIG;

interface StatusLogEntry {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: Date | string;
}

interface TrackingData {
  trackingCode: string;
  fullName: string;
  serviceType: string;
  amount: string;
  currency: string;
  status: StatusKey;
  urgency: string;
  adminNotes: string | null;
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
        setData(res.data as TrackingData);
      } else {
        setError(res.message ?? 'درخواستی با این کد یافت نشد.');
      }
    } catch {
      setError('خطا در بارگذاری وضعیت. دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  // ── Copy share link ──────────────────────────────────────────────────────── //
  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const status = data?.status ? STATUS_CONFIG[data.status] : null;
  const StatusIcon = status?.icon;

  return (
    <div className={s.root}>
      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.codeRow}>
          <span className={s.codeLabel}>کد پیگیری</span>
          <span className={s.code} dir="ltr">{code}</span>
        </div>
        <div className={s.headerActions}>
          <button
            type="button"
            onClick={copyLink}
            className={s.btnIcon}
            aria-label={copied ? 'لینک کپی شد' : 'کپی لینک پیگیری'}
            title="کپی لینک برای اشتراک‌گذاری"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className={s.btnIcon}
            aria-label="بروزرسانی وضعیت"
            title="بروزرسانی"
          >
            <RefreshCw size={15} className={loading ? s.spinning : ''} />
          </button>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && !data && (
        <div className={s.errorBox} role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Result card ── */}
      {data && (
        <div className={s.card}>

          {/* Card header: status badge + service type */}
          <div className={s.cardHead}>
            {status && StatusIcon && (
              <div className={`${s.statusBadge} ${status.cls}`}>
                <StatusIcon size={13} />
                <span>{status.label}</span>
              </div>
            )}
            <span className={s.serviceChip}>
              {SERVICE_LABELS[data.serviceType] ?? data.serviceType}
            </span>
          </div>

          {/* Amount row — prominent display */}
          <div className={s.amountRow}>
            <span className={s.amountLabel}>مبلغ</span>
            <span className={s.amountValue} dir="ltr">{data.amount}</span>
            <span className={s.amountCurrency}>{data.currency}</span>
          </div>

          {/* Core info */}
          <dl className={s.infoList}>
            <div className={s.infoRow}>
              <dt className={s.infoLabel}>نام</dt>
              <dd className={s.infoValue}>{data.fullName}</dd>
            </div>
            <div className={s.infoRow}>
              <dt className={s.infoLabel}>تاریخ ثبت</dt>
              <dd className={s.infoValue}>
                {new Date(data.createdAt).toLocaleDateString('fa-IR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            {data.estimatedCompletionAt && (
              <div className={s.infoRow}>
                <dt className={s.infoLabel}>
                  <CalendarClock size={12} aria-hidden />
                  زمان تخمینی تکمیل
                </dt>
                <dd className={s.infoValue}>
                  {new Date(data.estimatedCompletionAt).toLocaleDateString('fa-IR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            )}
            {data.externalTxId && (
              <div className={s.infoRow}>
                <dt className={s.infoLabel}>
                  <Hash size={12} aria-hidden />
                  شناسه تراکنش
                </dt>
                <dd className={s.infoValue} dir="ltr">{data.externalTxId}</dd>
              </div>
            )}
          </dl>

          {/* Admin note */}
          {data.adminNotes && (
            <div className={s.noteBox}>
              <div className={s.noteHeader}>
                <MessageSquare size={13} aria-hidden />
                <span>یادداشت تیم</span>
              </div>
              <p className={s.noteText}>{data.adminNotes}</p>
            </div>
          )}

          {/* Status history — vertical timeline */}
          {data.statusLogs.length > 0 && (
            <div className={s.history}>
              <div className={s.historyHeader}>
                <History size={13} aria-hidden />
                <span>تاریخچه وضعیت</span>
              </div>
              <ol className={s.historyList}>
                {data.statusLogs.map((log, i) => (
                  <li key={i} className={s.historyItem}>
                    <span className={s.historyDot} aria-hidden />
                    <div className={s.historyBody}>
                      <span className={s.historyStatus}>
                        {log.fromStatus
                          ? `${STATUS_LABELS[log.fromStatus] ?? log.fromStatus} ← `
                          : ''}
                        {STATUS_LABELS[log.toStatus] ?? log.toStatus}
                      </span>
                      {log.note && <span className={s.historyNote}>{log.note}</span>}
                      <time className={s.historyTime}>
                        {new Date(log.createdAt).toLocaleDateString('fa-IR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* CTA */}
          <div className={s.cta}>
            <a href="/online-payment#contact" className={s.ctaLink}>
              <span>ثبت درخواست جدید</span>
              <ArrowUpRight size={15} />
            </a>
          </div>

        </div>
      )}
    </div>
  );
}
