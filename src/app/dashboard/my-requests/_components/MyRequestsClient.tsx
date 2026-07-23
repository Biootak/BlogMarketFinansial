'use client';

import { issueServiceOtp, verifyServiceOtpAndLink } from '@/actions/progressive-capture';
import {
  cancelMyServiceRequest,
  claimGuestRequest,
  getMyServiceRequests,
} from '@/actions/serviceRequestActions';
import {
  AlertCircle,
  ArrowUpRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileSearch,
  History,
  KeyRound,
  Link2,
  MessageSquare,
  PackageSearch,
  Plus,
  RefreshCw,
  RotateCcw,
  Layers,
  TrendingUp,
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
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    accentVar: string;
    cssKey: string;
  }
> = {
  PENDING: {
    label: 'در انتظار',
    icon: Clock,
    accentVar: 'var(--ds-status-pending-fg)',
    cssKey: 'pending',
  },
  IN_PROGRESS: {
    label: 'در انجام',
    icon: RefreshCw,
    accentVar: 'var(--ds-status-progress-fg)',
    cssKey: 'progress',
  },
  COMPLETED: {
    label: 'تکمیل شده',
    icon: CheckCircle2,
    accentVar: 'var(--ds-status-success-fg)',
    cssKey: 'completed',
  },
  CANCELLED: {
    label: 'لغو شده',
    icon: XCircle,
    accentVar: 'var(--ds-status-error-fg)',
    cssKey: 'cancelled',
  },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  IN_PROGRESS: 'در انجام',
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

// ─── TicketCard — کامپوننت اصلی هر درخواست ─────────────────────────────── //

function TicketCard({
  req,
  isActive,
  onSelect,
  onCancelled,
}: {
  req: MyRequest;
  isActive: boolean;
  onSelect: () => void;
  onCancelled: (trackingCode: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr] = useState('');
  const [cancelDone, setCancelDone] = useState(false);
  const [localStatus, setLocalStatus] = useState(req.status);

  const meta = STATUS_META[localStatus] ?? STATUS_META.PENDING;
  const StatusIcon = meta.icon;

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

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const createdDate = new Date(req.createdAt).toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <li
      className={`${s.ticket} ${isActive ? s.ticketActive : ''}`}
      data-status={meta.cssKey}
      style={{ '--ticket-accent': meta.accentVar } as React.CSSProperties}
    >
      {/* Ticket header — click area */}
      <button
        type="button"
        className={s.ticketTrigger}
        onClick={onSelect}
        aria-expanded={isActive}
        aria-controls={`ticket-body-${req.id}`}
      >
        {/* Status icon */}
        <span className={s.ticketIcon} aria-hidden>
          <StatusIcon size={16} />
        </span>

        {/* Main info */}
        <div className={s.ticketInfo}>
          <div className={s.ticketTop}>
            <span className={s.ticketCode} dir="ltr">{req.trackingCode}</span>
            {req.urgency === 'URGENT' && (
              <span className={s.ticketUrgent} title="فوری">
                <Zap size={9} />
              </span>
            )}
          </div>
          <span className={s.ticketService}>{SERVICE_LABELS[req.serviceType] ?? req.serviceType}</span>
        </div>

        {/* Right side */}
        <div className={s.ticketRight}>
          <span className={s.ticketAmount} dir="ltr">
            {req.amount} {req.currency}
          </span>
          <div className={s.ticketMeta}>
            <span className={s.ticketBadge} data-status={meta.cssKey}>{meta.label}</span>
            <span className={s.ticketDate}>{createdDate}</span>
          </div>
        </div>

        <span className={`${s.ticketChevron} ${isActive ? s.ticketChevronOpen : ''}`} aria-hidden>
          <ChevronDown size={14} />
        </span>
      </button>

      {/* Expanded detail */}
      {isActive && (
        <div id={`ticket-body-${req.id}`} className={s.ticketBody}>
          {/* ── Dates strip ── */}
          <div className={s.datesStrip}>
            <span className={s.dateChip}>
              <Clock size={11} />
              ثبت: {new Date(req.createdAt).toLocaleDateString('fa-IR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
            <span className={s.dateChip}>
              <RefreshCw size={11} />
              آپدیت: {new Date(req.updatedAt).toLocaleDateString('fa-IR', {
                month: 'short', day: 'numeric',
              })}
            </span>
            {req.estimatedCompletionAt && (
              <span className={`${s.dateChip} ${s.dateChipEta}`}>
                <CalendarClock size={11} />
                تخمین: {new Date(req.estimatedCompletionAt).toLocaleDateString('fa-IR', {
                  month: 'short', day: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* ── Two-column detail layout ── */}
          <div className={s.detailColumns}>
            {/* Left: admin note + cancel + track */}
            <div className={s.detailLeft}>
              {req.adminNotes && (
                <div className={s.adminBanner}>
                  <div className={s.adminBannerHead}>
                    <MessageSquare size={11} />
                    <span>یادداشت تیم اجرایی</span>
                  </div>
                  <p className={s.adminBannerText}>{req.adminNotes}</p>
                </div>
              )}

              {/* Cancel zone */}
              {!cancelDone && localStatus === 'PENDING' && (
                <div className={s.cancelZone}>
                  {cancelErr && (
                    <p className={s.cancelErr} role="alert">
                      <AlertCircle size={11} /> {cancelErr}
                    </p>
                  )}
                  <div className={s.cancelRow}>
                    {canCancel && (
                      <span className={s.cancelTimer}>
                        <Clock size={10} />
                        {cancelMinsLeft?.toLocaleString('fa-IR')} دقیقه مانده
                      </span>
                    )}
                    {canCancel ? (
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={cancelling}
                        className={s.btnCancel}
                      >
                        {cancelling ? (
                          <><span className={s.spinnerSm} aria-hidden /> لغو…</>
                        ) : (
                          <><Ban size={11} /> لغو سفارش</>
                        )}
                      </button>
                    ) : (
                      <p className={s.cancelExpired}>مهلت لغو خودکار پایان یافته.</p>
                    )}
                  </div>
                </div>
              )}

              {cancelDone && (
                <output className={s.cancelSuccess}>
                  <CheckCircle2 size={12} /> سفارش لغو شد.
                </output>
              )}

              <a
                href={`/track/${req.trackingCode}`}
                className={s.trackLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileSearch size={12} />
                پیگیری سفارش
                <ArrowUpRight size={11} />
              </a>
            </div>

            {/* Right: timeline */}
            {req.statusLogs.length > 0 && (
              <div className={s.timelinePanel}>
                <div className={s.timelineHead}>
                  <History size={11} />
                  <span>تاریخچه وضعیت</span>
                </div>
                <ol className={s.timelineList}>
                  {req.statusLogs.map((log, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable for logs
                    <li key={i} className={s.timelineItem}>
                      <span
                        className={s.timelineDot}
                        data-first={i === 0 ? 'true' : undefined}
                      />
                      <div className={s.timelineContent}>
                        <span className={s.timelineStatus}>
                          {log.fromStatus
                            ? `${STATUS_LABELS[log.fromStatus] ?? log.fromStatus} ← `
                            : ''}
                          {STATUS_LABELS[log.toStatus] ?? log.toStatus}
                        </span>
                        {log.note && <span className={s.timelineNote}>{log.note}</span>}
                        <time className={s.timelineTime}>
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
          </div>
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
    if (res.success) { setOtpTimer(60); setMsg(''); }
    else { setMsg(res.error.message); setIsErr(true); }
  };

  const handleClaim = async () => {
    if (!code.trim()) return;
    setLoading(true); setMsg(''); setIsErr(false);
    const res = await claimGuestRequest(code.trim());
    setLoading(false);
    if (!res.success) { setMsg(res.error?.message ?? ''); setIsErr(true); return; }
    if (res.data.requiresOtp && res.data.email) {
      setNeedsOtp(true);
      setOtpEmail(res.data.email);
      setTrackingForOtp(code.trim().toUpperCase());
      setMsg(''); setIsErr(false);
      const otpRes = await issueServiceOtp({ email: res.data.email, trackingCode: code.trim().toUpperCase() });
      if (otpRes.success) setOtpTimer(60);
      return;
    }
    setMsg('سفارش با موفقیت به حساب شما اضافه شد!');
    setIsErr(false);
    setTimeout(() => { setOpen(false); onClaimed(); }, 1200);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setOtpVerifying(true); setMsg('');
    const res = await verifyServiceOtpAndLink({ email: otpEmail, code: otpCode, trackingCode: trackingForOtp });
    setOtpVerifying(false);
    if (res.success) {
      setMsg('سفارش با موفقیت به حساب شما اضافه شد!');
      setIsErr(false);
      setTimeout(() => { setOpen(false); onClaimed(); }, 1200);
    } else { setMsg(res.error.message); setIsErr(true); }
  };

  const reset = () => {
    setCode(''); setMsg(''); setIsErr(false);
    setNeedsOtp(false); setOtpCode(''); setOtpTimer(0);
  };

  return (
    <div className={s.claimPanel}>
      <button
        type="button"
        className={s.claimToggle}
        onClick={() => { setOpen((p) => !p); reset(); }}
        aria-expanded={open}
      >
        <span className={s.claimToggleIcon}><Link2 size={14} /></span>
        <span className={s.claimToggleLabel}>اتصال سفارش مهمان</span>
        <ChevronDown size={13} className={open ? s.claimChevronOpen : ''} />
      </button>

      {open && (
        <div className={s.claimBody}>
          {!needsOtp ? (
            <>
              <p className={s.claimDesc}>
                کد پیگیری سفارش مهمان را وارد کنید تا به حساب‌تان وصل شود.
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
                <button type="button" onClick={handleClaim} disabled={loading || !code.trim()} className={s.claimBtn}>
                  {loading ? <span className={s.spinnerSm} aria-hidden /> : 'اضافه کن'}
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
                  type="text" inputMode="numeric" maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className={s.otpInput} placeholder="_ _ _ _ _ _" dir="ltr"
                  aria-label="کد تأیید"
                />
                <button type="button" onClick={handleVerifyOtp} disabled={otpVerifying || otpCode.length !== 6} className={s.claimBtn}>
                  {otpVerifying ? <span className={s.spinnerSm} aria-hidden /> : <><KeyRound size={12} /> تأیید</>}
                </button>
              </div>
              <div className={s.otpFooter}>
                {otpTimer > 0 ? (
                  <span className={s.otpTimer} aria-live="polite">
                    ارسال مجدد در {otpTimer.toLocaleString('fa-IR')} ثانیه
                  </span>
                ) : (
                  <button type="button" onClick={sendOtp} disabled={otpSending} className={s.otpResend}>
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
  const [totalCount, setTotalCount] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pageRef = useRef(page);
  pageRef.current = page;

  const fetchRequests = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    const result = await getMyServiceRequests({ page: p, limit: 10 });
    if (result.success && result.data) {
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
    fetchRequests(pageRef.current);
  }, [fetchRequests]);

  const handleToggle = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  const stats = {
    total: totalCount,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    inProgress: requests.filter((r) => r.status === 'IN_PROGRESS').length,
    completed: requests.filter((r) => r.status === 'COMPLETED').length,
  };

  return (
    <section className={s.workspace}>
      {/* ════════════════════════════════════
          HEADER BAND
      ════════════════════════════════════ */}
      <header className={s.headerBand}>
        <div className={s.headerLeft}>
          <div className={s.headerIconWrap} aria-hidden>
            <Layers size={20} />
          </div>
          <div>
            <h1 className={s.headerTitle}>درخواست‌های من</h1>
            <p className={s.headerSub}>وضعیت و تاریخچه سفارش‌های شما</p>
          </div>
        </div>
        <div className={s.headerRight}>
          {!loading && totalCount > 0 && (
            <div className={s.headerCounter}>
              <TrendingUp size={13} />
              <span>{totalCount.toLocaleString('fa-IR')} سفارش</span>
            </div>
          )}
          <a href="/money-transfer" className={s.newBtn}>
            <Plus size={15} aria-hidden />
            درخواست جدید
          </a>
        </div>
      </header>

      {/* ════════════════════════════════════
          STATUS RIBBON (Pipeline)
      ════════════════════════════════════ */}
      {!loading && !error && totalCount > 0 && (
        <div className={s.statusRibbon} role="group" aria-label="آمار وضعیت">
          <div className={s.ribbonCell} data-type="total">
            <span className={s.ribbonNum}>{stats.total.toLocaleString('fa-IR')}</span>
            <span className={s.ribbonLabel}>کل</span>
            <span className={s.ribbonBar} />
          </div>
          <div className={s.ribbonDivider} aria-hidden />
          <div className={s.ribbonCell} data-type="pending">
            <Clock size={13} className={s.ribbonIcon} aria-hidden />
            <span className={s.ribbonNum}>{stats.pending.toLocaleString('fa-IR')}</span>
            <span className={s.ribbonLabel}>در انتظار</span>
            <span className={s.ribbonBar} />
          </div>
          <div className={s.ribbonDivider} aria-hidden />
          <div className={s.ribbonCell} data-type="progress">
            <RefreshCw size={13} className={s.ribbonIcon} aria-hidden />
            <span className={s.ribbonNum}>{stats.inProgress.toLocaleString('fa-IR')}</span>
            <span className={s.ribbonLabel}>در انجام</span>
            <span className={s.ribbonBar} />
          </div>
          <div className={s.ribbonDivider} aria-hidden />
          <div className={s.ribbonCell} data-type="completed">
            <CheckCircle2 size={13} className={s.ribbonIcon} aria-hidden />
            <span className={s.ribbonNum}>{stats.completed.toLocaleString('fa-IR')}</span>
            <span className={s.ribbonLabel}>تکمیل شده</span>
            <span className={s.ribbonBar} />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          CLAIM PANEL
      ════════════════════════════════════ */}
      <ClaimGuestPanel onClaimed={() => fetchRequests(1)} />

      {/* ════════════════════════════════════
          LOADING
      ════════════════════════════════════ */}
      {loading && (
        <ul className={s.ticketList} aria-busy>
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static
            <li key={i} className={s.skeleton} aria-hidden />
          ))}
        </ul>
      )}

      {/* ════════════════════════════════════
          ERROR
      ════════════════════════════════════ */}
      {!loading && error && (
        <div className={s.errorBox} role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ════════════════════════════════════
          EMPTY
      ════════════════════════════════════ */}
      {!loading && !error && requests.length === 0 && (
        <div className={s.emptyState}>
          <span className={s.emptyIcon} aria-hidden><PackageSearch size={42} /></span>
          <p className={s.emptyTitle}>هنوز درخواستی ثبت نکرده‌اید</p>
          <p className={s.emptySub}>درخواست‌های جدید از صفحه خدمات آنلاین ثبت می‌شوند.</p>
          <a href="/money-transfer" className={s.emptyCta}>
            ثبت درخواست جدید
          </a>
        </div>
      )}

      {/* ════════════════════════════════════
          TICKET LIST
      ════════════════════════════════════ */}
      {!loading && !error && requests.length > 0 && (
        <>
          <ul className={s.ticketList}>
            {requests.map((req) => (
              <TicketCard
                key={req.id}
                req={req}
                isActive={activeId === req.id}
                onSelect={() => handleToggle(req.id)}
                onCancelled={handleCancelled}
              />
            ))}
          </ul>

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
                {page.toLocaleString('fa-IR')} / {totalPages.toLocaleString('fa-IR')}
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
