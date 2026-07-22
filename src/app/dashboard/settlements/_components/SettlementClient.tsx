'use client';

/**
 * SettlementClient — 2026 Million-dollar Settlement Management
 *
 * طراحی: Ramp/Mercury-inspired admin panel
 * ویژگی‌ها:
 * - KPI Strip با مجموع پرداخت‌شده + تعداد در انتظار + حجم کل
 * - Tabs فیلتر وضعیت
 * - Batch approve (checkbox + confirm)
 * - Export CSV
 * - Detail Sheet با محاسبات کامل
 * - spring micro-interactions
 */

import { approveSettlement, markSettlementPaid, type SettlementRow } from '@/actions/settlement';
import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { PageHeader } from '@/components/Dashboard/primitives/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  CircleDollarSign,
  Download,
  Eye,
} from 'lucide-react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './SettlementClient.module.css';

type Props = { settlements: SettlementRow[] };

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأیید شده',
  PAID: 'پرداخت شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو شده',
};

const STATUS_CSS: Record<string, string> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'cancelled',
  CANCELLED: 'cancelled',
};

function fmtAFN(val: string): string {
  return new Intl.NumberFormat('fa-AF', {
    style: 'currency',
    currency: 'AFN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val) / 100);
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `settlements-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettlementClient({ settlements: initial }: Props) {
  const [rows, setRows] = useState<SettlementRow[]>(initial);
  const [tab, setTab] = useState<'all' | 'PENDING' | 'APPROVED' | 'PAID'>('all');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [detailRow, setDetailRow] = useState<SettlementRow | null>(null);

  const filtered = useMemo(
    () => (tab === 'all' ? rows : rows.filter((r) => r.status === tab)),
    [rows, tab],
  );

  const pendingRows = useMemo(() => rows.filter((r) => r.status === 'PENDING'), [rows]);

  const kpiTotalPaid = useMemo(
    () => rows.filter((r) => r.status === 'PAID').reduce((s, r) => s + Number(r.exchangeNet), 0),
    [rows],
  );

  const kpiTotalVolume = useMemo(
    () => rows.reduce((s, r) => s + Number(r.totalVolume), 0),
    [rows],
  );

  const handleApprove = useCallback((id: string) => {
    startTransition(async () => {
      setError(null);
      const res = await approveSettlement(id);
      if (!res.success) { setError(res.error.message); return; }
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: 'APPROVED' } : r));
      setSelectedRows((prev) => { const s = new Set(prev); s.delete(id); return s; });
    });
  }, []);

  const handlePaid = useCallback((id: string) => {
    startTransition(async () => {
      setError(null);
      const res = await markSettlementPaid(id);
      if (!res.success) { setError(res.error.message); return; }
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: 'PAID' } : r));
    });
  }, []);

  const handleBatchApprove = useCallback(() => {
    const ids = Array.from(selectedRows);
    startTransition(async () => {
      setError(null);
      for (const id of ids) {
        const res = await approveSettlement(id);
        if (!res.success) {
          setError(res.error.message);
          break;
        }
        setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: 'APPROVED' } : r));
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

  const selectAllPending = useCallback(() => {
    const pendingIds = filtered.filter((r) => r.status === 'PENDING').map((r) => r.id);
    setSelectedRows((prev) => {
      const allSelected = pendingIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(pendingIds);
    });
  }, [filtered]);

  return (
    <div className={s.root}>
      <PageHeader
        title="تسویه‌حساب صرافی‌ها"
        description="مدیریت و پرداخت تسویه‌های دوره‌ای"
        breadcrumb={[{ href: '/dashboard', label: 'داشبورد' }, { label: 'تسویه‌حساب' }]}
      />

      {/* ── KPI Strip ── */}
      <div className={s.kpiStrip} role="status">
        <div className={s.kpiItem}>
          <span className={s.kpiVal}>{new Intl.NumberFormat('fa-IR').format(rows.length)}</span>
          <span className={s.kpiLabel}>مجموع تسویه‌ها</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={`${s.kpiVal} ${pendingRows.length > 0 ? s.kpiValPending : ''}`}>
            {new Intl.NumberFormat('fa-IR').format(pendingRows.length)}
          </span>
          <span className={s.kpiLabel}>در انتظار</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={s.kpiVal}>{fmtAFN(String(kpiTotalPaid))}</span>
          <span className={s.kpiLabel}>پرداخت شده</span>
        </div>
        <div className={s.kpiDivider} aria-hidden />
        <div className={s.kpiItem}>
          <span className={s.kpiVal}>{fmtAFN(String(kpiTotalVolume))}</span>
          <span className={s.kpiLabel}>حجم کل</span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className={s.errorBanner} role="alert">{error}</div>
      )}

      {/* ── Toolbar ── */}
      <div className={s.toolbar}>
        <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setSelectedRows(new Set()); }}>
          <TabsList>
            <TabsTrigger value="all">همه</TabsTrigger>
            <TabsTrigger value="PENDING">در انتظار {pendingRows.length > 0 && `(${pendingRows.length})`}</TabsTrigger>
            <TabsTrigger value="APPROVED">تأیید شده</TabsTrigger>
            <TabsTrigger value="PAID">پرداخت شده</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className={s.toolbarEnd}>
          {selectedRows.size > 0 && (
            <Button
              size="sm"
              onClick={handleBatchApprove}
              disabled={isPending}
              className={s.batchBtn}
            >
              <CheckCircle2 size={14} aria-hidden />
              تأیید {new Intl.NumberFormat('fa-IR').format(selectedRows.size)} مورد
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadCsv(filtered)}
            className={s.exportBtn}
            aria-label="دانلود CSV"
          >
            <Download size={14} aria-hidden />
            CSV
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CircleDollarSign}
          title="تسویه‌ای ثبت نشده"
          description="هنوز هیچ دوره تسویه‌ای محاسبه نشده است."
        />
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table} aria-label="تسویه‌حساب صرافی‌ها">
            <thead>
              <tr>
                {/* Batch checkbox col */}
                {tab === 'PENDING' && (
                  <th className={`${s.th} ${s.thCheck}`}>
                    <input
                      type="checkbox"
                      className={s.checkbox}
                      checked={
                        filtered.filter((r) => r.status === 'PENDING').length > 0 &&
                        filtered.filter((r) => r.status === 'PENDING').every((r) => selectedRows.has(r.id))
                      }
                      onChange={selectAllPending}
                      aria-label="انتخاب همه"
                    />
                  </th>
                )}
                <th className={s.th}>صرافی</th>
                <th className={s.th}>دوره</th>
                <th className={s.th}>حجم</th>
                <th className={s.th}>معاملات</th>
                <th className={s.th}>کارمزد پلتفرم</th>
                <th className={s.th}>خالص صراف</th>
                <th className={s.th}>وضعیت</th>
                <th className={s.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className={s.tr}>
                  {/* Batch checkbox */}
                  {tab === 'PENDING' && (
                    <td className={`${s.td} ${s.tdCheck}`}>
                      {row.status === 'PENDING' && (
                        <input
                          type="checkbox"
                          className={s.checkbox}
                          checked={selectedRows.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          aria-label={`انتخاب ${row.exchangeName}`}
                        />
                      )}
                    </td>
                  )}

                  {/* Exchange */}
                  <td className={s.td}>
                    <div className={s.exchangeCell}>
                      <span className={s.exchangeName}>{row.exchangeName}</span>
                      <span className={s.exchangeId} dir="ltr">{row.exchangeId.slice(0, 8)}</span>
                    </div>
                  </td>

                  {/* Period */}
                  <td className={s.td}>
                    <span className={s.period}>
                      {fmtDate(row.periodStart)} — {fmtDate(row.periodEnd)}
                    </span>
                  </td>

                  {/* Volume */}
                  <td className={s.td}>
                    <span className={s.amount}>{fmtAFN(row.totalVolume)}</span>
                  </td>

                  {/* Deal count */}
                  <td className={s.td}>
                    <span className={s.count}>
                      {new Intl.NumberFormat('fa-IR').format(row.dealCount)}
                    </span>
                  </td>

                  {/* Platform fee */}
                  <td className={s.td}>
                    <span className={s.feeAmount}>{fmtAFN(row.platformFee)}</span>
                  </td>

                  {/* Exchange net */}
                  <td className={s.td}>
                    <span className={s.netAmount}>{fmtAFN(row.exchangeNet)}</span>
                  </td>

                  {/* Status */}
                  <td className={s.td}>
                    <Badge className={`${s.statusBadge} ${s[STATUS_CSS[row.status] ?? 'pending']}`}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className={s.td}>
                    <div className={s.actionCell}>
                      <button
                        type="button"
                        className={s.detailBtn}
                        onClick={() => setDetailRow(row)}
                        aria-label="جزئیات"
                      >
                        <Eye size={14} aria-hidden />
                      </button>
                      {row.status === 'PENDING' && (
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleApprove(row.id)}
                          className={s.approveBtn}
                        >
                          تأیید
                        </Button>
                      )}
                      {row.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handlePaid(row.id)}
                          className={s.paidBtn}
                        >
                          ثبت پرداخت
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Sheet ── */}
      <Sheet open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <SheetContent dir="rtl" side="left" className={s.detailSheet}>
          {detailRow && (
            <>
              <SheetHeader className={s.detailHeader}>
                <div className={s.detailExchangeAvatar} aria-hidden>
                  <CircleDollarSign size={20} aria-hidden />
                </div>
                <div>
                  <SheetTitle className={s.detailTitle}>{detailRow.exchangeName}</SheetTitle>
                  <p className={s.detailPeriod}>
                    {fmtDate(detailRow.periodStart)} — {fmtDate(detailRow.periodEnd)}
                  </p>
                </div>
              </SheetHeader>

              <div className={s.detailBody}>
                <div className={s.metaGrid}>
                  {[
                    { label: 'حجم کل', val: fmtAFN(detailRow.totalVolume) },
                    { label: 'تعداد معاملات', val: new Intl.NumberFormat('fa-IR').format(detailRow.dealCount) },
                    { label: 'کارمزد پلتفرم', val: fmtAFN(detailRow.platformFee) },
                    { label: 'خالص قابل پرداخت', val: fmtAFN(detailRow.exchangeNet) },
                    { label: 'ارز', val: detailRow.currency },
                    { label: 'وضعیت', val: STATUS_LABELS[detailRow.status] ?? detailRow.status },
                    ...(detailRow.approvedAt ? [{ label: 'تأیید در', val: fmtDate(detailRow.approvedAt) }] : []),
                    ...(detailRow.paidAt ? [{ label: 'پرداخت در', val: fmtDate(detailRow.paidAt) }] : []),
                  ].map(({ label, val }) => (
                    <div key={label} className={s.metaItem}>
                      <span className={s.metaKey}>{label}</span>
                      <span className={s.metaVal}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Quick actions */}
                <div className={s.detailActions}>
                  {detailRow.status === 'PENDING' && (
                    <Button
                      onClick={() => { handleApprove(detailRow.id); setDetailRow(null); }}
                      disabled={isPending}
                      className={s.approveBtn}
                    >
                      <CheckCircle2 size={15} aria-hidden />
                      تأیید تسویه
                    </Button>
                  )}
                  {detailRow.status === 'APPROVED' && (
                    <Button
                      onClick={() => { handlePaid(detailRow.id); setDetailRow(null); }}
                      disabled={isPending}
                      className={s.paidBtn}
                    >
                      <CheckCircle2 size={15} aria-hidden />
                      ثبت پرداخت
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
