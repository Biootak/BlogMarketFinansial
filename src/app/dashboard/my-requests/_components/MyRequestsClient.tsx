'use client';

import s from './MyRequestsClient.module.css';
import { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  PackageSearch,
  AlertCircle,
  Zap,
  History,
  MessageSquare,
  CalendarClock,
} from 'lucide-react';
import { getMyServiceRequests } from '@/actions/serviceRequestActions';

// ─── Types ─────────────────────────────────────────────────────────────────── //

interface StatusLogEntry {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string | Date;
}

interface MyRequest {
  id: string;
  trackingCode: string;
  serviceType: string;
  amount: string;
  currency: string;
  status: string;
  urgency: string;
  adminNotes: string | null;
  estimatedCompletionAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  statusLogs: StatusLogEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────── //

const STATUS_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number }>; color: string }
> = {
  PENDING:     { label: 'در انتظار بررسی', icon: Clock,        color: 'oklch(60% 0.18 75)'   },
  IN_PROGRESS: { label: 'در حال انجام',    icon: RefreshCw,    color: 'oklch(52% 0.18 240)'  },
  COMPLETED:   { label: 'تکمیل شده',       icon: CheckCircle2, color: 'oklch(50% 0.18 155)'  },
  CANCELLED:   { label: 'لغو شده',         icon: XCircle,      color: 'oklch(52% 0.18 15)'   },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     'در انتظار بررسی',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED:   'تکمیل شده',
  CANCELLED:   'لغو شده',
};

const SERVICE_LABELS: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT:         'پرداخت آنلاین',
  TUITION_PAYMENT:        'پرداخت شهریه',
  FREELANCE_INCOME:       'نقد کردن درآمد',
  SOFTWARE_PURCHASE:      'خرید نرم‌افزار',
  OTHER:                  'سایر خدمات',
};

// ─── Row Component ────────────────────────────────────────────────────────── //

function RequestRow({ req }: { req: MyRequest }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[req.status] ?? STATUS_META.PENDING;
  const StatusIcon = meta.icon;

  return (
    <li className={s.row}>
      {/* Summary line — always visible */}
      <button
        type="button"
        className={s.summary}
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        <span className={s.statusIcon} style={{ color: meta.color }}>
          <StatusIcon size={16} />
        </span>
        <div className={s.summaryBody}>
          <span className={s.tracking} dir="ltr">{req.trackingCode}</span>
          <span className={s.service}>
            {SERVICE_LABELS[req.serviceType] ?? req.serviceType}
          </span>
        </div>
        <div className={s.summaryEnd}>
          <span className={s.amount} dir="ltr">{req.amount} {req.currency}</span>
          <span
            className={s.badge}
            data-status={req.status.toLowerCase()}
          >
            {meta.label}
          </span>
          {req.urgency === 'URGENT' && (
            <span className={s.urgentTag} title="فوری">
              <Zap size={11} />
            </span>
          )}
          <span className={s.toggleIcon} aria-hidden>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>
      </button>

      {/* Detail panel — expandable */}
      {expanded && (
        <div className={s.detail}>
          {/* Dates */}
          <div className={s.dates}>
            <span className={s.dateItem}>
              <Clock size={12} />
              ثبت: {new Date(req.createdAt).toLocaleDateString('fa-IR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
            <span className={s.dateItem}>
              <RefreshCw size={12} />
              آخرین بروزرسانی: {new Date(req.updatedAt).toLocaleDateString('fa-IR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
            {req.estimatedCompletionAt && (
              <span className={`${s.dateItem} ${s.dateEta}`}>
                <CalendarClock size={12} />
                زمان تخمینی تکمیل: {new Date(req.estimatedCompletionAt).toLocaleDateString('fa-IR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* Admin note */}
          {req.adminNotes && (
            <div className={s.adminNote}>
              <div className={s.adminNoteHeader}>
                <MessageSquare size={12} />
                <span>یادداشت تیم</span>
              </div>
              <p className={s.adminNoteText}>{req.adminNotes}</p>
            </div>
          )}

          {/* Status history */}
          {req.statusLogs.length > 0 && (
            <div className={s.history}>
              <div className={s.historyHeader}>
                <History size={12} />
                <span>تاریخچه وضعیت</span>
              </div>
              <ol className={s.historyList}>
                {req.statusLogs.map((log, i) => (
                  <li key={i} className={s.historyItem}>
                    <span className={s.historyDot} />
                    <div>
                      <span className={s.historyStatus}>
                        {log.fromStatus ? `${STATUS_LABELS[log.fromStatus] ?? log.fromStatus} ← ` : ''}
                        {STATUS_LABELS[log.toStatus] ?? log.toStatus}
                      </span>
                      {log.note && (
                        <span className={s.historyNote}>{log.note}</span>
                      )}
                      <time className={s.historyTime}>
                        {new Date(log.createdAt).toLocaleDateString('fa-IR', {
                          month: 'short', day: 'numeric',
                        })}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────── //

export default function MyRequestsClient() {
  const [requests, setRequests]     = useState<MyRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRequests = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    const result = await getMyServiceRequests({ page: p, limit: 10 });
    if (result.success && result.data) {
      setRequests(result.data as MyRequest[]);
      setTotalPages(result.pagination?.totalPages ?? 1);
    } else {
      setError(result.message ?? 'خطایی رخ داد.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests(page);
  }, [fetchRequests, page]);

  return (
    <section className={s.page}>
      {/* Header */}
      <header className={s.head}>
        <h1 className={s.title}>درخواست‌های من</h1>
        <p className={s.subtitle}>وضعیت و تاریخچه تمام سفارش‌های شما</p>
      </header>

      {/* Loading skeleton */}
      {loading && (
        <ul className={s.list} aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className={s.skeleton} aria-hidden />
          ))}
        </ul>
      )}

      {/* Error */}
      {!loading && error && (
        <div className={s.errorBox} role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && requests.length === 0 && (
        <div className={s.empty}>
          <PackageSearch size={36} className={s.emptyIcon} />
          <p className={s.emptyTitle}>هنوز درخواستی ثبت نکرده‌اید</p>
          <p className={s.emptySub}>
            درخواست‌های جدید از صفحه خدمات آنلاین ثبت می‌شوند.
          </p>
          <a href="/online-payment" className={s.cta}>ثبت درخواست جدید</a>
        </div>
      )}

      {/* List */}
      {!loading && !error && requests.length > 0 && (
        <>
          <ul className={s.list}>
            {requests.map((req) => (
              <RequestRow key={req.id} req={req} />
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className={s.pagination} aria-label="صفحه‌بندی">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={s.pageBtn}
              >
                قبلی
              </button>
              <span className={s.pageInfo}>
                صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={s.pageBtn}
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
