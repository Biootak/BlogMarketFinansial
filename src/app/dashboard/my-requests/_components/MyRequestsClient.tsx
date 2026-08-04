'use client';

/**
 * MyRequestsClient — 2026 Activity Hub
 * -----------------------------------------------------------------------------
 * بازطراحی کامل صفحه درخواست‌های من با ساختار «Activity Hub»:
 *  1. PageHeader (breadcrumb + title + CTA)
 *  2. KPI Strip          — 4 StatCard asymmetric (Total / Urgent / In-progress / Success)
 *  3. Two-Column Hero    — Pipeline Overview (signature) + Volume by Service
 *  4. Activity Heatmap   — نوار ۳۰ روز اخیر (بدون نمودار، pure CSS grid)
 *  5. Filter Bar         — search / urgency / sort / refresh
 *  6. Grouped Tickets    — گروه‌بندی بر اساس status با collapsible section
 *  7. Claim Panel        — اتصال سفارش مهمان (OTP)
 *
 *  - بدون تغییر DB / API
 *  - استفاده از PageHeader / StatCard / StatGrid / EmptyState / CopyButton / GeometricField
 *  - فقط توکن‌های --ds-* (no hex/rgb، no emoji)
 *  - RTL-first، logical properties، TypeScript strict، a11y قوی
 *  - performance: useMemo برای derived data، بدون re-render اضافی
 */

import { issueServiceOtp, verifyServiceOtpAndLink } from '@/actions/progressive-capture';
import {
  cancelMyServiceRequest,
  claimGuestRequest,
  getMyServiceRequestStats,
  getMyServiceRequests,
} from '@/actions/serviceRequestActions';
import { GeometricField } from '@/components/Dashboard/primitives/GeometricAccent';
import { MillionDollarEmpty } from '@/components/Dashboard/primitives/MillionDollarEmpty';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { StatCard } from '@/components/Dashboard/primitives/StatCard';
import { StatGrid } from '@/components/Dashboard/primitives/StatGrid';
import CopyButton from '@/components/fintech/CopyButton';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowUpLeft,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileSearch,
  Filter,
  Flame,
  History,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './MyRequestsClient.module.css';

// ─── Types ────────────────────────────────────────────────────────────────── //

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

type FilterStatus = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type SortMode = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc' | 'urgent';
type GroupMode = 'status' | 'service' | 'none';

// ─── Constants ────────────────────────────────────────────────────────────── //

const STATUS_META: Record<
  string,
  {
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    cssKey: string;
  }
> = {
  PENDING: {
    label: 'در انتظار',
    shortLabel: 'انتظار',
    icon: Clock,
    cssKey: 'pending',
  },
  IN_PROGRESS: {
    label: 'در انجام',
    shortLabel: 'در حال',
    icon: RefreshCw,
    cssKey: 'progress',
  },
  COMPLETED: {
    label: 'تکمیل شده',
    shortLabel: 'تکمیل',
    icon: CheckCircle2,
    cssKey: 'completed',
  },
  CANCELLED: {
    label: 'لغو شده',
    shortLabel: 'لغو',
    icon: XCircle,
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

const PIPELINE_STAGES: FilterStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

// Order for grouping
const STATUS_ORDER: FilterStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const STATUS_GROUP_LABELS: Record<FilterStatus, string> = {
  ALL: 'همه',
  PENDING: 'در انتظار',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

// ─── Helpers ─────────────────────────────────────────────────────────────── //

function formatPersianNumber(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isFinite(n)) {
    return new Intl.NumberFormat('fa-IR').format(n);
  }
  return String(value);
}

function formatPersianDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

function formatPersianDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatAmountWithCurrency(amount: string, currency: string): string {
  const n = Number(amount);
  const numStr = Number.isFinite(n) ? formatPersianNumber(n) : amount;
  return `${numStr} ${currency}`;
}

function relativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return 'لحظاتی پیش';
  if (min < 60) return `${formatPersianNumber(min)} دقیقه پیش`;
  if (hr < 24) return `${formatPersianNumber(hr)} ساعت پیش`;
  if (day < 30) return `${formatPersianNumber(day)} روز پیش`;
  return formatPersianDate(date);
}

function dayKey(date: string | Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

// ─── Activity Heatmap ────────────────────────────────────────────────────── //

function ActivityHeatmap({ requests }: { requests: MyRequest[] }) {
  const days = 30;
  const today = startOfDay(new Date());
  const cells = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      const k = dayKey(r.createdAt);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    const list: { date: Date; key: string; count: number; weekday: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = dayKey(d);
      list.push({
        date: d,
        key: k,
        count: map.get(k) ?? 0,
        weekday: d.getDay(),
      });
    }
    return list;
  }, [requests]);

  const max = Math.max(1, ...cells.map((c) => c.count));
  const totalInPeriod = cells.reduce((s, c) => s + c.count, 0);
  const activeDays = cells.filter((c) => c.count > 0).length;
  const avgPerDay = totalInPeriod / days;
  const streak = (() => {
    let count = 0;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].count > 0) count++;
      else break;
    }
    return count;
  })();

  return (
    <section className={s.heatmapPanel} aria-label="نقشه فعالیت ۳۰ روز اخیر">
      <header className={s.heatmapHead}>
        <div className={s.heatmapTitle}>
          <span className={s.heatmapDot} aria-hidden />
          <h3 className={s.heatmapH3}>نقشه فعالیت</h3>
          <span className={s.heatmapSub}>۳۰ روز اخیر</span>
        </div>
        <div className={s.heatmapMeta}>
          <span className={s.heatmapStat}>
            <strong>{formatPersianNumber(totalInPeriod)}</strong> ثبت
          </span>
          <span className={s.heatmapDivider} aria-hidden />
          <span className={s.heatmapStat}>
            <strong>{formatPersianNumber(activeDays)}</strong> روز فعال
          </span>
          <span className={s.heatmapDivider} aria-hidden />
          <span className={s.heatmapStat}>
            <strong>{formatPersianNumber(avgPerDay.toFixed(1))}</strong> میانگین روزانه
          </span>
        </div>
      </header>

      <div
        className={s.heatmapGrid}
        role="img"
        aria-label={`${formatPersianNumber(totalInPeriod)} درخواست در ۳۰ روز اخیر`}
      >
        {cells.map((c, i) => {
          const ratio = c.count / max;
          const intensity =
            c.count === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
          return (
            <div
              key={c.key}
              className={s.heatmapCell}
              data-level={intensity}
              style={{ animationDelay: `${i * 6}ms` }}
              title={`${formatPersianDate(c.date)} — ${formatPersianNumber(c.count)} درخواست`}
              aria-label={`${formatPersianDate(c.date)}: ${formatPersianNumber(c.count)} درخواست`}
            />
          );
        })}
      </div>

      <div className={s.heatmapStats}>
        <div className={s.heatmapStatBox}>
          <span className={s.heatmapStatLabel}>روزهای فعال</span>
          <span className={s.heatmapStatValue}>
            <strong>{formatPersianNumber(activeDays)}</strong>
            <span className={s.heatmapStatSub}>/ {formatPersianNumber(days)}</span>
          </span>
        </div>
        <div className={s.heatmapStatBox}>
          <span className={s.heatmapStatLabel}>روزهای خاموش</span>
          <span className={s.heatmapStatValue}>
            <strong>{formatPersianNumber(days - activeDays)}</strong>
          </span>
        </div>
        <div className={s.heatmapStatBox}>
          <span className={s.heatmapStatLabel}>روزهای پردستور</span>
          <span className={s.heatmapStatValue}>
            <strong>
              {formatPersianNumber(cells.filter((c) => c.count === max && c.count > 0).length)}
            </strong>
          </span>
        </div>
        <div className={s.heatmapStatBox}>
          <span className={s.heatmapStatLabel}>رشته فعلی</span>
          <span className={s.heatmapStatValue}>
            <strong>{formatPersianNumber(streak)}</strong>
            <span className={s.heatmapStatSub}>روز</span>
          </span>
        </div>
      </div>

      <footer className={s.heatmapFoot}>
        <span className={s.heatmapLegendLabel}>کم</span>
        <span className={s.heatmapLegend} aria-hidden>
          <span className={s.heatmapCell} data-level="0" />
          <span className={s.heatmapCell} data-level="1" />
          <span className={s.heatmapCell} data-level="2" />
          <span className={s.heatmapCell} data-level="3" />
          <span className={s.heatmapCell} data-level="4" />
        </span>
        <span className={s.heatmapLegendLabel}>زیاد</span>
      </footer>
    </section>
  );
}

// ─── Volume by Service ──────────────────────────────────────────────────── //

function VolumeByService({ requests }: { requests: MyRequest[] }) {
  const distribution = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const r of requests) {
      const key = r.serviceType;
      const cur = map.get(key) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(r.amount) || 0;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([key, val]) => ({
        key,
        label: SERVICE_LABELS[key] ?? key,
        count: val.count,
        total: val.total,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [requests]);

  if (distribution.length === 0) {
    return null;
  }

  const max = Math.max(...distribution.map((d) => d.count), 1);
  const grandTotal = distribution.reduce((s, d) => s + d.count, 0);
  const grandAmount = distribution.reduce((s, d) => s + d.total, 0);

  return (
    <section className={s.volumePanel} aria-label="توزیع خدمات">
      <header className={s.volumeHead}>
        <div className={s.volumeTitle}>
          <span className={s.heatmapDot} aria-hidden />
          <h3 className={s.heatmapH3}>توزیع خدمات</h3>
        </div>
        <span className={s.volumeSub}>۵ خدمت برتر</span>
      </header>

      <div className={s.volumeTotals}>
        <span className={s.volumeTotalItem}>
          <strong>{formatPersianNumber(grandTotal)}</strong>
          <span>درخواست</span>
        </span>
        <span className={s.volumeTotalDivider} aria-hidden />
        <span className={s.volumeTotalItem}>
          <strong>{formatPersianNumber(Math.round(grandAmount))}</strong>
          <span>حجم کل</span>
        </span>
      </div>

      <ul className={s.volumeList}>
        {distribution.map((d, i) => {
          const ratio = d.count / max;
          const share = grandTotal > 0 ? Math.round((d.count / grandTotal) * 100) : 0;
          return (
            <li key={d.key} className={s.volumeItem} style={{ animationDelay: `${i * 50}ms` }}>
              <div className={s.volumeItemHead}>
                <span className={s.volumeItemLabel}>{d.label}</span>
                <span className={s.volumeItemMeta}>
                  <span className={s.volumeItemCount}>{formatPersianNumber(d.count)} مورد</span>
                  <span className={s.volumeItemShare}>{formatPersianNumber(share)}٪</span>
                </span>
              </div>
              <div className={s.volumeTrack} aria-hidden>
                <span
                  className={s.volumeFill}
                  style={{ inlineSize: `${Math.max(2, ratio * 100)}%` }}
                />
              </div>
              <div className={s.volumeItemFoot}>
                <span className={s.volumeItemAmount}>
                  {formatPersianNumber(Math.round(d.total))} واحد
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Pipeline Overview (signature) ───────────────────────────────────────── //

function PipelineOverview({
  total,
  pending,
  inProgress,
  completed,
  cancelled,
  activeFilter,
  onFilterChange,
  loading,
}: {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  activeFilter: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
  loading: boolean;
}) {
  const active = total - cancelled;
  const completedRatio = active > 0 ? completed / active : 0;
  const inProgressRatio = active > 0 ? inProgress / active : 0;
  const successRate = active > 0 ? Math.round((completed / active) * 100) : 0;

  return (
    <section className={s.pipeline} aria-label="نمای گرافیکی جریان درخواست‌ها">
      <GeometricField density="min" className={s.pipelineGeo} />

      <div className={s.pipelineGrid} aria-hidden />

      <div className={s.pipelineHead}>
        <div className={s.pipelineTitle}>
          <span className={s.pipelineDot} aria-hidden />
          <span>جریان درخواست‌ها</span>
        </div>
        <div className={s.pipelineHeadMeta}>
          <span className={s.pipelineTotal} aria-label="مجموع درخواست‌ها">
            {formatPersianNumber(total)} مورد
          </span>
          {active > 0 && (
            <span
              className={s.pipelineSuccess}
              aria-label={`نرخ تکمیل ${formatPersianNumber(successRate)} درصد`}
            >
              <span
                className={s.pipelineSuccessDot}
                style={{ '--ring': `${successRate}%` } as React.CSSProperties}
                aria-hidden
              />
              <span className={s.pipelineSuccessNum}>{formatPersianNumber(successRate)}٪</span>
              <span className={s.pipelineSuccessLabel}>تکمیل</span>
            </span>
          )}
        </div>
      </div>

      <div className={s.pipelineBody}>
        <div className={s.pipelineFlow}>
          {PIPELINE_STAGES.map((stage, idx) => {
            const meta = STATUS_META[stage];
            const value =
              stage === 'PENDING' ? pending : stage === 'IN_PROGRESS' ? inProgress : completed;
            const ratio =
              stage === 'PENDING'
                ? 1
                : stage === 'IN_PROGRESS'
                  ? inProgressRatio + completedRatio
                  : completedRatio;
            const isLast = idx === PIPELINE_STAGES.length - 1;
            const nodeClass = cn(
              s.pipelineNode,
              activeFilter === stage && s.pipelineNodeActive,
              s[`pipelineNode--${meta.cssKey}`],
            );
            return (
              <div key={stage} className={s.pipelineNodeRow}>
                <button
                  type="button"
                  className={nodeClass}
                  onClick={() => onFilterChange(activeFilter === stage ? 'ALL' : stage)}
                  aria-pressed={activeFilter === stage}
                  aria-label={`${meta.label}: ${formatPersianNumber(value)} درخواست`}
                >
                  <span className={s.pipelineNodeIcon} aria-hidden>
                    <meta.icon size={11} />
                  </span>
                  <span className={s.pipelineNodeCount}>
                    {loading ? (
                      <span className={s.pulse} aria-hidden />
                    ) : (
                      formatPersianNumber(value)
                    )}
                  </span>
                  <span className={s.pipelineNodeLabel}>{meta.label}</span>
                </button>
                {!isLast && (
                  <div className={s.pipelineConnector} aria-hidden>
                    <span
                      className={s.pipelineConnectorFill}
                      style={{ inlineSize: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={cn(s.pipelineBranch, activeFilter === 'CANCELLED' && s.pipelineBranchActive)}
          onClick={() => onFilterChange(activeFilter === 'CANCELLED' ? 'ALL' : 'CANCELLED')}
          aria-pressed={activeFilter === 'CANCELLED'}
          aria-label={`لغو شده: ${formatPersianNumber(cancelled)} درخواست`}
        >
          <span className={s.pipelineBranchDash} aria-hidden />
          <span className={s.pipelineNodeIcon} aria-hidden>
            <XCircle size={11} />
          </span>
          <span className={s.pipelineNodeCount}>
            {loading ? <span className={s.pulse} aria-hidden /> : formatPersianNumber(cancelled)}
          </span>
          <span className={s.pipelineNodeLabel}>لغو شده</span>
        </button>
      </div>
    </section>
  );
}

// ─── Filter Bar ──────────────────────────────────────────────────────────── //

function FilterBar({
  search,
  onSearchChange,
  urgency,
  onUrgencyChange,
  sort,
  onSortChange,
  group,
  onGroupChange,
  onRefresh,
  refreshing,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  urgency: 'ALL' | 'URGENT' | 'NORMAL';
  onUrgencyChange: (v: 'ALL' | 'URGENT' | 'NORMAL') => void;
  sort: SortMode;
  onSortChange: (v: SortMode) => void;
  group: GroupMode;
  onGroupChange: (v: GroupMode) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className={s.filterBar}>
      <div className={s.searchWrap}>
        <Search size={13} className={s.searchIcon} aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="جستجو در کد پیگیری یا نوع خدمت…"
          className={s.searchInput}
          aria-label="جستجو"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className={s.searchClear}
            aria-label="پاک کردن جستجو"
          >
            <XCircle size={12} />
          </button>
        )}
      </div>

      <div className={s.filterChips} role="group" aria-label="فیلتر فوریت">
        <button
          type="button"
          onClick={() => onUrgencyChange('ALL')}
          className={cn(s.urgencyChip, urgency === 'ALL' && s.urgencyChipActive)}
          aria-pressed={urgency === 'ALL'}
        >
          <Filter size={10} aria-hidden />
          <span>همه</span>
        </button>
        <button
          type="button"
          onClick={() => onUrgencyChange('URGENT')}
          className={cn(
            s.urgencyChip,
            s.urgencyChipUrgent,
            urgency === 'URGENT' && s.urgencyChipActive,
          )}
          aria-pressed={urgency === 'URGENT'}
        >
          <Zap size={10} aria-hidden />
          <span>فوری</span>
        </button>
        <button
          type="button"
          onClick={() => onUrgencyChange('NORMAL')}
          className={cn(s.urgencyChip, urgency === 'NORMAL' && s.urgencyChipActive)}
          aria-pressed={urgency === 'NORMAL'}
        >
          <span>عادی</span>
        </button>
      </div>

      <div className={s.filterControls}>
        <div className={s.sortWrap}>
          <label className={s.sortLabel} htmlFor="my-requests-sort">
            مرتب:
          </label>
          <select
            id="my-requests-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            className={s.sortSelect}
          >
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="amount-desc">بیشترین مبلغ</option>
            <option value="amount-asc">کمترین مبلغ</option>
            <option value="urgent">فوری‌ها بالا</option>
          </select>
        </div>

        <div className={s.sortWrap}>
          <label className={s.sortLabel} htmlFor="my-requests-group">
            گروه:
          </label>
          <select
            id="my-requests-group"
            value={group}
            onChange={(e) => onGroupChange(e.target.value as GroupMode)}
            className={s.sortSelect}
          >
            <option value="status">وضعیت</option>
            <option value="service">خدمت</option>
            <option value="none">بدون گروه</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className={s.refreshBtn}
        aria-label="به‌روزرسانی"
        title="به‌روزرسانی"
      >
        <RefreshCw size={12} className={refreshing ? s.refreshSpin : ''} aria-hidden />
        <span>به‌روزرسانی</span>
      </button>
    </div>
  );
}

// ─── Ticket Card ─────────────────────────────────────────────────────────── //

function TicketCard({
  req,
  isActive,
  onSelect,
  onCancelled,
  index,
}: {
  req: MyRequest;
  isActive: boolean;
  onSelect: () => void;
  onCancelled: (trackingCode: string) => void;
  index: number;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr] = useState('');
  const [cancelDone, setCancelDone] = useState(false);
  const [localStatus, setLocalStatus] = useState(req.status);

  const meta = STATUS_META[localStatus] ?? STATUS_META.PENDING;
  const StatusIcon = meta.icon;

  // 30-minute cancel window
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
  const isUrgent = req.urgency === 'URGENT';

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
      setCancelErr('error' in res ? res.error.message : 'خطایی رخ داد.');
    }
  };

  const cardClass = cn(s.ticket, isActive && s.ticketActive, s[`ticket--${meta.cssKey}`]);

  return (
    <li className={cardClass} style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}>
      <span className={s.executionRail} aria-hidden>
        <span className={s.executionRailPulse} />
      </span>

      <button
        type="button"
        className={s.ticketTrigger}
        onClick={onSelect}
        aria-expanded={isActive}
        aria-controls={`ticket-body-${req.id}`}
      >
        <span className={s.ticketIcon} aria-hidden>
          <Wallet size={14} />
        </span>

        <div className={s.ticketMain}>
          <div className={s.ticketTopLine}>
            <span className={s.ticketCode}>{req.trackingCode}</span>
            {isUrgent && (
              <span className={s.ticketUrgent} title="فوری" aria-label="فوری">
                <Zap size={9} aria-hidden />
              </span>
            )}
            <span className={s.ticketService}>
              {SERVICE_LABELS[req.serviceType] ?? req.serviceType}
            </span>
          </div>
          <div className={s.ticketBottomLine}>
            <span className={s.ticketStatusDot} data-status={meta.cssKey} aria-hidden>
              <StatusIcon size={9} />
            </span>
            <span className={s.ticketStatusText}>{meta.label}</span>
            <span className={s.ticketDate} title={formatPersianDateTime(req.createdAt)}>
              {relativeTime(req.createdAt)}
            </span>
          </div>
        </div>

        <div className={s.ticketRight}>
          <span className={s.ticketAmount}>
            {formatAmountWithCurrency(req.amount, req.currency)}
          </span>
          <span className={s.ticketMeta}>
            {localStatus === 'PENDING' && cancelMinsLeft !== null && cancelMinsLeft > 0 && (
              <span className={s.ticketCountdown}>
                <Clock size={9} aria-hidden />
                {formatPersianNumber(cancelMinsLeft)} دقیقه
              </span>
            )}
            <ChevronLeft
              size={12}
              className={cn(s.ticketChevron, isActive && s.ticketChevronOpen)}
              aria-hidden
            />
          </span>
        </div>
      </button>

      {isActive && (
        <div className={s.ticketBody} id={`ticket-body-${req.id}`}>
          {req.adminNotes && (
            <div className={s.adminBanner} role="note">
              <div className={s.adminBannerHead}>
                <AlertCircle size={11} aria-hidden />
                <span>یادداشت پشتیبانی</span>
              </div>
              <p className={s.adminBannerText}>{req.adminNotes}</p>
            </div>
          )}

          <div className={s.datesStrip}>
            <span className={s.dateChip}>
              <CalendarClock size={11} aria-hidden />
              ثبت: {formatPersianDateTime(req.createdAt)}
            </span>
            <span className={s.dateChip}>به‌روزرسانی: {formatPersianDateTime(req.updatedAt)}</span>
            {req.estimatedCompletionAt && (
              <span className={cn(s.dateChip, s.dateChipEta)}>
                <CheckCircle2 size={11} aria-hidden />
                تخمین تکمیل: {formatPersianDate(req.estimatedCompletionAt)}
              </span>
            )}
          </div>

          <div className={s.detailColumns}>
            <div className={s.detailLeft}>
              <div className={s.copyZone}>
                <span className={s.copyLabel}>کد پیگیری:</span>
                <code className={s.copyCode}>{req.trackingCode}</code>
                <CopyButton text={req.trackingCode} label="کپی" className={s.copyBtn} />
              </div>

              {(localStatus === 'PENDING' || cancelDone) && (
                <div className={s.cancelZone}>
                  <div className={s.cancelRow}>
                    <div className={s.cancelInfo}>
                      {canCancel && cancelMinsLeft !== null && (
                        <span className={s.cancelTimer}>
                          <Clock size={11} aria-hidden />
                          {formatPersianNumber(cancelMinsLeft)} دقیقه تا پایان مهلت لغو
                        </span>
                      )}
                      {!canCancel && localStatus === 'PENDING' && !cancelDone && (
                        <span className={s.cancelExpired}>مهلت لغو تمام شده است.</span>
                      )}
                      {cancelDone && (
                        <span className={s.cancelSuccess}>
                          <CheckCircle2 size={11} aria-hidden />
                          سفارش لغو شد.
                        </span>
                      )}
                    </div>
                    {canCancel && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={cancelling}
                        className={s.btnCancel}
                      >
                        {cancelling ? (
                          <span className={s.spinnerSm} aria-hidden />
                        ) : (
                          <Ban size={11} aria-hidden />
                        )}
                        لغو درخواست
                      </button>
                    )}
                  </div>
                  {cancelErr && (
                    <p className={s.cancelErr} role="alert">
                      <AlertCircle size={11} aria-hidden />
                      {cancelErr}
                    </p>
                  )}
                </div>
              )}

              <a
                href={`/track/${req.trackingCode}`}
                className={s.trackLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileSearch size={12} aria-hidden />
                پیگیری عمومی سفارش
                <ArrowUpLeft size={11} aria-hidden />
              </a>
            </div>

            {req.statusLogs.length > 0 && (
              <div className={s.timelinePanel}>
                <div className={s.timelineHead}>
                  <History size={11} aria-hidden />
                  <span>تایم‌لاین اجرا</span>
                </div>
                <ol className={s.timelineList}>
                  {req.statusLogs.map((log, i) => {
                    const logMeta = STATUS_META[log.toStatus] ?? STATUS_META.PENDING;
                    return (
                      <li
                        key={`${log.createdAt}-${i}`}
                        className={s.timelineItem}
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <span
                          className={cn(s.timelineDot, s[`timelineDot--${logMeta.cssKey}`])}
                          data-first={i === 0 ? 'true' : undefined}
                        />
                        <div className={s.timelineContent}>
                          <span className={s.timelineStatus}>
                            {STATUS_LABELS[log.toStatus] ?? log.toStatus}
                          </span>
                          {log.note && <span className={s.timelineNote}>{log.note}</span>}
                          <time className={s.timelineTime}>
                            {formatPersianDateTime(log.createdAt)}
                          </time>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// ─── Ticket Group ────────────────────────────────────────────────────────── //

function TicketGroup({
  title,
  count,
  totalAmount,
  accent,
  children,
  defaultOpen = true,
  icon,
}: {
  title: string;
  count: number;
  totalAmount?: number;
  accent: 'pending' | 'progress' | 'completed' | 'cancelled' | 'neutral';
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={cn(s.ticketGroup, s[`ticketGroup--${accent}`])}
      aria-label={`گروه ${title}`}
    >
      <button
        type="button"
        className={s.ticketGroupHead}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <span className={s.ticketGroupIcon} aria-hidden>
          {icon}
        </span>
        <span className={s.ticketGroupTitleBlock}>
          <span className={s.ticketGroupTitle}>{title}</span>
          {totalAmount !== undefined && totalAmount > 0 && (
            <span className={s.ticketGroupAmount}>
              {formatPersianNumber(Math.round(totalAmount))} واحد
            </span>
          )}
        </span>
        <span className={s.ticketGroupCount}>{formatPersianNumber(count)}</span>
        <ChevronDown
          size={12}
          className={cn(s.ticketGroupChevron, open && s.ticketGroupChevronOpen)}
          aria-hidden
        />
      </button>
      {open && <ul className={s.ticketList}>{children}</ul>}
    </section>
  );
}

// ─── Claim Guest Panel ───────────────────────────────────────────────────── //

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
      const otpRes = await issueServiceOtp({
        email: res.data.email,
        trackingCode: code.trim().toUpperCase(),
      });
      if (otpRes.success) setOtpTimer(60);
      return;
    }
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
        <span className={s.claimToggleIcon} aria-hidden>
          <Link2 size={13} />
        </span>
        <span className={s.claimToggleLabel}>اتصال سفارش ثبت‌شده به‌عنوان مهمان</span>
        <span className={s.claimHint}>کد پیگیری قبلی دارید؟</span>
        <ChevronDown
          size={12}
          className={cn(s.claimChevron, open && s.claimChevronOpen)}
          aria-hidden
        />
      </button>

      {open && (
        <div className={s.claimBody}>
          {!needsOtp ? (
            <>
              <p className={s.claimDesc}>
                اگر پیش از ساخت حساب، سفارشی ثبت کرده‌اید، کد پیگیری‌اش را وارد کنید تا به حساب
                فعلی‌تان متصل شود.
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
                  {loading ? (
                    <span className={s.spinnerSm} aria-hidden />
                  ) : (
                    <>
                      <Link2 size={11} aria-hidden />
                      اتصال به حساب
                    </>
                  )}
                </button>
              </div>
              <div className={s.claimHelp}>
                <span className={s.claimHelpLabel}>فرمت کد:</span>
                <code className={s.claimHelpCode}>BT-XXXXXXXX-XXXXXX</code>
                <span className={s.claimHelpHint}>(دو حرف، ۸ رقم، ۶ رقم — با خط تیره)</span>
              </div>
            </>
          ) : (
            <>
              <p className={s.claimDesc}>
                برای تأیید مالکیت، کد ۶ رقمی ارسال‌شده به{' '}
                <strong dir="ltr" className={s.claimOtpEmail}>
                  {otpEmail}
                </strong>{' '}
                را وارد کنید:
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
                    <span className={s.spinnerSm} aria-hidden />
                  ) : (
                    <>
                      <KeyRound size={11} aria-hidden />
                      تأیید
                    </>
                  )}
                </button>
              </div>
              <div className={s.otpFooter}>
                {otpTimer > 0 ? (
                  <span className={s.otpTimer} aria-live="polite">
                    ارسال مجدد در {formatPersianNumber(otpTimer)} ثانیه
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpSending}
                    className={s.otpResend}
                  >
                    <RotateCcw size={10} aria-hidden />
                    ارسال مجدد کد
                  </button>
                )}
              </div>
            </>
          )}

          {msg && (
            <p className={cn(isErr ? s.claimErr : s.claimOk)} role={isErr ? 'alert' : 'status'}>
              {isErr ? (
                <AlertCircle size={11} aria-hidden />
              ) : (
                <CheckCircle2 size={11} aria-hidden />
              )}
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loading State ──────────────────────────────────────────────────────── //

function MyRequestsSkeleton() {
  return (
    <ul className={s.ticketList} aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className={s.skeleton} aria-hidden />
      ))}
    </ul>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────── //

export default function MyRequestsClient() {
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [_totalCount, setTotalCount] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [urgency, setUrgency] = useState<'ALL' | 'URGENT' | 'NORMAL'>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [group, setGroup] = useState<GroupMode>('status');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });

  const pageRef = useRef(page);
  pageRef.current = page;
  const filterRef = useRef(filterStatus);
  filterRef.current = filterStatus;

  const fetchStats = useCallback(async () => {
    const res = await getMyServiceRequestStats();
    if (res.success && res.data) {
      setStats(res.data);
    }
  }, []);

  const fetchRequests = useCallback(async (p: number, status: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const result = await getMyServiceRequests({ page: p, limit: 10, status });
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
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchRequests(page, filterStatus);
  }, [fetchRequests, page, filterStatus]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, page, filterStatus]);

  // Client-side derived list (search + urgency + sort)
  const visibleRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = requests;
    if (q) {
      list = list.filter((r) => {
        const code = r.trackingCode.toLowerCase();
        const service = (SERVICE_LABELS[r.serviceType] ?? r.serviceType).toLowerCase();
        return code.includes(q) || service.includes(q);
      });
    }
    if (urgency !== 'ALL') {
      list = list.filter((r) => r.urgency === urgency);
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === 'urgent') {
        if (a.urgency !== b.urgency) return a.urgency === 'URGENT' ? -1 : 1;
      }
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      if (sort === 'newest') return bt - at;
      if (sort === 'oldest') return at - bt;
      const aa = Number(a.amount);
      const ba = Number(b.amount);
      if (sort === 'amount-desc') return ba - aa;
      if (sort === 'amount-asc') return aa - ba;
      return bt - at;
    });
    return sorted;
  }, [requests, search, urgency, sort]);

  // Group by status or service
  const groupedRequests = useMemo(() => {
    if (group === 'none') {
      return [{ key: 'ALL' as const, items: visibleRequests }];
    }
    if (group === 'status') {
      return STATUS_ORDER.map((status) => ({
        key: status,
        items: visibleRequests.filter((r) => r.status === status),
      })).filter((g) => g.items.length > 0);
    }
    // group by service
    const map = new Map<string, MyRequest[]>();
    for (const r of visibleRequests) {
      const key = r.serviceType;
      const cur = map.get(key) ?? [];
      cur.push(r);
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([key, items]) => ({ key, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [group, visibleRequests]);

  // Derived KPI metrics
  const kpiMetrics = useMemo(() => {
    const urgentPending = requests.filter(
      (r) => r.urgency === 'URGENT' && r.status === 'PENDING',
    ).length;
    const successRate =
      stats.total > 0
        ? Math.round((stats.completed / Math.max(1, stats.total - stats.cancelled)) * 100)
        : 0;
    const totalVolume = requests.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { urgentPending, successRate, totalVolume };
  }, [requests, stats]);

  const handleCancelled = useCallback(() => {
    fetchRequests(pageRef.current, filterRef.current);
    fetchStats();
  }, [fetchRequests, fetchStats]);

  const handleToggle = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  const handleFilterChange = useCallback((status: FilterStatus) => {
    setFilterStatus(status);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchRequests(pageRef.current, filterRef.current, true);
    fetchStats();
  }, [fetchRequests, fetchStats]);

  const noResults = !loading && !error && requests.length > 0 && visibleRequests.length === 0;

  const groupAccent: Record<
    string,
    'pending' | 'progress' | 'completed' | 'cancelled' | 'neutral'
  > = {
    PENDING: 'pending',
    IN_PROGRESS: 'progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ALL: 'neutral',
  };

  const groupIcon = (key: string) => {
    if (key === 'ALL') return <Wallet size={11} />;
    if (STATUS_META[key]) {
      const Icon = STATUS_META[key].icon;
      return <Icon size={11} />;
    }
    return <Wallet size={11} />;
  };

  const groupTitle = (key: string) => {
    if (key === 'ALL') return 'همه درخواست‌ها';
    if (STATUS_GROUP_LABELS[key as FilterStatus]) {
      return STATUS_GROUP_LABELS[key as FilterStatus];
    }
    return SERVICE_LABELS[key] ?? key;
  };

  // global index for stagger animation
  let globalIndex = 0;

  return (
    <section className={s.workspace} aria-labelledby="my-requests-title">
      <PageHeader
        variant="compact"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'درخواست‌های من' }]}
        title="درخواست‌های من"
        description="پیگیری، مدیریت و لغو درخواست‌های خدماتی"
        icon="clipboard-list"
        accent="indigo"
        actions={
          <a href="/money-transfer" className={s.newBtn}>
            <Plus size={14} aria-hidden />
            درخواست جدید
          </a>
        }
      />

      {/* ─── KPI Strip ────────────────────────────────────────────────── */}
      <StatGrid cols={4} gap="md" className={s.kpiStrip}>
        <StatCard
          label="کل درخواست‌ها"
          value={stats.total}
          icon={Wallet}
          format="persian"
          loading={loading}
          info="تعداد کل درخواست‌های ثبت‌شده توسط شما"
        />
        <StatCard
          label="نیاز به توجه"
          value={kpiMetrics.urgentPending}
          icon={Flame}
          format="persian"
          loading={loading}
          info="درخواست‌های فوری که هنوز در انتظار بررسی هستند"
        />
        <StatCard
          label="در حال انجام"
          value={stats.inProgress}
          icon={TrendingUp}
          format="persian"
          loading={loading}
          info="درخواست‌هایی که در حال پردازش هستند"
        />
        <StatCard
          label="نرخ موفقیت"
          value={kpiMetrics.successRate}
          icon={CheckCircle2}
          format="percent"
          loading={loading}
          info="درصد درخواست‌هایی که با موفقیت تکمیل شده‌اند"
        />
      </StatGrid>

      {/* ─── Two-column Hero: Pipeline + Volume ──────────────────────── */}
      <div className={s.heroGrid}>
        <PipelineOverview
          total={stats.total}
          pending={stats.pending}
          inProgress={stats.inProgress}
          completed={stats.completed}
          cancelled={stats.cancelled}
          activeFilter={filterStatus}
          onFilterChange={handleFilterChange}
          loading={loading}
        />
        <VolumeByService requests={requests} />
      </div>

      {/* ─── Activity Heatmap ─────────────────────────────────────────── */}
      <ActivityHeatmap requests={requests} />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        urgency={urgency}
        onUrgencyChange={setUrgency}
        sort={sort}
        onSortChange={setSort}
        group={group}
        onGroupChange={setGroup}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <ClaimGuestPanel
        onClaimed={() => {
          fetchRequests(1, filterStatus);
          fetchStats();
        }}
      />

      {loading && <MyRequestsSkeleton />}

      {!loading && error && (
        <div className={s.errorBox} role="alert">
          <AlertCircle size={15} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <MillionDollarEmpty
          variant="inbox"
          tone="primary"
          eyebrow="مرکز درخواست‌ها"
          title="هنوز درخواستی ثبت نکرده‌اید"
          description="اولین درخواست‌تان را از صفحه خدمات ثبت کنید. پس از ثبت، می‌توانید وضعیت و تاریخچه‌اش را از همین‌جا دنبال کنید."
          primaryAction={
            <a href="/money-transfer" className={s.emptyCta}>
              <Plus size={13} aria-hidden />
              ثبت اولین درخواست
            </a>
          }
        />
      )}

      {!loading && !error && noResults && (
        <div className={s.noResultsBox}>
          <Search size={16} aria-hidden />
          <div>
            <p className={s.noResultsTitle}>نتیجه‌ای با این فیلترها پیدا نشد.</p>
            <p className={s.noResultsSub}>
              جستجو یا فیلتر فوریت را تغییر دهید، یا فیلترها را پاک کنید.
            </p>
          </div>
          <button
            type="button"
            className={s.noResultsClear}
            onClick={() => {
              setSearch('');
              setUrgency('ALL');
            }}
          >
            پاک کردن فیلترها
          </button>
        </div>
      )}

      {!loading && !error && visibleRequests.length > 0 && (
        <>
          {groupedRequests.map((g) => {
            const groupTotal = g.items.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
            return (
              <TicketGroup
                key={g.key}
                title={groupTitle(g.key)}
                count={g.items.length}
                totalAmount={groupTotal}
                accent={groupAccent[g.key] ?? 'neutral'}
                defaultOpen
                icon={groupIcon(g.key)}
              >
                {g.items.map((req) => {
                  const idx = globalIndex++;
                  return (
                    <TicketCard
                      key={req.id}
                      req={req}
                      isActive={activeId === req.id}
                      onSelect={() => handleToggle(req.id)}
                      onCancelled={handleCancelled}
                      index={idx}
                    />
                  );
                })}
              </TicketGroup>
            );
          })}

          {totalPages > 1 && (
            <nav className={s.pagination} aria-label="صفحه‌بندی درخواست‌ها">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={s.pageBtn}
              >
                قبلی
              </button>
              <div className={s.pageIndicator}>
                {formatPersianNumber(page)} <span className={s.pageDivider}>/</span>{' '}
                {formatPersianNumber(totalPages)}
              </div>
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
