'use client';

import { issueServiceOtp, verifyServiceOtpAndLink } from '@/actions/progressive-capture';
import {
  cancelMyServiceRequest,
  claimGuestRequest,
  getMyServiceRequests,
} from '@/actions/serviceRequestActions';
import {
  AlertCircle,
  ArrowRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  History,
  KeyRound,
  Link2,
  MessageSquare,
  PackageSearch,
  Plus,
  RefreshCw,
  RotateCcw,
  XCircle,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './MyRequestsClient.module.css';

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
  PENDING: { label: 'در انتظار بررسی', icon: Clock, color: 'var(--ds-status-pending-fg)' },
  IN_PROGRESS: { label: 'در حال انجام', icon: RefreshCw, color: 'var(--ds-status-progress-fg)' },
  COMPLETED: { label: 'تکمیل شده', icon: CheckCircle2, color: 'var(--ds-status-success-fg)' },
  CANCELLED: { label: 'لغو شده', icon: XCircle, color: 'var(--ds-status-error-fg)' },
};

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
  FREELANCE_INCOME: 'نقد کردن درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
  GIFT_CARD: 'گیفت کارت',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  CRYPTO_BUY: 'خرید ارز دیجیتال',
  CRYPTO_SELL: 'فروش ارز دیجیتال',
  PAYPAL_TRANSFER: 'پی‌پال / اسکریل',
  OTHER: 'سایر خدمات',
};

// ─── RequestRow ──────────────────────────────────────────────────────────── //

// status → CSS custom property for accent bar + icon bg
const STATUS_ACCENT: Record<string, string> = {
  PENDING: 'var(--ds-status-pending-fg)',
  IN_PROGRESS: 'var(--ds-status-progress-fg)',
  COMPLETED: 'var(--ds-status-success-fg)',
  CANCELLED: 'var(--ds-status-error-fg)',
};

function RequestRow({
  req,
  onCancelled,
}: {
  req: MyRequest;
  onCancelled: (trackingCode: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr] = useState('');
  const [cancelDone, setCancelDone] = useState(false);
  const [localStatus, setLocalStatus] = useState(req.status);

  const meta = STATUS_META[localStatus] ?? STATUS_META.PENDING;
  const StatusIcon = meta.icon;
  const accentColor = STATUS_ACCENT[localStatus] ?? STATUS_ACCENT.PENDING;

  // کانترِ مهلت لغو — تعداد دقیقه مانده
  const [cancelMinsLeft, setCancelMinsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (localStatus !== 'PENDING') {
      setCancelMinsLeft(null);
      return;
    }
    const created = new Date(req.createdAt).getTime();
    const deadline = created + 30 * 60 * 1000;
    const update = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 60000));
      setCancelMinsLeft(left);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [localStatus, req.createdAt]);

  const canCancel = localStatus === 'PENDING' && (cancelMinsLeft ?? 0) > 0;

  const handleCancel = async () => {
    if (!canCancel) return;
    setCancelling(true);
    setCancelErr('');
    const res = await cancelMyServiceRequest(req.trackingCode);
    setCancelling(false);
    if (res.success) {
      setLocalStatus('CANCELLED');
      setCancelDone(true);
      onCancelled(req.trackingCode);
    } else {
      setCancelErr(res.error?.message ?? '');
    }
  };

  return (
    <li className={s.row} style={{ '--row-accent': accentColor } as React.CSSProperties}>
      {/* Summary */}
      <button
        type="button"
        className={s.summary}
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
        aria-controls={`detail-${req.id}`}
      >
        <span className={s.statusIcon}>
          <StatusIcon size={16} />
        </span>
        <div className={s.summaryBody}>
          <span className={s.tracking} dir="ltr">
            {req.trackingCode}
          </span>
          <span className={s.service}>{SERVICE_LABELS[req.serviceType] ?? req.serviceType}</span>
        </div>
        <div className={s.summaryEnd}>
          <span className={s.amount} dir="ltr">
            {req.amount} {req.currency}
          </span>
          <span className={s.badge} data-status={localStatus.toLowerCase()}>
            {meta.label}
          </span>
          {req.urgency === 'URGENT' && (
            <span className={s.urgentTag} title="فوری">
              <Zap size={11} />
            </span>
          )}
          <span className={`${s.toggleIcon} ${expanded ? s.toggleIconOpen : ''}`} aria-hidden>
            <ChevronDown size={15} />
          </span>
        </div>
      </button>

      {/* Detail */}
      {expanded && (
        <div id={`detail-${req.id}`} className={s.detail}>
          {/* Dates */}
          <div className={s.dates}>
            <span className={s.dateItem}>
              <Clock size={12} />
              ثبت:{' '}
              {new Date(req.createdAt).toLocaleDateString('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className={s.dateItem}>
              <RefreshCw size={12} />
              آخرین بروزرسانی:{' '}
              {new Date(req.updatedAt).toLocaleDateString('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            {req.estimatedCompletionAt && (
              <span className={`${s.dateItem} ${s.dateEta}`}>
                <CalendarClock size={12} />
                زمان تخمینی:{' '}
                {new Date(req.estimatedCompletionAt).toLocaleDateString('fa-IR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
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
                  // biome-ignore lint/suspicious/noArrayIndexKey: status logs have no stable id
                  <li key={i} className={s.historyItem}>
                    <span className={s.historyDot} />
                    <div>
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
                        })}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Cancel zone */}
          {!cancelDone && localStatus === 'PENDING' && (
            <div className={s.cancelZone}>
              {cancelErr && (
                <p className={s.cancelErr} role="alert">
                  <AlertCircle size={12} /> {cancelErr}
                </p>
              )}
              {canCancel ? (
                <div className={s.cancelRow}>
                  <span className={s.cancelTimer}>
                    <Clock size={11} />
                    مهلت لغو: {cancelMinsLeft?.toLocaleString('fa-IR')} دقیقه
                  </span>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className={s.btnCancel}
                  >
                    {cancelling ? (
                      <>
                        <span className={s.spinnerSm} aria-hidden="true" /> در حال لغو…
                      </>
                    ) : (
                      <>
                        <Ban size={12} /> لغو سفارش
                      </>
                    )}
                  </button>
                </div>
              ) : localStatus === 'PENDING' ? (
                <p className={s.cancelExpired}>
                  مهلت لغو خودکار پایان یافته. برای لغو با پشتیبانی تماس بگیرید.
                </p>
              ) : null}
            </div>
          )}

          {cancelDone && (
            <output className={s.cancelSuccess}>
              <CheckCircle2 size={13} /> سفارش لغو شد.
            </output>
          )}

          {/* Track link */}
          <a
            href={`/track/${req.trackingCode}`}
            className={s.trackLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ArrowRight size={12} />
            مشاهده صفحه پیگیری
          </a>
        </div>
      )}
    </li>
  );
}

// ─── ClaimGuestPanel ─────────────────────────────────────────────────────── //

function ClaimGuestPanel({ onClaimed }: { onClaimed: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  // OTP phase
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [trackingForOtp, setTrackingForOtp] = useState('');

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const sendOtp = async () => {
    setOtpSending(true);
    const res = await issueServiceOtp({ email: otpEmail, trackingCode: trackingForOtp });
    setOtpSending(false);
    if (res.success) {
      setOtpTimer(60);
      setMsg('');
    } else {
      setMsg(res.error.message);
      setIsErr(true);
    }
  };

  const handleClaim = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setMsg('');
    setIsErr(false);
    const res = await claimGuestRequest(code.trim());
    setLoading(false);
    if (!res.success) {
      setMsg(res.error?.message ?? '');
      setIsErr(true);
      return;
    }
    if (res.data.requiresOtp && res.data.email) {
      setNeedsOtp(true);
      setOtpEmail(res.data.email);
      setTrackingForOtp(code.trim().toUpperCase());
      setMsg('');
      setIsErr(false);
      // auto-send OTP
      const otpRes = await issueServiceOtp({
        email: res.data.email,
        trackingCode: code.trim().toUpperCase(),
      });
      if (otpRes.success) setOtpTimer(60);
      return;
    }
    // directly claimed
    setMsg('سفارش با موفقیت به حساب شما اضافه شد!');
    setIsErr(false);
    setTimeout(() => {
      setOpen(false);
      onClaimed();
    }, 1200);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setOtpVerifying(true);
    setMsg('');
    const res = await verifyServiceOtpAndLink({
      email: otpEmail,
      code: otpCode,
      trackingCode: trackingForOtp,
    });
    setOtpVerifying(false);
    if (res.success) {
      setMsg('سفارش با موفقیت به حساب شما اضافه شد!');
      setIsErr(false);
      setTimeout(() => {
        setOpen(false);
        onClaimed();
      }, 1200);
    } else {
      setMsg(res.error.message);
      setIsErr(true);
    }
  };

  const reset = () => {
    setCode('');
    setMsg('');
    setIsErr(false);
    setNeedsOtp(false);
    setOtpCode('');
    setOtpTimer(0);
  };

  return (
    <div className={s.claimPanel}>
      <button
        type="button"
        className={s.claimToggle}
        onClick={() => {
          setOpen((p) => !p);
          reset();
        }}
        aria-expanded={open}
      >
        <Link2 size={13} />
        <span>اضافه کردن سفارش مهمان</span>
        <ChevronDown size={13} className={open ? s.claimChevronOpen : ''} />
      </button>

      {open && (
        <div className={s.claimBody}>
          {!needsOtp ? (
            <>
              <p className={s.claimDesc}>
                اگر سفارشی به عنوان مهمان داده‌اید، کد پیگیری را وارد کنید تا به حسابتان وصل شود.
              </p>
              <div className={s.claimRow}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="BT-XXXXXXXX-XXXXXX"
                  className={s.claimInput}
                  dir="ltr"
                  maxLength={20}
                  aria-label="کد پیگیری سفارش مهمان"
                />
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={loading || !code.trim()}
                  className={s.claimBtn}
                >
                  {loading ? <span className={s.spinnerSm} aria-hidden="true" /> : 'اضافه کن'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={s.claimDesc}>
                کد ۶ رقمی ارسال‌شده به <strong dir="ltr">{otpEmail}</strong> را وارد کنید:
              </p>
              <div className={s.otpRow}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className={s.otpInput}
                  placeholder="_ _ _ _ _ _"
                  dir="ltr"
                  aria-label="کد تأیید"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || otpCode.length !== 6}
                  className={s.claimBtn}
                >
                  {otpVerifying ? (
                    <span className={s.spinnerSm} aria-hidden="true" />
                  ) : (
                    <>
                      <KeyRound size={12} /> تأیید
                    </>
                  )}
                </button>
              </div>
              <div className={s.otpFooter}>
                {otpTimer > 0 ? (
                  <span className={s.otpTimer} aria-live="polite">
                    ارسال مجدد در {otpTimer.toLocaleString('fa-IR')} ثانیه
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpSending}
                    className={s.otpResend}
                  >
                    <RotateCcw size={11} /> ارسال مجدد
                  </button>
                )}
              </div>
            </>
          )}

          {msg && (
            <p className={isErr ? s.claimErr : s.claimOk} role={isErr ? 'alert' : 'status'}>
              {isErr ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────── //

export default function MyRequestsClient() {
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Bug-fix: total را از pagination می‌گیریم، نه requests.length (که فقط صفحه جاری است)
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(page);
  pageRef.current = page;

  const fetchRequests = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    const result = await getMyServiceRequests({ page: p, limit: 10 });
    if (result.success && result.data) {
      // M1: result.data حالا { requests, pagination } است (نه { data, pagination })
      const resData = result.data as {
        requests: MyRequest[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
      setRequests(resData.requests);
      setTotalPages(resData.pagination.totalPages ?? 1);
      setTotalCount(resData.pagination.total ?? 0);
    } else {
      setError('error' in result ? result.error.message : 'خطایی رخ داد.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests(page);
  }, [fetchRequests, page]);

  const handleCancelled = useCallback(() => {
    // Re-fetch to get updated status log
    fetchRequests(pageRef.current);
  }, [fetchRequests]);

  // Bug-fix: stats.total از pagination.total می‌آید نه requests.length
  // requests.length فقط آیتم‌های صفحه جاری است (max 10) — totalCount کل رکوردهای DB است
  const stats = {
    total: totalCount,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    inProgress: requests.filter((r) => r.status === 'IN_PROGRESS').length,
    completed: requests.filter((r) => r.status === 'COMPLETED').length,
  };

  return (
    <section className={s.page}>
      {/* Header */}
      <header className={s.head}>
        <div>
          <h1 className={s.title}>درخواست‌های من</h1>
          <p className={s.subtitle}>وضعیت و تاریخچه تمام سفارش‌های شما</p>
        </div>
        <a href="/money-transfer" className={s.newBtn}>
          <Plus size={14} aria-hidden="true" />
          درخواست جدید
        </a>
      </header>

      {/* Stats bar */}
      {!loading && !error && requests.length > 0 && (
        <div className={s.statsBar} aria-label="آمار درخواست‌ها">
          <div
            className={s.statCard}
            style={{ '--stat-color': 'var(--ds-text-primary)' } as React.CSSProperties}
          >
            <span className={s.statCount}>{stats.total.toLocaleString('fa-IR')}</span>
            <span className={s.statLabel}>همه</span>
          </div>
          <div
            className={s.statCard}
            style={{ '--stat-color': 'var(--ds-status-pending-fg)' } as React.CSSProperties}
          >
            <span className={s.statCount}>{stats.pending.toLocaleString('fa-IR')}</span>
            <span className={s.statLabel}>در انتظار</span>
          </div>
          <div
            className={s.statCard}
            style={{ '--stat-color': 'var(--ds-status-progress-fg)' } as React.CSSProperties}
          >
            <span className={s.statCount}>{stats.inProgress.toLocaleString('fa-IR')}</span>
            <span className={s.statLabel}>در انجام</span>
          </div>
          <div
            className={s.statCard}
            style={{ '--stat-color': 'var(--ds-status-success-fg)' } as React.CSSProperties}
          >
            <span className={s.statCount}>{stats.completed.toLocaleString('fa-IR')}</span>
            <span className={s.statLabel}>تکمیل شده</span>
          </div>
        </div>
      )}

      {/* Claim guest panel */}
      <ClaimGuestPanel onClaimed={() => fetchRequests(1)} />

      {/* Loading skeleton */}
      {loading && (
        <ul className={s.list} aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
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
          <p className={s.emptySub}>درخواست‌های جدید از صفحه خدمات آنلاین ثبت می‌شوند.</p>
          <a href="/online-payment" className={s.cta}>
            ثبت درخواست جدید
          </a>
        </div>
      )}

      {/* List */}
      {!loading && !error && requests.length > 0 && (
        <>
          <ul className={s.list}>
            {requests.map((req) => (
              <RequestRow key={req.id} req={req} onCancelled={handleCancelled} />
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
