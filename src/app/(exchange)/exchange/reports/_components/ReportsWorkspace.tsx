'use client';

/**
 * ReportsWorkspace — گزارش تراکنش‌های صراف.
 *
 * فیلتر بازه تاریخ + نوع تراکنش، جدول تراکنش‌ها، خلاصه آماری.
 * Client Component برای فیلتر تعاملی؛ داده از server action می‌آید.
 */

import { type TransactionRow, getTransactions } from '@/actions/exchange-transactions';
import { type ReportData, generateReportCsv, getExchangeReport } from '@/actions/reporting';
import { type Column, DataTable, EmptyState } from '@/components/Dashboard/primitives';
import { BarChart3, Calendar, Download, Filter, Search, TrendingUp } from 'lucide-react';
import { type CSSProperties, useCallback, useEffect, useState, useTransition } from 'react';
import s from './ReportsWorkspace.module.css';

const KIND_FA: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  EXCHANGE: 'صرافی',
  TRANSFER: 'انتقال',
  FEE: 'کارمزد',
};
const STATUS_FA: Record<string, string> = {
  COMPLETED: 'تکمیل',
  PENDING: 'در انتظار',
  FAILED: 'ناموفق',
  CANCELLED: 'لغو',
};

// ─── تبدیل تاریخ شمسی به میلادی (ساده) ────────────────────────────────────────
function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  // الگوریتم ساده جهت مقاصد فیلتر — دقت کافی برای date range دارد
  const jy1 = jy - 1600;
  const jm1 = jm - 1;
  const jd1 = jd - 1;
  let jDayNo =
    365 * jy1 +
    Math.floor((jy1 + 1) / 4) -
    Math.floor((jy1 + 1) / 100) +
    Math.floor((jy1 + 1) / 400);
  const jmi = [31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 29];
  for (let i = 0; i < jm1; ++i) jDayNo += jmi[i] ?? 0;
  jDayNo += jd1;
  const gDayNo = jDayNo + 79;
  let gy = 1600 + 400 * Math.floor(gDayNo / 146097);
  let gd = gDayNo % 146097;
  let leap = true;
  if (gd >= 36525) {
    gd--;
    gy += 100 * Math.floor(gd / 36524);
    gd = gd % 36524;
    if (gd >= 365) gd++;
    else leap = false;
  }
  gy += 4 * Math.floor(gd / 1461);
  gd %= 1461;
  if (gd >= 366) {
    leap = false;
    gd--;
    gy += Math.floor(gd / 365);
    gd = gd % 365;
  }
  const gmi = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 12 && gd >= (gmi[gm] ?? 31); ++gm) gd -= gmi[gm] ?? 31;
  return new Date(gy, gm, gd + 1);
}

function parseJalaliDate(s: string): Date | undefined {
  const parts = s.split('/');
  if (parts.length !== 3) return undefined;
  const [jy, jm, jd] = parts.map(Number);
  if (!jy || !jm || !jd) return undefined;
  return jalaliToGregorian(jy, jm, jd);
}

interface SummaryStats {
  totalCount: number;
  completedCount: number;
  totalVolumeAfn: number;
  byKind: Record<string, number>;
}

function calcSummary(rows: TransactionRow[]): SummaryStats {
  const stats: SummaryStats = {
    totalCount: rows.length,
    completedCount: 0,
    totalVolumeAfn: 0,
    byKind: {},
  };
  for (const r of rows) {
    if (r.status === 'COMPLETED') stats.completedCount++;
    if (r.currency === 'AFN') stats.totalVolumeAfn += Number(r.amount) / 100;
    stats.byKind[r.kind] = (stats.byKind[r.kind] ?? 0) + 1;
  }
  return stats;
}

interface Props {
  exchangeId: string;
  initialRows: TransactionRow[];
  initialTotal: number;
  initialReport: ReportData | null;
}

export default function ReportsWorkspace({
  exchangeId,
  initialRows,
  initialTotal,
  initialReport,
}: Props) {
  const [rows, setRows] = useState<TransactionRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [kindFilter, setKindFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'transactions' | 'pnl'>('transactions');
  const [report, setReport] = useState<ReportData | null>(initialReport);
  const [reportPending, setReportPending] = useState(false);

  // summary stats
  const summary = calcSummary(rows);

  const loadData = useCallback(() => {
    startTransition(async () => {
      const from = fromDate ? parseJalaliDate(fromDate) : undefined;
      const to = toDate ? parseJalaliDate(toDate) : undefined;
      const result = await getTransactions(exchangeId, {
        kind: kindFilter !== 'all' ? kindFilter : undefined,
        fromDate: from,
        toDate: to,
        // حداکثر ۱۰۰ ردیف — برای داده‌های بیشتر از Export CSV استفاده کنید
        limit: 100,
      });
      setRows(result.rows);
      setTotal(result.total);
    });
  }, [exchangeId, kindFilter, fromDate, toDate]);

  // وقتی فیلتر تغییر کرد، بارگذاری مجدد
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = rows.filter((r) => {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    return (
      (r.customer?.fullName ?? '').toLowerCase().includes(q) ||
      (r.customer?.phone ?? '').includes(q) ||
      (r.note ?? '').toLowerCase().includes(q)
    );
  });

  // export به CSV (از server action)
  const handleExport = async () => {
    const from = fromDate ? parseJalaliDate(fromDate) : undefined;
    const to = toDate ? parseJalaliDate(toDate) : undefined;
    const result = await generateReportCsv(exchangeId, { fromDate: from, toDate: to });
    if (!result.success) return;
    const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.data.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadPnl = async () => {
    setReportPending(true);
    const from = fromDate ? parseJalaliDate(fromDate) : undefined;
    const to = toDate ? parseJalaliDate(toDate) : undefined;
    const res = await getExchangeReport(exchangeId, { fromDate: from, toDate: to });
    setReportPending(false);
    if (res.success) setReport(res.data);
  };

  const columns: Column<TransactionRow>[] = [
    {
      key: 'createdAt',
      header: 'تاریخ',
      render: (r) => (
        <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--at-fg-subtle)' }}>
          {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(
            new Date(r.createdAt as string),
          )}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'مشتری',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--ds-text-sm)' }}>
            {r.customer?.fullName ?? '—'}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--at-fg-subtle)',
              direction: 'ltr',
              textAlign: 'right',
            }}
          >
            {r.customer?.phone ?? ''}
          </div>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'نوع',
      render: (r) => <span className={s.kindBadge}>{KIND_FA[r.kind] ?? r.kind}</span>,
    },
    {
      key: 'amount',
      header: 'مبلغ',
      render: (r) => (
        <span className="tabular-nums" style={{ direction: 'ltr', display: 'inline-block' }}>
          {new Intl.NumberFormat('fa-IR').format(Number(r.amount) / 100)} {r.currency}
        </span>
      ),
    },
    {
      key: 'destAmount',
      header: 'مبلغ مقصد',
      render: (r) =>
        r.destAmount ? (
          <span className="tabular-nums" style={{ direction: 'ltr', display: 'inline-block' }}>
            {new Intl.NumberFormat('fa-IR').format(Number(r.destAmount) / 100)}{' '}
            {r.destCurrency ?? ''}
          </span>
        ) : (
          <span style={{ color: 'var(--at-fg-subtle)' }}>—</span>
        ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (r) => (
        <span
          className={`${s.statusBadge} ${r.status === 'COMPLETED' ? s.statusCompleted : r.status === 'FAILED' ? s.statusFailed : s.statusPending}`}
        >
          {STATUS_FA[r.status] ?? r.status}
        </span>
      ),
    },
    {
      key: 'note',
      header: 'یادداشت',
      render: (r) => (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--at-fg-subtle)',
            maxWidth: '140px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {r.note ?? '—'}
        </span>
      ),
    },
  ];

  const inp: CSSProperties = {
    height: '36px',
    padding: '0 10px',
    fontSize: 'var(--ds-text-sm)',
    fontFamily: 'inherit',
    color: 'var(--at-fg)',
    background: 'var(--at-surface)',
    border: '1px solid var(--at-line)',
    borderRadius: '8px',
    outline: 'none',
  };

  return (
    <div className={s.root}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          background: 'color-mix(in oklch, var(--at-fg) 6%, transparent)',
          borderRadius: '10px',
          width: 'fit-content',
        }}
      >
        {(['transactions', 'pnl'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'pnl' && !report) handleLoadPnl();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              paddingInline: '14px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              background: activeTab === tab ? 'var(--at-surface)' : 'transparent',
              color: activeTab === tab ? 'var(--at-fg)' : 'var(--at-fg-subtle)',
              boxShadow:
                activeTab === tab
                  ? '0 1px 3px color-mix(in oklch, var(--at-fg) 10%, transparent)'
                  : 'none',
              transition: 'all 0.15s',
            }}
            aria-pressed={activeTab === tab}
          >
            {tab === 'transactions' ? (
              <>
                <BarChart3 size={13} aria-hidden />
                تراکنش‌ها
              </>
            ) : (
              <>
                <TrendingUp size={13} aria-hidden />
                P&L
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── P&L Tab ────────────────────────────────────────── */}
      {activeTab === 'pnl' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reportPending && (
            <p style={{ color: 'var(--at-fg-subtle)', fontSize: 'var(--ds-text-sm)' }}>
              در حال بارگذاری…
            </p>
          )}
          {report && (
            <>
              {/* Summary P&L */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                {[
                  {
                    label: 'حجم کل',
                    value: new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(
                      report.totalVolume / 100,
                    ),
                  },
                  {
                    label: 'کارمزد',
                    value: new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(
                      report.totalFee / 100,
                    ),
                  },
                  {
                    label: 'معاملات',
                    value: new Intl.NumberFormat('fa-IR').format(report.totalDeals),
                  },
                ].map((item) => (
                  <div key={item.label} className={s.summaryCard}>
                    <span className={s.summaryValue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {item.value}
                    </span>
                    <span className={s.summaryLabel}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* P&L by currency */}
              <table className={s.tableWrap} aria-label="P&L بر حسب ارز">
                <thead>
                  <tr className={s.tableHead}>
                    <th scope="col">ارز</th>
                    <th scope="col">حجم</th>
                    <th scope="col">کارمزد</th>
                    <th scope="col">تعداد</th>
                  </tr>
                </thead>
                <tbody>
                  {report.pnlByCurrency.map((row) => (
                    <tr key={row.currency} className={s.tableRow}>
                      <td style={{ fontWeight: 700 }}>{row.currency}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(
                          row.totalVolume / 100,
                        )}
                      </td>
                      <td
                        className={s.tdFee}
                        style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                      >
                        {new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(
                          row.totalFee / 100,
                        )}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {new Intl.NumberFormat('fa-IR').format(row.dealCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Top customers */}
              {report.topCustomers.length > 0 && (
                <div>
                  <h3
                    style={{
                      fontSize: 'var(--ds-text-sm)',
                      fontWeight: 700,
                      color: 'var(--at-fg)',
                      margin: '0 0 8px 0',
                    }}
                  >
                    بهترین مشتریان
                  </h3>
                  <table className={s.tableWrap} aria-label="بهترین مشتریان">
                    <tbody>
                      {report.topCustomers.map((c, i) => (
                        <tr key={c.customerId} className={s.tableRow}>
                          <td
                            style={{
                              color: 'var(--at-fg-subtle)',
                              fontVariantNumeric: 'tabular-nums',
                              width: '28px',
                              fontSize: '11px',
                            }}
                          >
                            {i + 1}
                          </td>
                          <td style={{ flex: 1 }}>{c.fullName}</td>
                          <td
                            style={{
                              fontVariantNumeric: 'tabular-nums',
                              color: 'var(--at-fg-subtle)',
                            }}
                          >
                            {new Intl.NumberFormat('fa-IR').format(c.dealCount)} معامله
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Transactions Tab ──────────────────────────────── */}
      {activeTab === 'transactions' && (
        <>
          {/* خلاصه آماری */}
          <div className={s.summaryGrid}>
            <div className={s.summaryCard}>
              <span className={s.summaryValue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {new Intl.NumberFormat('fa-IR').format(total)}
              </span>
              <span className={s.summaryLabel}>کل تراکنش‌ها</span>
            </div>
            <div className={s.summaryCard}>
              <span className={s.summaryValue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {new Intl.NumberFormat('fa-IR').format(summary.completedCount)}
              </span>
              <span className={s.summaryLabel}>تکمیل‌شده</span>
            </div>
            <div className={s.summaryCard}>
              <span className={s.summaryValue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(
                  summary.totalVolumeAfn,
                )}
              </span>
              <span className={s.summaryLabel}>حجم (افغانی)</span>
            </div>
            <div className={s.summaryCard}>
              <span className={s.summaryValue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {new Intl.NumberFormat('fa-IR').format(summary.byKind.EXCHANGE ?? 0)}
              </span>
              <span className={s.summaryLabel}>صرافی</span>
            </div>
          </div>

          {/* نوار فیلتر */}
          <div className={s.filterBar}>
            <div className={s.filterRow}>
              <Filter
                className="w-4 h-4"
                style={{ color: 'var(--at-fg-subtle)', flexShrink: 0 }}
                aria-hidden
              />
              {['all', ...Object.keys(KIND_FA)].map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`${s.filterBtn} ${kindFilter === k ? s.filterBtnActive : ''}`}
                  onClick={() => setKindFilter(k)}
                >
                  {k === 'all' ? 'همه انواع' : KIND_FA[k]}
                </button>
              ))}
            </div>

            <div className={s.filterDateRow}>
              <div className={s.dateField}>
                <label className={s.dateLabel} htmlFor="rpt-from">
                  <Calendar className="w-3.5 h-3.5" aria-hidden />
                  از تاریخ
                </label>
                <input
                  id="rpt-from"
                  style={{ ...inp, direction: 'ltr' }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="۱۴۰۴/۰۱/۰۱"
                  aria-label="از تاریخ (شمسی)"
                />
              </div>
              <div className={s.dateField}>
                <label className={s.dateLabel} htmlFor="rpt-to">
                  <Calendar className="w-3.5 h-3.5" aria-hidden />
                  تا تاریخ
                </label>
                <input
                  id="rpt-to"
                  style={{ ...inp, direction: 'ltr' }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="۱۴۰۴/۱۲/۲۹"
                  aria-label="تا تاریخ (شمسی)"
                />
              </div>
              <div className={s.searchWrap}>
                <Search className={s.searchIcon} aria-hidden />
                <input
                  className={s.searchInput}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو مشتری / یادداشت…"
                  aria-label="جستجو"
                />
              </div>
              <button
                type="button"
                className={s.exportBtn}
                onClick={handleExport}
                aria-label="دانلود گزارش CSV"
              >
                <Download className="w-4 h-4" aria-hidden />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* جدول */}
          <div className={s.tableWrap} aria-busy={isPending}>
            {isPending ? (
              <div className={s.loadingOverlay}>
                <span className={s.loadingDot} />
                <span className={s.loadingDot} />
                <span className={s.loadingDot} />
              </div>
            ) : null}
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.id}
              ariaLabel="گزارش تراکنش‌ها"
              empty={
                <EmptyState
                  title="تراکنشی یافت نشد"
                  description="بازه تاریخ یا فیلتر را تغییر دهید."
                />
              }
            />
          </div>

          {filtered.length > 0 && (
            <p className={s.footer}>
              نمایش {new Intl.NumberFormat('fa-IR').format(filtered.length)} از{' '}
              {new Intl.NumberFormat('fa-IR').format(total)} تراکنش
            </p>
          )}
        </>
      )}
    </div>
  );
}
