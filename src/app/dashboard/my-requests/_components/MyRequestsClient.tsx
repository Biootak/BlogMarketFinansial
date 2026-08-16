'use client';

/**
 * MyRequestsClient — 2026 "Command Dock" redesign
 * ─────────────────────────────────────────────────────────────────────────────
 * معماری: Split-Command — نه لیست ساده، نه داشبورد کلیشه‌ای.
 *
 *  ZONE A  (full-width hero)  — Orbital Status Ring + KPI band
 *  ZONE B  (full-width strip) — Activity Heatmap (30 days) + Volume sidebar
 *  ZONE C  (command toolbar)  — Search, filter, sort, group, refresh
 *  ZONE D  (ticket rail)      — Asymmetric masonry-inspired ticket list
 *                               with inline expand panel (not collapse/expand per card)
 *  ZONE E  (footer)           — Pagination + Claim panel
 *
 *  Design decisions (2026-forward):
 *  • Orbital ring: SVG arc segments — هر وضعیت = یک arc رنگ‌دار با gap
 *  • KPI band: عمودی در کنار ring (نه horizontal strip)
 *  • Ticket: دو ستون asym در دسکتاپ — کارت سمت راست، panel جزئیات سمت چپ
 *  • "Live rail" indicator: نوار عمودی زنده که برای PENDING/IN_PROGRESS پالس می‌زند
 *  • Command toolbar: sticky با blur، نه floating card
 *  • هیچ inline hex/rgb — فقط --ds-* tokens
 *  • RTL-first + logical properties
 *  • TypeScript strict — no any, no TODO
 */

import { issueServiceOtp, verifyServiceOtpAndLink } from '@/actions/progressive-capture';
import {
  cancelMyServiceRequest,
  claimGuestRequest,
  getMyServiceRequestStats,
  getMyServiceRequests,
} from '@/actions/serviceRequestActions';
import { MillionDollarEmpty, PageHeader, SearchInput } from '@/components/Dashboard/primitives';
import { GeometricField } from '@/components/Dashboard/primitives/GeometricAccent';
import CopyButton from '@/components/fintech/CopyButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
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

// ─── Intl singletons ──────────────────────────────────────────────────────── //
const _faNum = new Intl.NumberFormat('fa-IR');

// ─── Types ───────────────────────────────────────────────────────────────── //
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

// ─── Constants ───────────────────────────────────────────────────────────── //
const STATUS_META: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    cssKey: string;
    arcColor: string;
  }
> = {
  PENDING: {
    label: 'در انتظار',
    icon: Clock,
    cssKey: 'pending',
    arcColor: 'var(--ds-status-pending-fg)',
  },
  IN_PROGRESS: {
    label: 'در انجام',
    icon: RefreshCw,
    cssKey: 'progress',
    arcColor: 'var(--ds-status-progress-fg)',
  },
  COMPLETED: {
    label: 'تکمیل‌شده',
    icon: CheckCircle2,
    cssKey: 'completed',
    arcColor: 'var(--ds-status-success-fg)',
  },
  CANCELLED: {
    label: 'لغو شده',
    icon: XCircle,
    cssKey: 'cancelled',
    arcColor: 'var(--ds-status-error-fg)',
  },
};

const SERVICE_LABELS: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
  GIFT_CARD: 'گیفت کارت',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  CRYPTO_BUY: 'خرید کریپتو',
  CRYPTO_SELL: 'فروش کریپتو',
  PAYPAL_TRANSFER: 'پی‌پال / اسکریل',
  MOBILE_TOPUP: 'شارژ موبایل',
  BILL_PAYMENT: 'پرداخت قبض',
  OTHER: 'سایر خدمات',
};

const STATUS_ORDER: FilterStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const STATUS_GROUP_LABELS: Record<FilterStatus, string> = {
  ALL: 'همه',
  PENDING: 'در انتظار',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
};

// ─── Helpers ─────────────────────────────────────────────────────────────── //
function fp(v: number | string): string {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? _faNum.format(n) : String(v);
}

const _faDateLong = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const _faDateTimeFmt = new Intl.DateTimeFormat('fa-IR', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(d: string | Date): string {
  return _faDateLong.format(new Date(d));
}

function formatDateTime(d: string | Date): string {
  return _faDateTimeFmt.format(new Date(d));
}

function fmtAmount(amount: string, currency: string): string {
  const n = Number(amount);
  return `${Number.isFinite(n) ? fp(n) : amount} ${currency}`;
}

function relTime(d: string | Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 1) return 'لحظاتی پیش';
  if (m < 60) return `${fp(m)} دقیقه پیش`;
  if (h < 24) return `${fp(h)} ساعت پیش`;
  if (day < 30) return `${fp(day)} روز پیش`;
  return formatDate(d);
}

function dayKey(d: string | Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

// ─── Orbital Status Ring (SVG signature) ─────────────────────────────────── //
interface OrbitalRingProps {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  activeFilter: FilterStatus;
  onFilterChange: (s: FilterStatus) => void;
  loading: boolean;
  successRate: number;
}

function OrbitalRing({
  total,
  pending,
  inProgress,
  completed,
  cancelled,
  activeFilter,
  onFilterChange,
  loading,
  successRate,
}: OrbitalRingProps) {
  const r = 70;
  const cx = 100;
  const cy = 100;
  const circumference = 2 * Math.PI * r;
  const GAP = 4; // px gap between segments

  const segments = [
    { key: 'PENDING' as FilterStatus, value: pending, cssKey: 'pending', label: 'در انتظار' },
    {
      key: 'IN_PROGRESS' as FilterStatus,
      value: inProgress,
      cssKey: 'progress',
      label: 'در انجام',
    },
    { key: 'COMPLETED' as FilterStatus, value: completed, cssKey: 'completed', label: 'تکمیل' },
    { key: 'CANCELLED' as FilterStatus, value: cancelled, cssKey: 'cancelled', label: 'لغو' },
  ].filter((s) => s.value > 0);

  const safeTotal = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const totalGap = segments.length * GAP;
  const available = circumference - totalGap;

  let offset = -circumference * 0.25; // Start from top
  const paths = segments.map((seg) => {
    const len = (seg.value / safeTotal) * available;
    const dash = `${len} ${circumference - len}`;
    const strokeDash = { strokeDasharray: dash, strokeDashoffset: -offset };
    const result = { ...seg, strokeDash, startOffset: offset };
    offset += len + GAP;
    return result;
  });

  return (
    <div className={s.orbitalWrap} aria-label="نمودار وضعیت درخواست‌ها">
      <svg
        viewBox="0 0 200 200"
        className={s.orbitalSvg}
        role="img"
        aria-label={`${fp(total)} درخواست`}
      >
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--ds-border-subtle)"
          strokeWidth="12"
          opacity="0.4"
        />
        {/* Segments */}
        {!loading &&
          paths.map((seg) => (
            <circle
              key={seg.key}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={`var(--ds-status-${seg.cssKey === 'progress' ? 'progress' : seg.cssKey === 'completed' ? 'success' : seg.cssKey === 'cancelled' ? 'error' : 'pending'}-fg)`}
              strokeWidth={activeFilter === seg.key ? '14' : '11'}
              strokeLinecap="round"
              strokeDasharray={seg.strokeDash.strokeDasharray}
              strokeDashoffset={seg.strokeDash.strokeDashoffset}
              opacity={activeFilter === 'ALL' || activeFilter === seg.key ? 1 : 0.25}
              className={s.orbitalArc}
              style={{ cursor: 'pointer' }}
              onClick={() => onFilterChange(activeFilter === seg.key ? 'ALL' : seg.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onFilterChange(activeFilter === seg.key ? 'ALL' : seg.key);
                }
              }}
              aria-label={`${seg.label}: ${fp(seg.value)}`}
            />
          ))}
        {loading && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--ds-border-default)"
            strokeWidth="11"
            strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
            className={s.orbitalLoading}
          />
        )}
        {/* Center content */}
        <foreignObject x="50" y="55" width="100" height="90">
          <div className={s.orbitalCenter}>
            <span className={s.orbitalTotal}>{loading ? '···' : fp(total)}</span>
            <span className={s.orbitalLabel}>درخواست</span>
            {!loading && total > 0 && (
              <span className={s.orbitalRate}>{fp(successRate)}٪ موفق</span>
            )}
          </div>
        </foreignObject>
      </svg>

      {/* Legend buttons */}
      <fieldset className={s.orbitalLegend}>
        <legend className="sr-only">فیلتر وضعیت</legend>
        {(
          [
            { key: 'PENDING' as FilterStatus, value: pending, cssKey: 'pending', label: 'انتظار' },
            {
              key: 'IN_PROGRESS' as FilterStatus,
              value: inProgress,
              cssKey: 'progress',
              label: 'در انجام',
            },
            {
              key: 'COMPLETED' as FilterStatus,
              value: completed,
              cssKey: 'completed',
              label: 'تکمیل',
            },
            {
              key: 'CANCELLED' as FilterStatus,
              value: cancelled,
              cssKey: 'cancelled',
              label: 'لغو',
            },
          ] as const
        ).map((seg) => {
          const Meta = STATUS_META[seg.key];
          const Icon = Meta.icon;
          const isActive = activeFilter === seg.key;
          return (
            <button
              key={seg.key}
              type="button"
              className={cn(
                s.orbitalLegendItem,
                isActive && s.orbitalLegendItemActive,
                s[`orbitalLegend--${seg.cssKey}`],
              )}
              onClick={() => onFilterChange(isActive ? 'ALL' : seg.key)}
              aria-pressed={isActive}
            >
              <span className={s.orbitalLegendDot} aria-hidden />
              <Icon size={10} aria-hidden />
              <span>{seg.label}</span>
              <span className={s.orbitalLegendCount}>{fp(seg.value)}</span>
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}

// ─── Activity Heatmap ────────────────────────────────────────────────────── //
function ActivityHeatmap({ requests }: { requests: MyRequest[] }) {
  const days = 30;
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const cells = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      const k = dayKey(r.createdAt);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      const k = dayKey(d);
      return { date: d, key: k, count: map.get(k) ?? 0 };
    });
  }, [requests, today]);

  const max = Math.max(1, ...cells.map((c) => c.count));
  const active = cells.filter((c) => c.count > 0).length;
  const total30 = cells.reduce((s, c) => s + c.count, 0);

  return (
    <section className={s.heatmapSection} aria-label="فعالیت ۳۰ روز اخیر">
      <header className={s.heatmapHeader}>
        <span className={s.sectionLabel}>فعالیت اخیر</span>
        <div className={s.heatmapMeta}>
          <span className={s.heatmapMetaItem}>
            <strong>{fp(total30)}</strong> در ۳۰ روز
          </span>
          <span className={s.heatmapMetaDot} aria-hidden />
          <span className={s.heatmapMetaItem}>
            <strong>{fp(active)}</strong> روز فعال
          </span>
        </div>
      </header>
      <div
        className={s.heatmapGrid}
        role="img"
        aria-label={`${fp(total30)} درخواست در ۳۰ روز اخیر`}
      >
        {cells.map((c, i) => {
          const ratio = c.count / max;
          const lvl = c.count === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
          return (
            <span
              key={c.key}
              className={s.heatCell}
              data-level={lvl}
              style={{ animationDelay: `${i * 5}ms` }}
              title={`${formatDate(c.date)} — ${fp(c.count)} درخواست`}
              aria-label={`${formatDate(c.date)}: ${fp(c.count)}`}
            />
          );
        })}
      </div>
      <div className={s.heatmapLegend} aria-hidden>
        <span className={s.heatLegendLabel}>کم</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            className={s.heatCell}
            data-level={l}
            style={{ animation: 'none', opacity: 1, transform: 'none' }}
          />
        ))}
        <span className={s.heatLegendLabel}>زیاد</span>
      </div>
    </section>
  );
}

// ─── Volume by Service (compact sidebar) ─────────────────────────────────── //
function VolumeCompact({ requests }: { requests: MyRequest[] }) {
  const dist = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) map.set(r.serviceType, (map.get(r.serviceType) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([k, c]) => ({ k, label: SERVICE_LABELS[k] ?? k, c }))
      .sort((a, b) => b.c - a.c)
      .slice(0, 4);
  }, [requests]);

  if (!dist.length) return null;
  const maxC = Math.max(...dist.map((d) => d.c), 1);
  const grand = dist.reduce((s, d) => s + d.c, 0);

  return (
    <section className={s.volumeSection} aria-label="توزیع خدمات">
      <header className={s.volumeHeader}>
        <span className={s.sectionLabel}>خدمات برتر</span>
      </header>
      <ul className={s.volumeList}>
        {dist.map((d, i) => (
          <li key={d.k} className={s.volumeItem} style={{ animationDelay: `${i * 40}ms` }}>
            <div className={s.volumeItemRow}>
              <span className={s.volumeItemLabel}>{d.label}</span>
              <span className={s.volumeItemMeta}>
                <span className={s.volumeItemCount}>{fp(d.c)}</span>
                <span className={s.volumeItemPct}>
                  {grand > 0 ? fp(Math.round((d.c / grand) * 100)) : 0}٪
                </span>
              </span>
            </div>
            <div className={s.volumeTrack} aria-hidden>
              <span
                className={s.volumeFill}
                style={{ inlineSize: `${Math.max(2, (d.c / maxC) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Command Toolbar ─────────────────────────────────────────────────────── //
function CommandToolbar({
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
    <div className={s.commandBar} role="toolbar" aria-label="ابزار فیلتر و جستجو">
      <div className={s.commandSearch}>
        <SearchInput
          value={search}
          onChange={onSearchChange}
          onClear={() => onSearchChange('')}
          placeholder="جستجو — کد پیگیری یا نوع خدمت…"
          ariaLabel="جستجو در درخواست‌ها"
        />
      </div>

      <div className={s.commandFilters}>
        <fieldset className={s.urgencyGroup}>
          <legend className="sr-only">فوریت</legend>
          {(['ALL', 'URGENT', 'NORMAL'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => onUrgencyChange(u)}
              className={cn(
                s.urgencyBtn,
                urgency === u && s.urgencyBtnActive,
                u === 'URGENT' && s.urgencyBtnHot,
              )}
              aria-pressed={urgency === u}
            >
              {u === 'URGENT' && <Zap size={9} aria-hidden />}
              {u === 'ALL' && <Filter size={9} aria-hidden />}
              <span>{u === 'ALL' ? 'همه' : u === 'URGENT' ? 'فوری' : 'عادی'}</span>
            </button>
          ))}
        </fieldset>

        <Select value={sort} onValueChange={(v) => onSortChange(v as SortMode)}>
          <SelectTrigger className={s.cmdSelect} aria-label="مرتب‌سازی">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">جدیدترین</SelectItem>
            <SelectItem value="oldest">قدیمی‌ترین</SelectItem>
            <SelectItem value="amount-desc">بیشترین مبلغ</SelectItem>
            <SelectItem value="amount-asc">کمترین مبلغ</SelectItem>
            <SelectItem value="urgent">فوری‌ها اول</SelectItem>
          </SelectContent>
        </Select>

        <Select value={group} onValueChange={(v) => onGroupChange(v as GroupMode)}>
          <SelectTrigger className={s.cmdSelect} aria-label="گروه‌بندی">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">وضعیت</SelectItem>
            <SelectItem value="service">خدمت</SelectItem>
            <SelectItem value="none">بدون گروه</SelectItem>
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className={s.refreshBtn}
          aria-label="به‌روزرسانی"
        >
          <RefreshCw size={12} className={refreshing ? s.spinning : ''} aria-hidden />
          <span className={s.refreshLabel}>به‌روز</span>
        </button>
      </div>
    </div>
  );
}

// ─── Ticket Detail Panel (expanded body) ─────────────────────────────────── //
function TicketDetailPanel({
  req,
  onClose,
  onCancelled,
}: {
  req: MyRequest;
  onClose: () => void;
  onCancelled: (code: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr] = useState('');
  const [cancelDone, setCancelDone] = useState(false);
  const [localStatus, setLocalStatus] = useState(req.status);
  const [cancelMinsLeft, setCancelMinsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (localStatus !== 'PENDING') {
      setCancelMinsLeft(null);
      return;
    }
    const deadline = new Date(req.createdAt).getTime() + 30 * 60 * 1000;
    setCancelMinsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 60000)));
  }, [localStatus, req.createdAt]);

  useVisibilityAwareInterval(
    () => {
      if (localStatus !== 'PENDING') return;
      const deadline = new Date(req.createdAt).getTime() + 30 * 60 * 1000;
      setCancelMinsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 60000)));
    },
    localStatus === 'PENDING' ? 30_000 : 0,
  );

  const canCancel = localStatus === 'PENDING' && (cancelMinsLeft ?? 0) > 0;
  const meta = STATUS_META[localStatus] ?? STATUS_META.PENDING;

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

  return (
    <aside
      className={cn(s.detailPanel, s[`detailPanel--${meta.cssKey}`])}
      aria-label={`جزئیات ${req.trackingCode}`}
    >
      <div className={s.detailPanelRail} aria-hidden />

      <header className={s.detailPanelHead}>
        <div className={s.detailPanelCode}>
          <code className={s.detailCode}>{req.trackingCode}</code>
          <CopyButton text={req.trackingCode} label="کپی" className={s.copyBtn} />
        </div>
        <button type="button" onClick={onClose} className={s.detailClose} aria-label="بستن جزئیات">
          <XCircle size={14} aria-hidden />
        </button>
      </header>

      <div className={s.detailMeta}>
        <span className={cn(s.detailStatusBadge, s[`statusBadge--${meta.cssKey}`])}>
          <meta.icon size={10} aria-hidden />
          {meta.label}
        </span>
        {req.urgency === 'URGENT' && (
          <span className={s.urgentTag}>
            <Zap size={10} aria-hidden />
            فوری
          </span>
        )}
        <span className={s.detailService}>
          {SERVICE_LABELS[req.serviceType] ?? req.serviceType}
        </span>
      </div>

      <div className={s.detailAmount}>
        <span className={s.detailAmountLabel}>مبلغ</span>
        <span className={s.detailAmountValue}>{fmtAmount(req.amount, req.currency)}</span>
      </div>

      <div className={s.detailDates}>
        <div className={s.detailDateRow}>
          <CalendarClock size={11} aria-hidden />
          <span>ثبت:</span>
          <time className={s.detailDateVal}>{formatDateTime(req.createdAt)}</time>
        </div>
        <div className={s.detailDateRow}>
          <RefreshCw size={10} aria-hidden />
          <span>آخرین تغییر:</span>
          <time className={s.detailDateVal}>{formatDateTime(req.updatedAt)}</time>
        </div>
        {req.estimatedCompletionAt && (
          <div className={cn(s.detailDateRow, s.detailDateRowEta)}>
            <CheckCircle2 size={11} aria-hidden />
            <span>تخمین تکمیل:</span>
            <time className={s.detailDateVal}>{formatDate(req.estimatedCompletionAt)}</time>
          </div>
        )}
      </div>

      {req.adminNotes && (
        <div className={s.adminNote} role="note">
          <div className={s.adminNoteHead}>
            <AlertCircle size={10} aria-hidden />
            یادداشت پشتیبانی
          </div>
          <p className={s.adminNoteText}>{req.adminNotes}</p>
        </div>
      )}

      {(localStatus === 'PENDING' || cancelDone) && (
        <div className={s.cancelSection}>
          {canCancel && cancelMinsLeft !== null && (
            <div className={s.cancelTimer}>
              <Clock size={11} aria-hidden />
              <span>{fp(cancelMinsLeft)} دقیقه تا پایان مهلت لغو</span>
            </div>
          )}
          {cancelDone && (
            <div className={s.cancelSuccess}>
              <CheckCircle2 size={11} aria-hidden />
              سفارش با موفقیت لغو شد.
            </div>
          )}
          {canCancel && !cancelDone && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className={s.btnCancel}
            >
              {cancelling ? (
                <span className={s.spinSm} aria-hidden />
              ) : (
                <Ban size={11} aria-hidden />
              )}
              لغو درخواست
            </button>
          )}
          {!canCancel && localStatus === 'PENDING' && !cancelDone && (
            <p className={s.cancelExpired}>مهلت لغو به پایان رسیده است.</p>
          )}
          {cancelErr && (
            <p className={s.cancelErr} role="alert">
              <AlertCircle size={10} aria-hidden />
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

      {/* سفارش مجدد — همان سرویس با deep-link آماده (نرخ لحظه‌ای دوباره قفل می‌شود) */}
      {(localStatus === 'COMPLETED' ||
        localStatus === 'CANCELLED' ||
        localStatus === 'EXPIRED') && (
        <a
          href={`/services/order?service=${req.serviceType}&amount=${encodeURIComponent(req.amount)}&currency=${req.currency}`}
          className={s.repeatLink}
        >
          <RotateCcw size={12} aria-hidden />
          سفارش مجدد با نرخ جدید
        </a>
      )}

      {req.statusLogs.length > 0 && (
        <div className={s.timeline}>
          <div className={s.timelineHead}>
            <History size={11} aria-hidden />
            تایم‌لاین
          </div>
          <ol className={s.timelineList}>
            {req.statusLogs.map((log, i) => {
              const lm = STATUS_META[log.toStatus] ?? STATUS_META.PENDING;
              return (
                <li
                  key={`${log.createdAt}-${i}`}
                  className={s.timelineItem}
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <span
                    className={cn(s.tlDot, s[`tlDot--${lm.cssKey}`])}
                    data-first={i === 0 ? 'true' : undefined}
                    aria-hidden
                  />
                  <div className={s.tlContent}>
                    <span className={s.tlStatus}>{lm.label}</span>
                    {log.note && <span className={s.tlNote}>{log.note}</span>}
                    <time className={s.tlTime}>{formatDateTime(log.createdAt)}</time>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </aside>
  );
}

// ─── Ticket Row ───────────────────────────────────────────────────────────── //
function TicketRow({
  req,
  isActive,
  onSelect,
  index,
}: {
  req: MyRequest;
  isActive: boolean;
  onSelect: () => void;
  index: number;
}) {
  const meta = STATUS_META[req.status] ?? STATUS_META.PENDING;
  const StatusIcon = meta.icon;
  const isUrgent = req.urgency === 'URGENT';

  return (
    <li
      className={cn(s.ticketRow, isActive && s.ticketRowActive, s[`ticketRow--${meta.cssKey}`])}
      style={{ animationDelay: `${Math.min(index, 10) * 22}ms` }}
    >
      <button
        type="button"
        className={s.ticketRowBtn}
        onClick={onSelect}
        aria-pressed={isActive}
        aria-label={`${req.trackingCode} — ${meta.label}`}
      >
        {/* Live rail */}
        <span className={s.liveRail} aria-hidden>
          {(req.status === 'PENDING' || req.status === 'IN_PROGRESS') && (
            <span className={s.liveRailPulse} />
          )}
        </span>

        {/* Service icon */}
        <span className={cn(s.ticketRowIcon, s[`ticketRowIcon--${meta.cssKey}`])} aria-hidden>
          <Wallet size={13} />
        </span>

        {/* Main info */}
        <div className={s.ticketRowMain}>
          <div className={s.ticketRowTop}>
            <span className={s.ticketCode}>{req.trackingCode}</span>
            {isUrgent && (
              <span className={s.urgentDot} title="فوری" aria-label="فوری">
                <Zap size={8} aria-hidden />
              </span>
            )}
          </div>
          <div className={s.ticketRowBottom}>
            <span className={cn(s.ticketStatusBadge, s[`statusBadge--${meta.cssKey}`])}>
              <StatusIcon size={9} aria-hidden />
              {meta.label}
            </span>
            <span className={s.ticketService}>
              {SERVICE_LABELS[req.serviceType] ?? req.serviceType}
            </span>
          </div>
        </div>

        {/* Right: amount + date */}
        <div className={s.ticketRowRight}>
          <span className={s.ticketAmount}>{fmtAmount(req.amount, req.currency)}</span>
          <span className={s.ticketDate}>{relTime(req.createdAt)}</span>
        </div>

        {/* Chevron */}
        <ChevronLeft
          size={12}
          className={cn(s.ticketChevron, isActive && s.ticketChevronActive)}
          aria-hidden
        />
      </button>
    </li>
  );
}

// ─── Ticket Group Collapsible ─────────────────────────────────────────────── //
function TicketGroup({
  title,
  count,
  accent,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  accent: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn(s.ticketGroup, s[`ticketGroup--${accent}`])}>
      <button
        type="button"
        className={s.ticketGroupHead}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <span className={s.ticketGroupIcon} aria-hidden>
          {icon}
        </span>
        <span className={s.ticketGroupTitle}>{title}</span>
        <span className={s.ticketGroupCount}>{fp(count)}</span>
        <ChevronDown
          size={12}
          className={cn(s.ticketGroupChevron, open && s.ticketGroupChevronOpen)}
          aria-hidden
        />
      </button>
      {open && <ul className={s.ticketList}>{children}</ul>}
    </div>
  );
}

// ─── Claim Guest Panel ────────────────────────────────────────────────────── //
function ClaimPanel({ onClaimed }: { onClaimed: () => void }) {
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const reset = () => {
    setCode('');
    setMsg('');
    setIsErr(false);
    setNeedsOtp(false);
    setOtpCode('');
    setOtpTimer(0);
  };

  const sendOtp = async () => {
    setOtpSending(true);
    const res = await issueServiceOtp({ email: otpEmail, trackingCode: trackingForOtp });
    setOtpSending(false);
    if (res.success) setOtpTimer(60);
    else {
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
      const otpRes = await issueServiceOtp({
        email: res.data.email,
        trackingCode: code.trim().toUpperCase(),
      });
      if (otpRes.success) setOtpTimer(60);
      return;
    }
    setMsg('سفارش با موفقیت به حساب شما اضافه شد!');
    setIsErr(false);
    timerRef.current = setTimeout(() => {
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
      timerRef.current = setTimeout(() => {
        setOpen(false);
        onClaimed();
      }, 1200);
    } else {
      setMsg(res.error.message);
      setIsErr(true);
    }
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
        <span className={s.claimToggleLabel}>اتصال سفارش مهمان</span>
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
                کد پیگیری سفارش مهمان را وارد کنید تا به حساب شما متصل شود.
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
                  aria-label="کد پیگیری مهمان"
                />
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={loading || !code.trim()}
                  className={s.claimBtn}
                >
                  {loading ? (
                    <span className={s.spinSm} aria-hidden />
                  ) : (
                    <>
                      <Link2 size={11} aria-hidden />
                      اتصال
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={s.claimDesc}>
                کد ۶ رقمی ارسال‌شده به <strong dir="ltr">{otpEmail}</strong> را وارد کنید:
              </p>
              <div className={s.claimRow}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className={s.claimInput}
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
                    <span className={s.spinSm} aria-hidden />
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
                    ارسال مجدد در {fp(otpTimer)} ثانیه
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpSending}
                    className={s.otpResend}
                  >
                    <RotateCcw size={10} aria-hidden />
                    ارسال مجدد
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

// ─── Skeleton ─────────────────────────────────────────────────────────────── //
function TicketSkeleton() {
  return (
    <ul className={s.ticketList} aria-busy>
      {(['s1', 's2', 's3', 's4'] as const).map((k) => (
        <li key={k} className={s.ticketSkeleton} aria-hidden />
      ))}
    </ul>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────── //
export default function MyRequestsClient() {
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
    if (res.success && res.data) setStats(res.data);
  }, []);

  const fetchRequests = useCallback(async (p: number, status: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const result = await getMyServiceRequests({ page: p, limit: 10, status });
    if (result.success && result.data) {
      const d = result.data as {
        requests: MyRequest[];
        pagination: { totalPages: number; total: number };
      };
      setRequests(d.requests);
      setTotalPages(d.pagination.totalPages ?? 1);
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
  }, [fetchStats]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = requests;
    if (q)
      list = list.filter(
        (r) =>
          r.trackingCode.toLowerCase().includes(q) ||
          (SERVICE_LABELS[r.serviceType] ?? r.serviceType).toLowerCase().includes(q),
      );
    if (urgency !== 'ALL') list = list.filter((r) => r.urgency === urgency);
    return [...list].sort((a, b) => {
      if (sort === 'urgent' && a.urgency !== b.urgency) return a.urgency === 'URGENT' ? -1 : 1;
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      if (sort === 'newest') return bt - at;
      if (sort === 'oldest') return at - bt;
      if (sort === 'amount-desc') return Number(b.amount) - Number(a.amount);
      if (sort === 'amount-asc') return Number(a.amount) - Number(b.amount);
      return bt - at;
    });
  }, [requests, search, urgency, sort]);

  const grouped = useMemo(() => {
    if (group === 'none') return [{ key: 'ALL', items: visible }];
    if (group === 'status')
      return STATUS_ORDER.map((s) => ({
        key: s,
        items: visible.filter((r) => r.status === s),
      })).filter((g) => g.items.length > 0);
    const map = new Map<string, MyRequest[]>();
    for (const r of visible) {
      const cur = map.get(r.serviceType) ?? [];
      cur.push(r);
      map.set(r.serviceType, cur);
    }
    return Array.from(map.entries())
      .map(([k, items]) => ({ key: k, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [group, visible]);

  const successRate =
    stats.total > 0
      ? Math.round((stats.completed / Math.max(1, stats.total - stats.cancelled)) * 100)
      : 0;

  const handleCancelled = useCallback(() => {
    fetchRequests(pageRef.current, filterRef.current);
    fetchStats();
  }, [fetchRequests, fetchStats]);
  const handleToggle = useCallback(
    (id: string) => setActiveId((prev) => (prev === id ? null : id)),
    [],
  );
  const handleFilterChange = useCallback((s: FilterStatus) => {
    setFilterStatus(s);
    setPage(1);
  }, []);
  const handleRefresh = useCallback(() => {
    fetchRequests(pageRef.current, filterRef.current, true);
    fetchStats();
  }, [fetchRequests, fetchStats]);

  const activeReq = useMemo(
    () => requests.find((r) => r.id === activeId) ?? null,
    [requests, activeId],
  );
  const noResults = !loading && !error && requests.length > 0 && visible.length === 0;

  const groupAccent: Record<string, string> = {
    PENDING: 'pending',
    IN_PROGRESS: 'progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ALL: 'neutral',
  };
  const groupIcon = (k: string) => {
    if (STATUS_META[k]) {
      const I = STATUS_META[k].icon;
      return <I size={11} />;
    }
    return <Wallet size={11} />;
  };
  const groupTitle = (k: string) =>
    STATUS_GROUP_LABELS[k as FilterStatus] ??
    SERVICE_LABELS[k] ??
    (k === 'ALL' ? 'همه درخواست‌ها' : k);

  let globalIdx = 0;

  return (
    <section className={s.workspace} aria-labelledby="myrequests-title">
      <PageHeader
        variant="compact"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'درخواست‌های من' }]}
        title="درخواست‌های من"
        description="مرکز پیگیری و مدیریت سفارش‌های خدماتی"
        icon="clipboard-list"
        accent="emerald"
        actions={
          <a href="/money-transfer" className={s.newBtn}>
            <Plus size={14} aria-hidden />
            درخواست جدید
          </a>
        }
      />

      {/* ── ZONE A: Orbital Hero ──────────────────────────────────────── */}
      <div className={s.heroZone}>
        <div className={s.heroLeft}>
          <OrbitalRing
            total={stats.total}
            pending={stats.pending}
            inProgress={stats.inProgress}
            completed={stats.completed}
            cancelled={stats.cancelled}
            activeFilter={filterStatus}
            onFilterChange={handleFilterChange}
            loading={loading}
            successRate={successRate}
          />
        </div>

        <div className={s.heroRight}>
          <GeometricField density="min" className={s.heroGeo} />
          {/* KPI vertical stack */}
          {[
            { label: 'کل درخواست‌ها', value: stats.total, icon: Wallet, cssKey: 'neutral' },
            {
              label: 'در حال انجام',
              value: stats.inProgress,
              icon: TrendingUp,
              cssKey: 'progress',
            },
            {
              label: 'نرخ موفقیت',
              value: `${fp(successRate)}٪`,
              icon: CheckCircle2,
              cssKey: 'completed',
            },
            {
              label: 'نیاز به توجه',
              value: requests.filter((r) => r.urgency === 'URGENT' && r.status === 'PENDING')
                .length,
              icon: Flame,
              cssKey: 'pending',
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className={cn(s.kpiCard, s[`kpiCard--${kpi.cssKey}`])}>
                <div className={s.kpiCardHead}>
                  <span className={cn(s.kpiCardIcon, s[`kpiCardIcon--${kpi.cssKey}`])} aria-hidden>
                    <Icon size={13} />
                  </span>
                  <span className={s.kpiCardLabel}>{kpi.label}</span>
                </div>
                <span className={s.kpiCardValue}>
                  {loading ? <span className={s.pulse} aria-hidden /> : String(kpi.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ZONE B: Heatmap + Volume ──────────────────────────────────── */}
      <div className={s.analyticsZone}>
        <ActivityHeatmap requests={requests} />
        <VolumeCompact requests={requests} />
      </div>

      {/* ── ZONE C: Command Toolbar ───────────────────────────────────── */}
      <CommandToolbar
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

      {/* ── Claim Panel ───────────────────────────────────────────────── */}
      <ClaimPanel
        onClaimed={() => {
          fetchRequests(1, filterStatus);
          fetchStats();
        }}
      />

      {/* ── ZONE D: Ticket Rail ───────────────────────────────────────── */}
      <div className={cn(s.railZone, activeId && s.railZoneSplit)}>
        <div className={s.ticketRail}>
          {loading && <TicketSkeleton />}
          {!loading && error && (
            <div className={s.errorBox} role="alert">
              <AlertCircle size={14} aria-hidden />
              {error}
            </div>
          )}
          {!loading && !error && requests.length === 0 && (
            <MillionDollarEmpty
              variant="inbox"
              tone="primary"
              eyebrow="مرکز درخواست‌ها"
              title="هنوز درخواستی ثبت نکرده‌اید"
              description="اولین درخواست‌تان را از صفحه خدمات ثبت کنید."
              primaryAction={
                <a href="/money-transfer" className={s.emptyCta}>
                  <Plus size={13} aria-hidden />
                  ثبت اولین درخواست
                </a>
              }
            />
          )}
          {noResults && (
            <div className={s.noResults}>
              <Search size={15} aria-hidden />
              <div>
                <p className={s.noResultsTitle}>نتیجه‌ای یافت نشد.</p>
                <p className={s.noResultsSub}>فیلتر یا جستجو را تغییر دهید.</p>
              </div>
              <button
                type="button"
                className={s.clearBtn}
                onClick={() => {
                  setSearch('');
                  setUrgency('ALL');
                }}
              >
                پاک کردن
              </button>
            </div>
          )}
          {!loading && !error && visible.length > 0 && (
            <>
              {grouped.map((g) => (
                <TicketGroup
                  key={g.key}
                  title={groupTitle(g.key)}
                  count={g.items.length}
                  accent={groupAccent[g.key] ?? 'neutral'}
                  defaultOpen
                  icon={groupIcon(g.key)}
                >
                  {g.items.map((req) => {
                    const idx = globalIdx++;
                    return (
                      <TicketRow
                        key={req.id}
                        req={req}
                        isActive={activeId === req.id}
                        onSelect={() => handleToggle(req.id)}
                        index={idx}
                      />
                    );
                  })}
                </TicketGroup>
              ))}
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
                  <span className={s.pageIndicator}>
                    {fp(page)} / {fp(totalPages)}
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
        </div>

        {/* Inline detail panel — slides in when a ticket is active */}
        {activeReq && (
          <TicketDetailPanel
            req={activeReq}
            onClose={() => setActiveId(null)}
            onCancelled={handleCancelled}
          />
        )}
      </div>
    </section>
  );
}
