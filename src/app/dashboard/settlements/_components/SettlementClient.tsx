'use client';

/**
 * SettlementClient — 2026 Million-Dollar Settlement Management
 *
 * طراحی: Mercury × Ramp × Linear — Glass KPI cards, batch confirm,
 *         timeline detail sheet, sticky frosted toolbar.
 *
 * جریان کاربر:
 *  1. KPI Cards → وضعیت کلی یک نگاه
 *  2. Tab filter → محدود کردن نمای جدول
 *  3. Checkbox batch → تأیید گروهی با ConfirmDialog
 *  4. Row actions → تأیید/پرداخت تک با ConfirmDialog
 *  5. Eye → Detail Sheet با timeline کامل
 */

import { type SettlementRow, approveSettlement, markSettlementPaid } from '@/actions/settlement';
import { ConfirmDialog, MillionDollarEmpty, PageHeader } from '@/components/Dashboard/primitives';
import cm from '@/components/Dashboard/primitives/CenterModal.module.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle as SheetTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  BadgeCheck,
  Banknote,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  Hash,
  Layers,
  ListFilter,
  Receipt,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './SettlementClient.module.css';

type Props = { settlements: SettlementRow[] };

type TabValue = 'all' | 'PENDING' | 'APPROVED' | 'PAID';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأیید شده',
  PAID: 'پرداخت شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
};

const STATUS_VARIANT: Record<string, string> = {
  PENDING: s.badgePending,
  APPROVED: s.badgeApproved,
  PAID: s.badgePaid,
  REJECTED: s.badgeCancelled,
  CANCELLED: s.badgeCancelled,
};

function fmtAFN(val: string): string {
  const n = Number(val) / 100;
  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(n);
  return `${formatted} AFN`;
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('');
}

/** Deterministic hue from exchange name — gives each exchange its own avatar color */
function nameHue(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function downloadCsv(rows: SettlementRow[]) {
  const header = 'صرافی,از تاریخ,تا تاریخ,حجم,معاملات,کارمزد پلتفرم,خالص صراف,وضعیت';
  const csvRows = rows.map((r) =>
    [
      r.exchangeName,
      fmtDate(r.periodStart),
      fmtDate(r.periodEnd),
      fmtAFN(r.totalVolume),
      r.dealCount,
      fmtAFN(r.platformFee),
      fmtAFN(r.exchangeNet),
      STATUS_LABELS[r.status] ?? r.status,
    ]
      .map((v) => `"${v}"`)
      .join(','),
  );
  const csv = [header, ...csvRows].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `settlements-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string; // CSS custom property accent value
  delay?: number;
  highlight?: boolean;
}

function KpiCard({ icon: Icon, label, value, accent, delay = 0, highlight }: KpiCardProps) {
  return (
    <div
      className={`${s.kpiCard} ${highlight ? s.kpiCardHighlight : ''}`}
      style={
        {
          '--kpi-accent': accent,
          '--kpi-delay': `${delay}ms`,
        } as React.CSSProperties
      }
    >
      <div className={s.kpiIconWrap}>
        <Icon size={16} aria-hidden className={s.kpiIcon} />
      </div>
      <div className={s.kpiBody}>
        <span className={s.kpiVal}>{value}</span>
        <span className={s.kpiLabel}>{label}</span>
      </div>
    </div>
  );
}

// ─── Exchange Avatar ────────────────────────────────────────────────────────────

function ExchangeAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const hue = nameHue(name);
  return (
    <span
      className={s.avatar}
      style={
        {
          '--av-hue': `${hue}`,
          '--av-size': `${size}px`,
        } as React.CSSProperties
      }
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}

// ─── Timeline Step ─────────────────────────────────────────────────────────────

function TimelineStep({
  icon: Icon,
  label,
  date,
  done,
  active,
}: {
  icon: React.ElementType;
  label: string;
  date?: string | null;
  done: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`${s.timelineStep} ${done ? s.timelineDone : ''} ${active ? s.timelineActive : ''}`}
    >
      <div className={s.timelineDot}>
        <Icon size={12} aria-hidden />
      </div>
      <div className={s.timelineText}>
        <span className={s.timelineLabel}>{label}</span>
        {date && <span className={s.timelineDate}>{date}</span>}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function SettlementClient({ settlements: initial }: Props) {
  const [rows, setRows] = useState<SettlementRow[]>(initial);
  const [tab, setTab] = useState<TabValue>('all');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [detailRow, setDetailRow] = useState<SettlementRow | null>(null);

  // Confirm states
  const [confirmApprove, setConfirmApprove] = useState<{ id: string; name: string } | null>(null);
  const [confirmPaid, setConfirmPaid] = useState<{ id: string; name: string } | null>(null);
  const [confirmBatch, setConfirmBatch] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => (tab === 'all' ? rows : rows.filter((r) => r.status === tab)),
    [rows, tab],
  );

  const pendingRows = useMemo(() => rows.filter((r) => r.status === 'PENDING'), [rows]);
  const approvedRows = useMemo(() => rows.filter((r) => r.status === 'APPROVED'), [rows]);
  const paidRows = useMemo(() => rows.filter((r) => r.status === 'PAID'), [rows]);

  const kpiTotalPaid = useMemo(
    () => paidRows.reduce((sum, r) => sum + Number(r.exchangeNet), 0),
    [paidRows],
  );
  const kpiTotalVolume = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.totalVolume), 0),
    [rows],
  );

  const pendingInFiltered = useMemo(
    () => filtered.filter((r) => r.status === 'PENDING'),
    [filtered],
  );
  const allPendingSelected =
    pendingInFiltered.length > 0 && pendingInFiltered.every((r) => selectedRows.has(r.id));
  const somePendingSelected = pendingInFiltered.some((r) => selectedRows.has(r.id));

  // ── Actions ───────────────────────────────────────────────────────────────────

  const doApprove = useCallback((id: string) => {
    startTransition(async () => {
      setError(null);
      const res = await approveSettlement(id);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED' } : r)));
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDetailRow((prev) => (prev?.id === id ? { ...prev, status: 'APPROVED' } : prev));
    });
  }, []);

  const doPaid = useCallback((id: string) => {
    startTransition(async () => {
      setError(null);
      const res = await markSettlementPaid(id);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'PAID', paidAt: new Date() } : r)),
      );
      setDetailRow((prev) =>
        prev?.id === id ? { ...prev, status: 'PAID', paidAt: new Date() } : prev,
      );
    });
  }, []);

  const doBatchApprove = useCallback(() => {
    const ids = Array.from(selectedRows);
    startTransition(async () => {
      setError(null);
      for (const id of ids) {
        const res = await approveSettlement(id);
        if (!res.success) {
          setError(res.error.message);
          break;
        }
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED' } : r)));
      }
      setSelectedRows(new Set());
    });
  }, [selectedRows]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const pendingIds = pendingInFiltered.map((r) => r.id);
    setSelectedRows((prev) => {
      if (pendingIds.every((id) => prev.has(id))) return new Set();
      return new Set(pendingIds);
    });
  }, [pendingInFiltered]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={400}>
      <div className={s.root}>
        {/* ── PageHeader ── */}
        <PageHeader
          variant="compact"
          title="تسویه‌حساب صرافی‌ها"
          description="مدیریت و پرداخت دوره‌های تسویه پلتفرم"
          breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'تسویه‌حساب' }]}
          icon="layers"
          accent="emerald"
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadCsv(filtered)}
              className={s.exportBtn}
            >
              <Download size={14} aria-hidden />
              دانلود CSV
            </Button>
          }
        />

        {/* ── KPI Strip ── */}
        <div className={s.kpiStrip} aria-label="آمار کلی">
          <KpiCard
            icon={Layers}
            label="مجموع تسویه‌ها"
            value={fmtNum(rows.length)}
            accent="var(--nova-cyan)"
            delay={0}
          />
          <KpiCard
            icon={Clock}
            label="در انتظار تأیید"
            value={fmtNum(pendingRows.length)}
            accent="var(--ds-accent-amber)"
            delay={60}
            highlight={pendingRows.length > 0}
          />
          <KpiCard
            icon={BadgeCheck}
            label="تأیید شده"
            value={fmtNum(approvedRows.length)}
            accent="var(--nova-violet)"
            delay={120}
          />
          <KpiCard
            icon={Wallet}
            label="پرداخت شده"
            value={fmtAFN(String(kpiTotalPaid))}
            accent="var(--nova-emerald)"
            delay={180}
          />
          <KpiCard
            icon={TrendingUp}
            label="حجم کل"
            value={fmtAFN(String(kpiTotalVolume))}
            accent="var(--nova-rose)"
            delay={240}
          />
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className={s.errorBanner} role="alert" aria-live="assertive">
            <XCircle size={16} aria-hidden />
            <span>{error}</span>
            <button
              type="button"
              className={s.errorClose}
              onClick={() => setError(null)}
              aria-label="بستن خطا"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className={s.toolbar}>
          <div className={s.toolbarStart}>
            <ListFilter size={15} className={s.toolbarIcon} aria-hidden />
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as TabValue);
                setSelectedRows(new Set());
              }}
            >
              <TabsList className={s.tabsList}>
                <TabsTrigger value="all" className={s.tabsTrigger}>
                  همه
                  <span className={s.tabCount}>{fmtNum(rows.length)}</span>
                </TabsTrigger>
                <TabsTrigger value="PENDING" className={s.tabsTrigger}>
                  در انتظار
                  {pendingRows.length > 0 && (
                    <span className={`${s.tabCount} ${s.tabCountPending}`}>
                      {fmtNum(pendingRows.length)}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="APPROVED" className={s.tabsTrigger}>
                  تأیید شده
                  {approvedRows.length > 0 && (
                    <span className={s.tabCount}>{fmtNum(approvedRows.length)}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="PAID" className={s.tabsTrigger}>
                  پرداخت شده
                  {paidRows.length > 0 && (
                    <span className={s.tabCount}>{fmtNum(paidRows.length)}</span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className={s.toolbarEnd}>
            {selectedRows.size > 0 && (
              <div className={s.batchBar}>
                <span className={s.batchCount}>{fmtNum(selectedRows.size)} انتخاب شده</span>
                <Button
                  size="sm"
                  onClick={() => setConfirmBatch(true)}
                  disabled={isPending}
                  className={s.batchApproveBtn}
                >
                  <ClipboardCheck size={14} aria-hidden />
                  تأیید گروهی
                </Button>
                <button
                  type="button"
                  className={s.batchClear}
                  onClick={() => setSelectedRows(new Set())}
                  aria-label="پاکسازی انتخاب‌ها"
                >
                  <XCircle size={14} aria-hidden />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Table / Empty ── */}
        {filtered.length === 0 ? (
          <MillionDollarEmpty
            variant="chart"
            tone={tab === 'all' ? 'neutral' : 'amber'}
            eyebrow="تسویه‌حساب"
            title="تسویه‌ای ثبت نشده"
            description={
              tab === 'all'
                ? 'هنوز هیچ دورهٔ تسویه‌ای محاسبه نشده است. با اولین تراکنش، تسویه به‌صورت خودکار شکل می‌گیرد.'
                : `هیچ تسویه‌ای با وضعیت «${STATUS_LABELS[tab] ?? tab}» یافت نشد.`
            }
          />
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table} aria-label="تسویه‌حساب صرافی‌ها">
              <thead className={s.thead}>
                <tr>
                  {tab === 'PENDING' && (
                    <th className={`${s.th} ${s.thCheck}`} aria-label="انتخاب همه">
                      <label className={s.checkLabel} aria-label="انتخاب همه ردیف‌های در انتظار">
                        <input
                          type="checkbox"
                          className={s.checkbox}
                          checked={allPendingSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = somePendingSelected && !allPendingSelected;
                          }}
                          onChange={toggleSelectAll}
                          aria-label="انتخاب همه"
                        />
                      </label>
                    </th>
                  )}
                  <th className={s.th}>صرافی</th>
                  <th className={s.th}>دوره</th>
                  <th className={`${s.th} ${s.thNum}`}>حجم</th>
                  <th className={`${s.th} ${s.thNum}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={s.thIconLabel}>
                          <Hash size={11} aria-hidden />
                          معاملات
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>تعداد کل معاملات این دوره</TooltipContent>
                    </Tooltip>
                  </th>
                  <th className={`${s.th} ${s.thNum}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={s.thIconLabel}>
                          <Receipt size={11} aria-hidden />
                          کارمزد پلتفرم
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>مبلغ کسرشده از صراف برای پلتفرم</TooltipContent>
                    </Tooltip>
                  </th>
                  <th className={`${s.th} ${s.thNum}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={s.thIconLabel}>
                          <Banknote size={11} aria-hidden />
                          خالص صراف
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>مبلغ قابل پرداخت به صراف</TooltipContent>
                    </Tooltip>
                  </th>
                  <th className={s.th}>وضعیت</th>
                  <th className={`${s.th} ${s.thActions}`}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`${s.tr} ${selectedRows.has(row.id) ? s.trSelected : ''}`}
                    style={{ '--row-i': idx } as React.CSSProperties}
                    onClick={() => setDetailRow(row)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setDetailRow(row)}
                    aria-label={`تسویه ${row.exchangeName} — ${STATUS_LABELS[row.status] ?? row.status}`}
                  >
                    {/* Checkbox */}
                    {tab === 'PENDING' && (
                      <td
                        className={`${s.td} ${s.tdCheck}`}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {row.status === 'PENDING' && (
                          <label className={s.checkLabel}>
                            <input
                              type="checkbox"
                              className={s.checkbox}
                              checked={selectedRows.has(row.id)}
                              onChange={() => toggleSelect(row.id)}
                              aria-label={`انتخاب ${row.exchangeName}`}
                            />
                          </label>
                        )}
                      </td>
                    )}

                    {/* Exchange */}
                    <td className={s.td}>
                      <div className={s.exchangeCell}>
                        <ExchangeAvatar name={row.exchangeName} size={32} />
                        <div className={s.exchangeInfo}>
                          <span className={s.exchangeName}>{row.exchangeName}</span>
                          <span className={s.exchangeId} dir="ltr">
                            {row.exchangeId.slice(-8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Period */}
                    <td className={s.td}>
                      <span className={s.period}>
                        {fmtDate(row.periodStart)}
                        <span className={s.periodSep}>—</span>
                        {fmtDate(row.periodEnd)}
                      </span>
                    </td>

                    {/* Volume */}
                    <td className={`${s.td} ${s.tdNum}`}>
                      <span className={s.amount}>{fmtAFN(row.totalVolume)}</span>
                    </td>

                    {/* Deal count */}
                    <td className={`${s.td} ${s.tdNum}`}>
                      <span className={s.count}>{fmtNum(row.dealCount)}</span>
                    </td>

                    {/* Platform fee */}
                    <td className={`${s.td} ${s.tdNum}`}>
                      <span className={s.feeAmount}>{fmtAFN(row.platformFee)}</span>
                    </td>

                    {/* Exchange net */}
                    <td className={`${s.td} ${s.tdNum}`}>
                      <span className={s.netAmount}>{fmtAFN(row.exchangeNet)}</span>
                    </td>

                    {/* Status */}
                    <td className={s.td}>
                      <Badge
                        className={`${s.statusBadge} ${STATUS_VARIANT[row.status] ?? s.badgePending}`}
                      >
                        <span className={s.statusDot} aria-hidden />
                        {STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td
                      className={`${s.td} ${s.tdActions}`}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <div className={s.actionCell}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={s.iconBtn}
                              onClick={() => setDetailRow(row)}
                              aria-label="مشاهده جزئیات"
                            >
                              <Eye size={14} aria-hidden />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>جزئیات</TooltipContent>
                        </Tooltip>

                        {row.status === 'PENDING' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className={`${s.iconBtn} ${s.iconBtnApprove}`}
                                disabled={isPending}
                                onClick={() =>
                                  setConfirmApprove({ id: row.id, name: row.exchangeName })
                                }
                                aria-label="تأیید تسویه"
                              >
                                <ClipboardCheck size={14} aria-hidden />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>تأیید تسویه</TooltipContent>
                          </Tooltip>
                        )}

                        {row.status === 'APPROVED' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className={`${s.iconBtn} ${s.iconBtnPay}`}
                                disabled={isPending}
                                onClick={() =>
                                  setConfirmPaid({ id: row.id, name: row.exchangeName })
                                }
                                aria-label="ثبت پرداخت"
                              >
                                <Wallet size={14} aria-hidden />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>ثبت پرداخت</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Detail Modal ── */}
        <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
          <DialogPortal>
            <DialogOverlay className={cm.overlay} />
            <DialogPrimitive.Content dir="rtl" className={cm.panel} aria-label="جزئیات تسویه">
              {detailRow && (
                <>
                  {/* Header */}
                  <div className={cm.header}>
                    <ExchangeAvatar name={detailRow.exchangeName} size={44} />
                    <div className={s.sheetHeaderText}>
                      <SheetTitle className={s.sheetTitle}>{detailRow.exchangeName}</SheetTitle>
                      <p className={s.sheetPeriod}>
                        {fmtDate(detailRow.periodStart)} — {fmtDate(detailRow.periodEnd)}
                      </p>
                    </div>
                    <Badge
                      className={`${s.statusBadge} ${STATUS_VARIANT[detailRow.status] ?? s.badgePending} ${s.sheetBadge}`}
                    >
                      <span className={s.statusDot} aria-hidden />
                      {STATUS_LABELS[detailRow.status] ?? detailRow.status}
                    </Badge>
                    <DialogClose className={cm.close} aria-label="بستن">
                      <XCircle size={15} />
                    </DialogClose>
                  </div>

                  <div className={s.sheetBody}>
                    {/* Financial Summary */}
                    <section className={s.sheetSection} aria-label="خلاصه مالی">
                      <h3 className={s.sheetSectionTitle}>خلاصه مالی</h3>
                      <div className={s.finSummary}>
                        <div className={s.finItem}>
                          <TrendingUp size={14} className={s.finIcon} aria-hidden />
                          <span className={s.finLabel}>حجم کل</span>
                          <span className={s.finVal}>{fmtAFN(detailRow.totalVolume)}</span>
                        </div>
                        <div className={s.finItem}>
                          <Hash size={14} className={s.finIcon} aria-hidden />
                          <span className={s.finLabel}>تعداد معاملات</span>
                          <span className={s.finVal}>{fmtNum(detailRow.dealCount)}</span>
                        </div>
                        <div className={`${s.finItem} ${s.finItemFee}`}>
                          <Receipt size={14} className={s.finIcon} aria-hidden />
                          <span className={s.finLabel}>کارمزد پلتفرم</span>
                          <span className={`${s.finVal} ${s.finValFee}`}>
                            {fmtAFN(detailRow.platformFee)}
                          </span>
                        </div>
                        <div className={`${s.finItem} ${s.finItemNet}`}>
                          <Wallet size={14} className={s.finIcon} aria-hidden />
                          <span className={s.finLabel}>خالص قابل پرداخت</span>
                          <span className={`${s.finVal} ${s.finValNet}`}>
                            {fmtAFN(detailRow.exchangeNet)}
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Timeline */}
                    <section className={s.sheetSection} aria-label="تاریخچه">
                      <h3 className={s.sheetSectionTitle}>تاریخچه</h3>
                      <div className={s.timeline}>
                        <TimelineStep
                          icon={CircleDollarSign}
                          label="محاسبه تسویه"
                          date={fmtDate(detailRow.createdAt)}
                          done
                        />
                        <TimelineStep
                          icon={ClipboardCheck}
                          label="تأیید ادمین"
                          date={detailRow.approvedAt ? fmtDate(detailRow.approvedAt) : undefined}
                          done={!!detailRow.approvedAt}
                          active={detailRow.status === 'PENDING'}
                        />
                        <TimelineStep
                          icon={Wallet}
                          label="پرداخت نهایی"
                          date={detailRow.paidAt ? fmtDate(detailRow.paidAt) : undefined}
                          done={!!detailRow.paidAt}
                          active={detailRow.status === 'APPROVED'}
                        />
                      </div>
                    </section>

                    {/* Metadata */}
                    <section className={s.sheetSection} aria-label="اطلاعات تکمیلی">
                      <h3 className={s.sheetSectionTitle}>اطلاعات تکمیلی</h3>
                      <dl className={s.metaDl}>
                        <div className={s.metaRow}>
                          <dt className={s.metaKey}>شناسه صرافی</dt>
                          <dd className={s.metaVal} dir="ltr">
                            {detailRow.exchangeId.slice(-8)}
                          </dd>
                        </div>
                        <div className={s.metaRow}>
                          <dt className={s.metaKey}>ارز</dt>
                          <dd className={s.metaVal}>{detailRow.currency}</dd>
                        </div>
                        {detailRow.note && (
                          <div className={`${s.metaRow} ${s.metaRowFull}`}>
                            <dt className={s.metaKey}>یادداشت</dt>
                            <dd className={s.metaVal}>{detailRow.note}</dd>
                          </div>
                        )}
                      </dl>
                    </section>

                    {/* Actions */}
                    <div className={s.sheetActions}>
                      {detailRow.status === 'PENDING' && (
                        <Button
                          className={s.sheetActionApprove}
                          onClick={() => {
                            setDetailRow(null);
                            setConfirmApprove({ id: detailRow.id, name: detailRow.exchangeName });
                          }}
                          disabled={isPending}
                        >
                          <ClipboardCheck size={15} aria-hidden />
                          تأیید تسویه
                        </Button>
                      )}
                      {detailRow.status === 'APPROVED' && (
                        <Button
                          className={s.sheetActionPay}
                          onClick={() => {
                            setDetailRow(null);
                            setConfirmPaid({ id: detailRow.id, name: detailRow.exchangeName });
                          }}
                          disabled={isPending}
                        >
                          <Wallet size={15} aria-hidden />
                          ثبت پرداخت
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>

        {/* ── Confirm: single approve ── */}
        <ConfirmDialog
          open={!!confirmApprove}
          onOpenChange={(o) => !o && setConfirmApprove(null)}
          title="تأیید تسویه"
          description={`آیا از تأیید تسویه‌حساب صرافی «${confirmApprove?.name}» مطمئن هستید؟`}
          confirmLabel="بله، تأیید می‌کنم"
          loading={isPending}
          onConfirm={() => {
            if (confirmApprove) doApprove(confirmApprove.id);
            setConfirmApprove(null);
          }}
        />

        {/* ── Confirm: single paid ── */}
        <ConfirmDialog
          open={!!confirmPaid}
          onOpenChange={(o) => !o && setConfirmPaid(null)}
          title="ثبت پرداخت نهایی"
          description={`پرداخت به صرافی «${confirmPaid?.name}» ثبت شود؟ این عملیات قابل بازگشت نیست.`}
          confirmLabel="بله، پرداخت ثبت شود"
          variant="danger"
          loading={isPending}
          onConfirm={() => {
            if (confirmPaid) doPaid(confirmPaid.id);
            setConfirmPaid(null);
          }}
        />

        {/* ── Confirm: batch approve ── */}
        <ConfirmDialog
          open={confirmBatch}
          onOpenChange={(o) => !o && setConfirmBatch(false)}
          title={`تأیید گروهی ${fmtNum(selectedRows.size)} تسویه`}
          description="این عملیات همه تسویه‌های انتخاب‌شده را تأیید می‌کند."
          confirmLabel={`تأیید ${fmtNum(selectedRows.size)} مورد`}
          loading={isPending}
          onConfirm={() => {
            doBatchApprove();
            setConfirmBatch(false);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
