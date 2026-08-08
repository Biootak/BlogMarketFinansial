'use client';

/**
 * RequestsContent — «مرکز فرماندهی» Mission Control 2026
 * -----------------------------------------------------------------------------
 * ساختار:
 *  §1. KPI Bento Strip   — ۴ کارت نامتقارن با tint + accent top-border
 *  §2. Command Toolbar   — glass sticky + جستجو + filter chips + CTA
 *  §3. Orbit Groups      — گروه‌بندی active/closed با rail رنگی
 *  §4. Empty Signal      — empty state با inline prompt
 */

import type {
  CustomerRequestListItem,
  CustomerRequestStats,
  CustomerRequestType,
} from '@/actions/customer-portal';
import { cancelCustomerRequest } from '@/actions/customer-portal';
import { faNum, relativeTime } from '@/app/(customer)/customer/_lib/customer-formatters';
import {
  EmptyHint,
  StatusDot,
  StatusPill,
  type StatusVariant,
} from '@/app/(customer)/customer/_lib/customer-ui';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileText,
  Flame,
  Gauge,
  Loader2,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  XIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import s from './RequestsContent.module.css';

interface Props {
  rows: CustomerRequestListItem[];
  stats: CustomerRequestStats;
}

type FilterStatus = 'ALL' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// ─── Constants ──────────────────────────────────────────────────────────── //

const STATUS_VARIANT: Record<string, StatusVariant> = {
  PENDING: 'pending',
  IN_REVIEW: 'progress',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'cancelled',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'در انتظار',
  IN_REVIEW: 'در حال بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
};

const TYPE_ICON: Record<CustomerRequestType, typeof Wallet> = {
  ACCOUNT_NEW: Wallet,
  ACCOUNT_UNFREEZE: ShieldCheck,
  TRANSFER_INITIATE: Send,
  LIMIT_INCREASE: Gauge,
  OTHER: FileText,
};

const FILTER_OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: 'ALL', label: 'همه' },
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'IN_REVIEW', label: 'در حال بررسی' },
  { value: 'APPROVED', label: 'تأیید شده' },
  { value: 'REJECTED', label: 'رد شده' },
  { value: 'CANCELLED', label: 'لغو شده' },
];

// ─── Component ──────────────────────────────────────────────────────────── //

export default function RequestsContent({ rows, stats }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // ─── Filtered rows ──────────────────────────────────────────── //
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'ALL' && r.status !== filter) return false;
      if (!q) return true;
      if (r.trackingCode.toLowerCase().includes(q)) return true;
      if (r.typeLabel.includes(q)) return true;
      if (r.note?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rows, filter, search]);

  // ─── Group: active (pending/in_review) vs closed (approved/rejected/cancelled) ── //
  const groups = useMemo(() => {
    const active = filteredRows.filter((r) => r.status === 'PENDING' || r.status === 'IN_REVIEW');
    const closed = filteredRows.filter(
      (r) => r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'CANCELLED',
    );
    return { active, closed };
  }, [filteredRows]);

  const [confirmTarget, setConfirmTarget] = useState<{ id: string; code: string } | null>(null);

  function handleCancel(requestId: string, trackingCode: string) {
    setConfirmTarget({ id: requestId, code: trackingCode });
  }

  function doCancel() {
    if (!confirmTarget) return;
    const { id } = confirmTarget;
    setConfirmTarget(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await cancelCustomerRequest(id);
      setPendingId(null);
      if (!res.success) {
        toast({ variant: 'destructive', title: res.error ?? 'خطا در لغو درخواست' });
        return;
      }
      toast({ title: 'درخواست لغو شد' });
      router.refresh();
    });
  }

  return (
    <div className={s.root} dir="rtl">
      {/* ═════════════════════════════════════════════════════════════════
          §1. KPI STRIP
          ═════════════════════════════════════════════════════════════════ */}
      <section className={s.kpiStrip} aria-label="آمار درخواست‌ها">
        <KpiCard
          variant="primary"
          label="کل درخواست‌ها"
          value={stats.total}
          sub={`${faNum(stats.last7d)} مورد در ۷ روز اخیر`}
          icon={Sparkles}
        />
        <KpiCard
          variant="warning"
          label="در انتظار"
          value={stats.pending}
          sub="هنوز بررسی نشده"
          icon={Clock}
        />
        <KpiCard
          variant="info"
          label="در حال بررسی"
          value={stats.inReview}
          sub="صرافی در حال رسیدگی"
          icon={Flame}
        />
        <KpiCard
          variant="success"
          label="تأیید شده"
          value={stats.approved}
          sub="آماده استفاده"
          icon={CheckCircle2}
        />
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          §2. FILTER BAR
          ═════════════════════════════════════════════════════════════════ */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={12} className={s.searchIcon} aria-hidden />
          <input
            type="search"
            className={s.searchInput}
            placeholder="جستجو در کد پیگیری، نوع، یا یادداشت…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="جستجو"
          />
        </div>

        <div className={s.filterChips} aria-label="فیلتر وضعیت">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={filter === opt.value}
              data-active={filter === opt.value ? 'true' : undefined}
              onClick={() => setFilter(opt.value)}
              className={s.filterChip}
            >
              {opt.label}
              {opt.value !== 'ALL' && (
                <span className={s.filterChipCount}>
                  {stats[opt.value.toLowerCase() as keyof CustomerRequestStats] as number}
                </span>
              )}
            </button>
          ))}
        </div>

        <Link href="/customer/requests/new" className={s.ctaNew}>
          <Plus size={12} aria-hidden />
          درخواست جدید
        </Link>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          §3. GROUPED LIST
          ═════════════════════════════════════════════════════════════════ */}
      {filteredRows.length === 0 ? (
        <EmptyHint
          icon={rows.length === 0 ? FileText : Search}
          title={rows.length === 0 ? 'هنوز درخواستی ثبت نکرده‌اید' : 'نتیجه‌ای یافت نشد'}
          description={
            rows.length === 0
              ? 'برای شروع، اولین درخواست خود را به صرافی ارسال کنید'
              : 'فیلتر یا جستجوی خود را تغییر دهید'
          }
          action={
            rows.length === 0 ? (
              <Link href="/customer/requests/new" className={s.ctaNew}>
                <Plus size={12} aria-hidden />
                اولین درخواست
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className={s.groups}>
          {groups.active.length > 0 && (
            <RequestGroup
              title="در جریان"
              count={groups.active.length}
              rows={groups.active}
              onCancel={handleCancel}
              pendingId={pendingId}
            />
          )}
          {groups.closed.length > 0 && (
            <RequestGroup
              title="بسته شده"
              count={groups.closed.length}
              rows={groups.closed}
              onCancel={handleCancel}
              pendingId={pendingId}
            />
          )}
        </div>
      )}

      {/* ─── Confirm cancel dialog ─────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        onConfirm={doCancel}
        title="لغو درخواست"
        description={
          confirmTarget
            ? `درخواست با کد ${confirmTarget.code} لغو شود؟ این عمل قابل بازگشت نیست.`
            : ''
        }
        confirmLabel="بله، لغو شود"
        cancelLabel="انصراف"
        variant="danger"
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────── //

interface KpiCardProps {
  label: string;
  value: number;
  sub: string;
  icon: typeof Sparkles;
  variant: 'primary' | 'warning' | 'info' | 'success';
}

function KpiCard({ label, value, sub, icon: Icon, variant }: KpiCardProps) {
  const dotVariant: StatusVariant =
    variant === 'primary' ? 'approved' : variant === 'info' ? 'neutral' : variant;
  return (
    <article className={s.kpiCard} data-variant={variant}>
      <div className={s.kpiHead}>
        <span className={s.kpiIcon} aria-hidden>
          <Icon size={13} />
        </span>
        <span className={s.kpiLabel}>{label}</span>
        <StatusDot variant={dotVariant} pulse={variant === 'warning'} />
      </div>
      <div className={s.kpiValue}>{faNum(value)}</div>
      <div className={s.kpiSub}>{sub}</div>
    </article>
  );
}

interface RequestGroupProps {
  title: string;
  count: number;
  rows: CustomerRequestListItem[];
  onCancel: (id: string, trackingCode: string) => void;
  pendingId: string | null;
}

function RequestGroup({ title, count, rows, onCancel, pendingId }: RequestGroupProps) {
  return (
    <section className={s.group} aria-label={title}>
      <header className={s.groupHead}>
        <span className={s.groupLabel}>{title}</span>
        <span className={s.groupCount}>{faNum(count)}</span>
      </header>
      <ul className={s.list}>
        {rows.map((r, i) => {
          const Icon = TYPE_ICON[r.type] ?? CircleDollarSign;
          const variant = STATUS_VARIANT[r.status] ?? 'neutral';
          const isCancellable = r.status === 'PENDING' || r.status === 'IN_REVIEW';
          const isPending = pendingId === r.id;

          return (
            <li
              key={r.id}
              className={s.row}
              data-status={r.status}
              style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
            >
              <span className={s.rail} data-status={r.status} aria-hidden />

              <Link
                href={`/customer/requests/${r.id}`}
                className={s.rowLink}
                aria-label={`${r.typeLabel} — کد ${r.trackingCode} — وضعیت ${STATUS_LABEL[r.status]}`}
              >
                <span className={s.rowIcon} data-status={r.status} aria-hidden>
                  <Icon size={15} />
                </span>

                <div className={s.rowMain}>
                  <div className={s.rowTopRow}>
                    <span className={s.rowType}>{r.typeLabel}</span>
                    <code className={s.rowCode}>{r.trackingCode}</code>
                  </div>
                  <div className={s.rowBottomRow}>
                    <StatusPill variant={variant}>{STATUS_LABEL[r.status] ?? r.status}</StatusPill>
                    <span className={s.rowMeta}>
                      <Clock size={9} aria-hidden />
                      {relativeTime(r.createdAt)}
                    </span>
                    {r.note && (
                      <span className={s.rowNote} title={r.note}>
                        {r.note.length > 48 ? `${r.note.slice(0, 48)}…` : r.note}
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              {isCancellable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCancel(r.id, r.trackingCode);
                  }}
                  disabled={isPending}
                  className={s.cancelBtn}
                  aria-label={`لغو درخواست ${r.trackingCode}`}
                >
                  {isPending ? (
                    <Loader2 size={11} className={s.spinner} aria-hidden />
                  ) : (
                    <XIcon size={11} aria-hidden />
                  )}
                  لغو
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
