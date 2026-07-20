'use client';

import { getServiceRequestByTrackingCode } from '@/actions/serviceRequestActions';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Hash,
  History,
  MessageSquare,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { type FC, useState } from 'react';
import s from './TrackingForm.module.css';

// ─── Status Config ─────────────────────────────────────────────────────────── //

const STATUS_CONFIG = {
  PENDING: { label: 'در انتظار بررسی', icon: Clock, cls: s.statusPending },
  IN_PROGRESS: { label: 'در حال انجام', icon: RefreshCw, cls: s.statusProgress },
  COMPLETED: { label: 'تکمیل شده', icon: CheckCircle2, cls: s.statusDone },
  CANCELLED: { label: 'لغو شده', icon: XCircle, cls: s.statusCancelled },
};

const SERVICE_LABELS: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد فریلنسری',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار/اشتراک',
  OTHER: 'سایر خدمات',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

// ─── Types ─────────────────────────────────────────────────────────────────── //

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

// ─── Component ─────────────────────────────────────────────────────────────── //

const TrackingForm: FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    data?: TrackingData;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await getServiceRequestByTrackingCode(code.trim().toUpperCase());
      setResult(res as typeof result);
    } catch {
      setResult({ success: false, message: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.' });
    } finally {
      setLoading(false);
    }
  };

  const status = result?.data?.status ? STATUS_CONFIG[result.data.status] : null;
  const StatusIcon = status?.icon;

  return (
    <div className={s.wrap}>
      {/* Search Input */}
      <form onSubmit={handleSubmit} className={s.searchRow}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="کد پیگیری — مثال: BT-XXXXXXXX-XXXXXX"
          className={s.searchInput}
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          aria-label="کد پیگیری درخواست"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className={s.searchBtn}
          aria-label="جستجو"
        >
          {loading ? <span className={s.spinner} aria-hidden="true" /> : <Search size={17} />}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className={s.resultWrap} role="region" aria-live="polite" aria-label="نتیجه جستجو">
          {result.success && result.data ? (
            <div className={s.resultCard}>
              {/* Status Badge */}
              {status && StatusIcon && (
                <div className={`${s.statusBadge} ${status.cls}`}>
                  <StatusIcon size={14} />
                  <span>{status.label}</span>
                </div>
              )}

              {/* Core info rows */}
              <dl className={s.infoList}>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>کد پیگیری</dt>
                  <dd className={s.infoValue} dir="ltr">
                    {result.data.trackingCode}
                  </dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>نام</dt>
                  <dd className={s.infoValue}>{result.data.fullName}</dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>نوع خدمات</dt>
                  <dd className={s.infoValue}>
                    {SERVICE_LABELS[result.data.serviceType] ?? result.data.serviceType}
                  </dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>مبلغ</dt>
                  <dd className={s.infoValue} dir="ltr">
                    {result.data.amount} {result.data.currency}
                  </dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>تاریخ ثبت</dt>
                  <dd className={s.infoValue}>
                    {new Date(result.data.createdAt).toLocaleDateString('fa-IR')}
                  </dd>
                </div>
                <div className={s.infoRow}>
                  <dt className={s.infoLabel}>آخرین بروزرسانی</dt>
                  <dd className={s.infoValue}>
                    {new Date(result.data.updatedAt).toLocaleDateString('fa-IR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>

                {/* Estimated completion */}
                {result.data.estimatedCompletionAt && (
                  <div className={s.infoRow}>
                    <dt className={s.infoLabel}>
                      <CalendarClock size={12} style={{ display: 'inline', marginLeft: 4 }} />
                      زمان تخمینی تکمیل
                    </dt>
                    <dd className={s.infoValue}>
                      {new Date(result.data.estimatedCompletionAt).toLocaleDateString('fa-IR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </dd>
                  </div>
                )}

                {/* External transaction ID */}
                {result.data.externalTxId && (
                  <div className={s.infoRow}>
                    <dt className={s.infoLabel}>
                      <Hash size={12} style={{ display: 'inline', marginLeft: 4 }} />
                      شناسه تراکنش
                    </dt>
                    <dd className={s.infoValue} dir="ltr">
                      {result.data.externalTxId}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Admin note — shown if present */}
              {result.data.adminNotes && (
                <div className={s.adminNoteBox}>
                  <div className={s.adminNoteHeader}>
                    <MessageSquare size={13} />
                    <span>یادداشت تیم</span>
                  </div>
                  <p className={s.adminNoteText}>{result.data.adminNotes}</p>
                </div>
              )}

              {/* Status history */}
              {result.data.statusLogs.length > 0 && (
                <div className={s.historySection}>
                  <div className={s.historyHeader}>
                    <History size={13} />
                    <span>تاریخچه وضعیت</span>
                  </div>
                  <ol className={s.historyList}>
                    {result.data.statusLogs.map((log, i) => (
                      <li key={i} className={s.historyItem}>
                        <span className={s.historyDot} />
                        <div className={s.historyBody}>
                          <span className={s.historyStatus}>
                            {log.fromStatus
                              ? `${STATUS_LABELS[log.fromStatus] ?? log.fromStatus} → `
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
            </div>
          ) : (
            <div className={s.errorBox} role="alert">
              <AlertCircle size={15} />
              <span>{result.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackingForm;
