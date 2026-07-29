'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  Circle,
  Clock,
  FileText,
  Inbox,
  Loader2,
  MessageSquare,
  Send,
  Shield,
  ShieldCheck,
  ShieldX,
  User,
  Wallet,
  Workflow,
  X,
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
import s from './ApprovalsHub.module.css';

interface Props {
  initialData?: ApprovalSnapshot;
}

type Filter = 'all' | ApprovalStatus | 'mine';

const FILTERS: { id: Filter; label: string; tone?: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'mine', label: 'منتظر تصمیم من', tone: 'amber' },
  { id: 'pending', label: 'در حال بررسی', tone: 'cyan' },
  { id: 'approved', label: 'تأیید شده', tone: 'emerald' },
  { id: 'rejected', label: 'رد شده', tone: 'rose' },
  { id: 'cancelled', label: 'لغو شده' },
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
  approved: 'تأیید',
  rejected: 'رد',
  skipped: 'رد شده (skip)',
};

const STEP_ICON: Record<StepStatus, React.ReactNode> = {
  pending: <Circle className="h-3.5 w-3.5" />,
  approved: <Check className="h-3.5 w-3.5" />,
  rejected: <X className="h-3.5 w-3.5" />,
  skipped: <ChevronLeft className="h-3.5 w-3.5" />,
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
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)} ثانیه پیش`;
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

function StepNode({
  index,
  stepIndex,
  status,
  isCurrent,
  approverRole,
  comment,
  decidedAt,
}: {
  index: number;
  stepIndex: number;
  status: StepStatus;
  isCurrent: boolean;
  approverRole: string;
  comment: string | null;
  decidedAt: string | null;
}) {
  return (
    <div className={s.stepNode} data-status={status} data-current={isCurrent}>
      <div className={s.stepHeader}>
        <span className={s.stepBadge} data-tone={STEP_TONE[status]}>
          {STEP_ICON[status]}
          مرحله {index + 1}
        </span>
        <span className={s.stepRole}>
          <User className="h-3 w-3" />
          {approverRole}
        </span>
      </div>
      <div className={s.stepStatusLabel}>{STEP_LABEL[status]}</div>
      {decidedAt ? <div className={s.stepTime}>{formatTimeAgo(decidedAt)}</div> : null}
      {comment ? <p className={s.stepComment}>"{comment}"</p> : null}
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
    if (!confirm('آیا از لغو این درخواست مطمئن هستید؟')) return;
    const res = await cancelApproval(request.id);
    if (res.success) onCancelled();
    else setError(res.message ?? 'خطا');
  };

  return (
    <div className={s.detail}>
      <header className={s.detailHeader}>
        <div>
          <div className={s.detailMeta}>
            <TypeChip type={request.type} />
            <StatusPill status={request.status} />
          </div>
          <h2 className={s.detailTitle}>{request.title}</h2>
          {request.description ? (
            <p className={s.detailDescription}>{request.description}</p>
          ) : null}
          <div className={s.detailInfo}>
            <span>ایجاد: {formatDate(request.createdAt)}</span>
            <span>Entity: {request.entityType}#{request.entityId}</span>
            {request.decidedAt ? (
              <span>تصمیم: {formatDate(request.decidedAt)}</span>
            ) : null}
          </div>
        </div>
      </header>

      <section className={s.timelineSection}>
        <h3 className={s.timelineTitle}>
          <Workflow className="h-4 w-4" /> مراحل تأیید
        </h3>
        <div className={s.timeline}>
          {request.steps.map((step, i) => (
            <StepNode
              key={step.id}
              index={i}
              stepIndex={step.stepIndex}
              status={step.status}
              isCurrent={request.status === 'pending' && i === request.currentStep}
              approverRole={step.approverRole}
              comment={step.comment}
              decidedAt={step.decidedAt}
            />
          ))}
        </div>
      </section>

      {request.status === 'pending' ? (
        <section className={s.decideSection}>
          <h3 className={s.decideTitle}>
            <MessageSquare className="h-4 w-4" /> تصمیم شما
          </h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="نظر یا دلیل خود را بنویسید (اختیاری)..."
            rows={3}
            className={s.decideInput}
            maxLength={1000}
            dir="rtl"
          />
          {error ? <div className={s.error}>{error}</div> : null}
          <div className={s.decideActions}>
            <button
              type="button"
              onClick={() => void handleCancel()}
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
        </section>
      ) : null}
    </div>
  );
}

export function ApprovalsHub({ initialData }: Props) {
  const [data, setData] = useState<ApprovalSnapshot | undefined>(initialData);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<ApprovalSummary | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/approvals/snapshot', { cache: 'no-store' });
      const json = (await res.json()) as { success: boolean; data?: ApprovalSnapshot };
      if (json.success && json.data) {
        setData(json.data);
        if (selected) {
          const updated = json.data.requests.find((r) => r.id === selected.id);
          if (updated) setSelected(updated);
        }
      }
    } catch {
      /* silent */
    }
  }, [selected]);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchData();
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.requests.filter((r) => {
      if (filter === 'all') return true;
      if (filter === 'mine') {
        const cur = r.steps[r.currentStep];
        // بهینه: این فقط برای UI است؛ دقیق نیست
        return r.status === 'pending' && cur !== undefined;
      }
      return r.status === filter;
    });
  }, [data, filter]);

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

      {/* Summary */}
      <section className={s.summary}>
        <div className={s.summaryCard} data-tone="amber">
          <div className={s.summaryLabel}>منتظر تصمیم من</div>
          <div className={s.summaryValue}>{formatNumber(m.myPending)}</div>
          <User className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="cyan">
          <div className={s.summaryLabel}>کل در حال بررسی</div>
          <div className={s.summaryValue}>{formatNumber(m.pending)}</div>
          <Clock className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="emerald">
          <div className={s.summaryLabel}>تأیید ۲۴ ساعت</div>
          <div className={s.summaryValue}>{formatNumber(m.approved24h)}</div>
          <ShieldCheck className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="rose">
          <div className={s.summaryLabel}>رد ۲۴ ساعت</div>
          <div className={s.summaryValue}>{formatNumber(m.rejected24h)}</div>
          <ShieldX className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="indigo">
          <div className={s.summaryLabel}>میانگین زمان تصمیم</div>
          <div className={s.summaryValue}>
            {m.avgDecisionMin > 0 ? `${formatNumber(Math.round(m.avgDecisionMin))} دقیقه` : '—'}
          </div>
          <Clock className={s.summaryIcon} />
        </div>
      </section>

      <div className={s.dualGrid}>
        {/* List */}
        <section className={s.card}>
          <header className={s.cardHeader}>
            <h2>
              <Workflow className="h-4 w-4" /> درخواست‌ها
            </h2>
            <p>{formatNumber(filtered.length)} مورد</p>
          </header>
          <div className={s.filters}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={s.filterBtn}
                data-active={filter === f.id}
                data-tone={f.tone}
              >
                {f.label}
              </button>
            ))}
          </div>
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
                    onClick={() => setSelected(r)}
                  >
                    <div className={s.requestHead}>
                      <TypeChip type={r.type} />
                      <StatusPill status={r.status} />
                    </div>
                    <div className={s.requestTitle}>{r.title}</div>
                    <div className={s.requestMeta}>
                      <Shield className="h-3 w-3" />
                      {r.currentStep + 1} / {r.totalSteps} مرحله
                      <span>•</span>
                      {formatTimeAgo(r.createdAt)}
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

        {/* Detail */}
        <section className={s.card}>
          {selected ? (
            <RequestDetail
              request={selected}
              onDecided={() => void fetchData()}
              onCancelled={() => void fetchData()}
            />
          ) : (
            <div className={s.placeholder}>
              <Workflow className="h-10 w-10" />
              <p>یک درخواست را از فهرست انتخاب کنید تا جزئیات و مراحل تأیید نمایش داده شود.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
