'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  FileText,
  Filter,
  Inbox,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Shield,
  ShieldCheck,
  ShieldX,
  SkipForward,
  User,
  Wallet,
  Workflow,
  X,
  Zap,
} from 'lucide-react';

import { Spotlight } from '@/components/Dashboard/primitives/Spotlight';
import type {
  ApprovalSnapshot,
  ApprovalStatus,
  ApprovalSummary,
  ApprovalType,
  StepStatus,
} from '@/lib/approvals';
import { decideStep, cancelApproval } from '@/actions/approvals-actions';
import { CreateApprovalPanel } from './CreateApprovalPanel';
import s from './ApprovalsHub.module.css';

interface Props {
  initialData?: ApprovalSnapshot;
  canCreate?: boolean;
}

type Filter = 'all' | ApprovalStatus | 'mine';
type SortKey = 'newest' | 'oldest' | 'progress';

const FILTERS: { id: Filter; label: string; tone?: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'mine', label: 'منتظر تصمیم من', tone: 'amber' },
  { id: 'pending', label: 'در حال بررسی', tone: 'cyan' },
  { id: 'approved', label: 'تأیید شده', tone: 'emerald' },
  { id: 'rejected', label: 'رد شده', tone: 'rose' },
  { id: 'cancelled', label: 'لغو شده' },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'newest', label: 'جدیدترین' },
  { id: 'oldest', label: 'قدیمی‌ترین' },
  { id: 'progress', label: 'پیشرفت' },
];

const TYPE_LABEL: Record<ApprovalType, string> = {
  settlement: 'تسویه',
  kyc: 'احراز هویت',
  refund: 'استرداد',
  withdrawal: 'برداشت',
  custom: 'سفارشی',
};

const TYPE_ICON: Record<ApprovalType, React.ReactNode> = {
  settlement: <Send className="h-3.5 w-3.5" />,
  kyc: <ShieldCheck className="h-3.5 w-3.5" />,
  refund: <Wallet className="h-3.5 w-3.5" />,
  withdrawal: <Wallet className="h-3.5 w-3.5" />,
  custom: <FileText className="h-3.5 w-3.5" />,
};

const TYPE_TONE: Record<ApprovalType, string> = {
  settlement: 'indigo',
  kyc: 'cyan',
  refund: 'amber',
  withdrawal: 'rose',
  custom: 'violet',
};

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: 'در حال بررسی',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
};

const STATUS_TONE: Record<ApprovalStatus, string> = {
  pending: 'cyan',
  approved: 'emerald',
  rejected: 'rose',
  cancelled: 'neutral',
};

const STEP_LABEL: Record<StepStatus, string> = {
  pending: 'منتظر',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  skipped: 'رد شد (skip)',
};

const STEP_ICON: Record<StepStatus, React.ReactNode> = {
  pending: <Circle className="h-3.5 w-3.5" />,
  approved: <Check className="h-3.5 w-3.5" />,
  rejected: <X className="h-3.5 w-3.5" />,
  skipped: <SkipForward className="h-3.5 w-3.5" />,
};

const STEP_TONE: Record<StepStatus, string> = {
  pending: 'neutral',
  approved: 'emerald',
  rejected: 'rose',
  skipped: 'neutral',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `همین الان`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ساعت پیش`;
  return `${Math.floor(diff / 86_400_000)} روز پیش`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function StatusPill({ status }: { status: ApprovalStatus }) {
  return (
    <span className={s.statusPill} data-tone={STATUS_TONE[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function TypeChip({ type }: { type: ApprovalType }) {
  return (
    <span className={s.typeChip} data-tone={TYPE_TONE[type]}>
      {TYPE_ICON[type]}
      {TYPE_LABEL[type]}
    </span>
  );
}

/** یک گره در timeline عمودی تأیید */
function TimelineNode({
  index,
  total,
  status,
  isCurrent,
  canDecide,
  approverRole,
  comment,
  decidedAt,
}: {
  index: number;
  total: number;
  status: StepStatus;
  isCurrent: boolean;
  canDecide: boolean;
  approverRole: string;
  comment: string | null;
  decidedAt: string | null;
}) {
  const isLast = index === total - 1;
  return (
    <div className={s.timelineRow}>
      {/* ریل عمودی */}
      <div className={s.timelineRail}>
        <div className={s.timelineDot} data-status={status} data-current={isCurrent}>
          {STEP_ICON[status]}
        </div>
        {!isLast ? <div className={s.timelineLine} data-status={status} /> : null}
      </div>
      {/* محتوای گره */}
      <div className={s.timelineContent} data-status={status} data-current={isCurrent} data-can-decide={canDecide}>
        <div className={s.timelineHead}>
          <span className={s.timelineIndex}>مرحله {formatNumber(index + 1)}</span>
          <span className={s.timelineRole}>
            <User className="h-3 w-3" />
            {approverRole}
          </span>
        </div>
        <div className={s.timelineStatusRow}>
          <span className={s.timelineStatus} data-tone={STEP_TONE[status]}>
            {STEP_LABEL[status]}
          </span>
          {decidedAt ? (
            <span className={s.timelineTime}>{formatTimeAgo(decidedAt)}</span>
          ) : null}
          {canDecide ? (
            <span className={s.timelineYours}>
              <Zap className="h-3 w-3" />
              تصمیم شما
            </span>
          ) : null}
        </div>
        {comment ? (
          <p className={s.timelineComment}>"{comment}"</p>
        ) : null}
      </div>
    </div>
  );
}

function RequestDetail({
  request,
  onDecided,
  onCancelled,
}: {
  request: ApprovalSummary;
  onDecided: () => void;
  onCancelled: () => void;
}) {
  const [comment, setComment] = useState('');
  const [deciding, setDeciding] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const canDecideCurrent =
    request.status === 'pending' && request.isMine;

  const handleDecide = async (decision: 'approved' | 'rejected') => {
    setDeciding(decision);
    setError(null);
    const res = await decideStep(request.id, decision, comment.trim() || undefined);
    setDeciding(null);
    if (res.success) {
      setComment('');
      onDecided();
    } else {
      setError(res.message ?? 'خطا');
    }
  };

  const handleCancel = async () => {
    setConfirmCancel(false);
    const res = await cancelApproval(request.id);
    if (res.success) onCancelled();
    else setError(res.message ?? 'خطا');
  };

  const progress = request.totalSteps > 0
    ? Math.round((request.currentStep / request.totalSteps) * 100)
    : 0;

  return (
    <div className={s.detail}>
      {/* هدر جزئیات */}
      <header className={s.detailHeader}>
        <div className={s.detailTop}>
          <div className={s.detailChips}>
            <TypeChip type={request.type} />
            <StatusPill status={request.status} />
          </div>
          {request.status === 'pending' ? (
            <div className={s.detailProgress} data-tone="amber">
              <div className={s.detailProgressFill} style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>
        <h2 className={s.detailTitle}>{request.title}</h2>
        {request.description ? (
          <p className={s.detailDescription}>{request.description}</p>
        ) : null}

        {/* متادیتا — گرید */}
        <div className={s.detailMetaGrid}>
          <div className={s.metaCell}>
            <span className={s.metaLabel}>ایجادکننده</span>
            <span className={s.metaValue}>
              <User className="h-3 w-3" />
              {request.requesterName ?? 'نامشخص'}
            </span>
          </div>
          <div className={s.metaCell}>
            <span className={s.metaLabel}>تاریخ ایجاد</span>
            <span className={s.metaValue}>{formatDate(request.createdAt)}</span>
          </div>
          <div className={s.metaCell}>
            <span className={s.metaLabel}>موجودیت</span>
            <span className={s.metaValue} dir="ltr">
              {request.entityType}#{request.entityId.slice(0, 8)}
            </span>
          </div>
          <div className={s.metaCell}>
            <span className={s.metaLabel}>پیشرفت</span>
            <span className={s.metaValue}>
              {formatNumber(request.currentStep)} / {formatNumber(request.totalSteps)} مرحله
            </span>
          </div>
          {request.decidedAt ? (
            <div className={s.metaCell}>
              <span className={s.metaLabel}>تصمیم نهایی</span>
              <span className={s.metaValue}>{formatDate(request.decidedAt)}</span>
            </div>
          ) : null}
          {request.currentApproverRole && request.status === 'pending' ? (
            <div className={s.metaCell}>
              <span className={s.metaLabel}>منتظر تأیید</span>
              <span className={s.metaValue}>
                <Shield className="h-3 w-3" />
                {request.currentApproverRole}
              </span>
            </div>
          ) : null}
        </div>
      </header>

      {/* Timeline عمودی */}
      <section className={s.timelineSection}>
        <h3 className={s.sectionTitle}>
          <Workflow className="h-4 w-4" />
          مراحل تأیید
        </h3>
        <div className={s.timeline}>
          {request.steps.map((step, i) => (
            <TimelineNode
              key={step.id}
              index={i}
              total={request.steps.length}
              status={step.status}
              isCurrent={request.status === 'pending' && i === request.currentStep}
              canDecide={request.status === 'pending' && i === request.currentStep && request.isMine}
              approverRole={step.approverRole}
              comment={step.comment}
              decidedAt={step.decidedAt}
            />
          ))}
        </div>
      </section>

      {/* بخش تصمیم */}
      {request.status === 'pending' ? (
        <section className={s.decideSection} data-can-decide={canDecideCurrent}>
          <h3 className={s.sectionTitle}>
            <MessageSquare className="h-4 w-4" />
            {canDecideCurrent ? 'تصمیم شما' : 'افزودن نظر'}
          </h3>
          {canDecideCurrent ? (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="نظر یا دلیل خود را بنویسید (اختیاری)…"
                rows={3}
                className={s.decideInput}
                maxLength={1000}
                dir="rtl"
              />
              {error ? (
                <div className={s.error}>
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              ) : null}
              <div className={s.decideActions}>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className={s.cancelBtn}
                >
                  <X className="h-4 w-4" />
                  لغو درخواست
                </button>
                <div className={s.decideButtons}>
                  <button
                    type="button"
                    onClick={() => void handleDecide('rejected')}
                    disabled={deciding !== null}
                    className={s.rejectBtn}
                  >
                    {deciding === 'rejected' ? (
                      <Loader2 className={`h-4 w-4 ${s.spin}`} />
                    ) : (
                      <ShieldX className="h-4 w-4" />
                    )}
                    رد
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecide('approved')}
                    disabled={deciding !== null}
                    className={s.approveBtn}
                  >
                    {deciding === 'approved' ? (
                      <Loader2 className={`h-4 w-4 ${s.spin}`} />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    تأیید
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={s.notYours}>
              <Clock className="h-4 w-4" />
              <span>
                این مرحله منتظر تأیید <strong>{request.currentApproverRole}</strong> است.
                {request.isMine === false ? ' شما در صف تأیید این مرحله نیستید.' : ''}
              </span>
            </div>
          )}
        </section>
      ) : (
        <section className={s.decideSection}>
          <div className={s.finalStatus} data-tone={STATUS_TONE[request.status]}>
            {request.status === 'approved' ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
            {STATUS_LABEL[request.status]} — {formatDate(request.decidedAt)}
          </div>
        </section>
      )}

      {/* دیالوگ تأیید لغو */}
      {confirmCancel ? (
        createPortal(
          <div className={s.confirmOverlay} role="presentation" onClick={(e) => e.target === e.currentTarget && setConfirmCancel(false)}>
            <div className={s.confirmDialog} role="alertdialog" aria-label="لغو درخواست">
              <div className={s.confirmIcon}>
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className={s.confirmTitle}>لغو درخواست</h3>
              <p className={s.confirmText}>آیا از لغو این درخواست مطمئن هستید؟ این عمل قابل بازگشت نیست.</p>
              <div className={s.confirmActions}>
                <button type="button" onClick={() => setConfirmCancel(false)} className={s.confirmNo}>انصراف</button>
                <button type="button" onClick={() => void handleCancel()} className={s.confirmYes}>بله، لغو کن</button>
              </div>
            </div>
          </div>,
          document.body,
        )
      ) : null}
    </div>
  );
}

export function ApprovalsHub({ initialData, canCreate = false }: Props) {
  const [data, setData] = useState<ApprovalSnapshot | undefined>(initialData);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/approvals/snapshot', { cache: 'no-store' });
      const json = (await res.json()) as { success: boolean; data?: ApprovalSnapshot };
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchData();
    }, 45_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const selected = useMemo(() => {
    if (!data || !selectedId) return null;
    return data.requests.find((r) => r.id === selectedId) ?? null;
  }, [data, selectedId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    let list = data.requests.filter((r) => {
      if (filter === 'all') return true;
      if (filter === 'mine') return r.isMine;
      return r.status === filter;
    });
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.entityType.toLowerCase().includes(q) ||
          (r.requesterName ?? '').toLowerCase().includes(q),
      );
    }
    // sort
    list = [...list].sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      // progress: more advanced first
      return b.currentStep / (b.totalSteps || 1) - a.currentStep / (a.totalSteps || 1);
    });
    return list;
  }, [data, filter, query, sort]);

  const handleSelect = (r: ApprovalSummary) => {
    setSelectedId(r.id);
    setMobileDetailOpen(true);
  };

  if (!data) {
    return (
      <div className={s.empty}>
        <Workflow className="h-10 w-10" />
        <p>داده‌ای موجود نیست.</p>
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div className={s.root}>
      <Spotlight tone="emerald" />

      {/* نوار ابزار بالا */}
      <section className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search className={s.searchIcon} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در درخواست‌ها…"
            className={s.searchInput}
            dir="rtl"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} className={s.searchClear} aria-label="پاک کردن">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className={s.toolbarRight}>
          <div className={s.sortWrap}>
            <Filter className="h-3.5 w-3.5" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={s.sortSelect}
              aria-label="مرتب‌سازی"
            >
              {SORTS.map((so) => (
                <option key={so.id} value={so.id}>{so.label}</option>
              ))}
            </select>
          </div>
          {canCreate ? (
            <button type="button" onClick={() => setCreateOpen(true)} className={s.createBtn}>
              <Plus className="h-4 w-4" />
              <span>درخواست جدید</span>
            </button>
          ) : null}
        </div>
      </section>

      {/* KPI — موبایل‌محور */}
      <section className={s.kpiGrid}>
        <div className={s.kpiCard} data-tone="amber" data-pulse={m.myPending > 0}>
          <div className={s.kpiIconBox}>
            <User className="h-4 w-4" />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiLabel}>منتظر تصمیم من</span>
            <span className={s.kpiValue}>{formatNumber(m.myPending)}</span>
          </div>
          <div className={s.kpiBar} />
        </div>
        <div className={s.kpiCard} data-tone="cyan">
          <div className={s.kpiIconBox}>
            <Clock className="h-4 w-4" />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiLabel}>کل در حال بررسی</span>
            <span className={s.kpiValue}>{formatNumber(m.pending)}</span>
          </div>
          <div className={s.kpiBar} />
        </div>
        <div className={s.kpiCard} data-tone="emerald">
          <div className={s.kpiIconBox}>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiLabel}>تأیید ۲۴ ساعت</span>
            <span className={s.kpiValue}>{formatNumber(m.approved24h)}</span>
          </div>
          <div className={s.kpiBar} />
        </div>
        <div className={s.kpiCard} data-tone="rose">
          <div className={s.kpiIconBox}>
            <ShieldX className="h-4 w-4" />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiLabel}>رد ۲۴ ساعت</span>
            <span className={s.kpiValue}>{formatNumber(m.rejected24h)}</span>
          </div>
          <div className={s.kpiBar} />
        </div>
        <div className={s.kpiCard} data-tone="indigo">
          <div className={s.kpiIconBox}>
            <Clock className="h-4 w-4" />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiLabel}>میانگین زمان تصمیم</span>
            <span className={s.kpiValue}>
              {m.avgDecisionMin > 0 ? `${formatNumber(Math.round(m.avgDecisionMin))} دقیقه` : '—'}
            </span>
          </div>
          <div className={s.kpiBar} />
        </div>
      </section>

      {/* فیلترها */}
      <section className={s.filters}>
        {FILTERS.map((f) => {
          const count =
            f.id === 'all'
              ? data.requests.length
              : f.id === 'mine'
                ? data.requests.filter((r) => r.isMine).length
                : data.requests.filter((r) => r.status === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={s.filterBtn}
              data-active={filter === f.id}
              data-tone={f.tone}
            >
              {f.label}
              <span className={s.filterCount}>{formatNumber(count)}</span>
            </button>
          );
        })}
      </section>

      {/* چیدمان دو ستونی */}
      <div className={s.dualGrid}>
        {/* لیست */}
        <section className={s.listCard} data-mobile-hidden={mobileDetailOpen && !!selected}>
          <header className={s.cardHeader}>
            <div className={s.cardHeaderLeft}>
              <Workflow className="h-4 w-4" />
              <h2>درخواست‌ها</h2>
              <span className={s.cardCount}>{formatNumber(filtered.length)} مورد</span>
            </div>
          </header>
          {filtered.length === 0 ? (
            <div className={s.emptyMini}>
              <Inbox className="h-8 w-8" />
              <p>موردی با این فیلتر نیست.</p>
            </div>
          ) : (
            <ul className={s.requestList}>
              {filtered.map((r) => {
                const progress = r.totalSteps > 0 ? (r.currentStep / r.totalSteps) * 100 : 0;
                return (
                  <li
                    key={r.id}
                    className={s.requestItem}
                    data-active={selected?.id === r.id}
                    data-mine={r.isMine}
                    onClick={() => handleSelect(r)}
                  >
                    {r.isMine ? <span className={s.mineFlag} aria-label="منتظر تصمیم من" /> : null}
                    <div className={s.requestHead}>
                      <TypeChip type={r.type} />
                      <StatusPill status={r.status} />
                    </div>
                    <div className={s.requestTitle}>{r.title}</div>
                    <div className={s.requestMeta}>
                      <Shield className="h-3 w-3" />
                      {formatNumber(r.currentStep)} / {formatNumber(r.totalSteps)}
                      <span className={s.metaSep}>•</span>
                      {formatTimeAgo(r.createdAt)}
                      {r.requesterName ? (
                        <>
                          <span className={s.metaSep}>•</span>
                          <span>{r.requesterName}</span>
                        </>
                      ) : null}
                    </div>
                    {r.status === 'pending' ? (
                      <div className={s.progress}>
                        <div className={s.progressBar} style={{ width: `${progress}%` }} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* جزئیات — دسکتاپ */}
        <section className={s.detailCard} data-mobile-hidden={!mobileDetailOpen || !selected}>
          <button
            type="button"
            className={s.mobileBack}
            onClick={() => setMobileDetailOpen(false)}
            aria-label="بازگشت"
          >
            <ChevronLeft className="h-4 w-4" />
            بازگشت به فهرست
          </button>
          {selected ? (
            <RequestDetail
              request={selected}
              onDecided={() => void fetchData()}
              onCancelled={() => {
                void fetchData();
                setMobileDetailOpen(false);
              }}
            />
          ) : (
            <div className={s.placeholder}>
              <div className={s.placeholderIcon}>
                <Workflow className="h-10 w-10" />
              </div>
              <h3 className={s.placeholderTitle}>یک درخواست انتخاب کنید</h3>
              <p>برای دیدن جزئیات و مراحل تأیید، یک درخواست را از فهرست انتخاب کنید.</p>
            </div>
          )}
        </section>
      </div>

      {/* پنل ایجاد */}
      {canCreate ? (
        <CreateApprovalPanel
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void fetchData();
          }}
        />
      ) : null}
    </div>
  );
}
