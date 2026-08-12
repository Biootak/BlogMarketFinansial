'use client';

/**
 * LedgerClient — دفتر کل (Cashflow Command Center)
 *
 * Premium 2026 rebuild — adaptive cashflow console:
 *   - PageHero with breadcrumb + accent line
 *   - 4 hero KPIs (credit / debit / net / count) with sparklines
 *   - CashflowPulse + CashflowRiver signature visualizations
 *   - LedgerFlowList — dense table on desktop, cards on mobile
 *   - FlowFilters — live filter rail (no apply button), debounced search
 *   - Right insight rail — CurrencyOrbit + MovementHeatmap + TopMovers
 *
 * Backend: uses `getLedgerEntries` + `getLedgerExchanges` server actions.
 * Tokens only | RTL logical | mobile-first responsive.
 */

import { type LedgerFilters, type LedgerRow, getLedgerEntries } from '@/actions/ledger-actions';
import {
  DataPanel,
  ExportButton,
  InsightCard,
  InsightLayout,
  InsightPanel,
  KpiCard,
  PageHero,
  StatGrid,
  TrendSparkline,
} from '@/components/Dashboard/primitives';
import { type DateRange, PersianDateRangePicker } from '@/components/ui/PersianDateRangePicker';
import { Button } from '@/components/ui/button';
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpRight,
  Calculator,
  ChevronDown,
  PieChart,
  TimerReset,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { endOfDay, startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { CashflowPulse, type CashflowPulsePoint } from './CashflowPulse';
import { CashflowRiver, type RiverPoint } from './CashflowRiver';
import { CurrencyOrbit, type OrbitCurrency } from './CurrencyOrbit';
import { FlowFilters } from './FlowFilters';
import s from './LedgerClient.module.css';
import { LedgerFlowList } from './LedgerFlowList';
import { type HeatmapCell, MovementHeatmap } from './MovementHeatmap';

const fa = new Intl.NumberFormat('fa-IR');
const faCompact = new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 });
const PAGE_SIZE = 40;

interface Props {
  initial: {
    rows: LedgerRow[];
    total: number;
    creditTotal: string;
    debitTotal: string;
    creditCount: number;
    debitCount: number;
  } | null;
  exchanges: { id: string; name: string }[];
}

function formatTime(iso: string | Date): string {
  try {
    return new Date(iso).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDateKey(iso: string | Date): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

export default function LedgerClient({ initial, exchanges }: Props) {
  const [, startTransition] = useTransition();

  const [rows, setRows] = useState<LedgerRow[]>(initial?.rows ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [creditTotal, setCreditTotal] = useState(initial?.creditTotal ?? '0');
  const [debitTotal, setDebitTotal] = useState(initial?.debitTotal ?? '0');
  const [creditCount, setCreditCount] = useState(initial?.creditCount ?? 0);
  const [debitCount, setDebitCount] = useState(initial?.debitCount ?? 0);
  // hasMore = «رکوردهای بیشتری برای بارگذاری هست؟» — اگر صفحهٔ اول کامل پر شده باشد بله.
  const [hasMore, setHasMore] = useState((initial?.rows.length ?? 0) >= PAGE_SIZE);

  const [filters, setFilters] = useState<LedgerFilters>({});
  const [draft, setDraft] = useState<LedgerFilters>({});
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);

  // Use ref for rows length to avoid stale closure in fetchPage
  const rowsLengthRef = useRef(rows.length);
  rowsLengthRef.current = rows.length;

  /* ── Live filters: every change commits; search is debounced ── */

  const commitFilters = useCallback(() => {
    setFilters({
      exchangeId: draft.exchangeId || undefined,
      currency: draft.currency || undefined,
      direction: draft.direction || undefined,
      from: dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined,
      // «to» باید تا پایان روز باشد — وگرنه تراکنش‌های همان روزِ آخر حذف می‌شوند.
      to: dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined,
      query: search.trim() || undefined,
    });
  }, [draft, dateRange, search]);

  useEffect(() => {
    const t = setTimeout(commitFilters, search.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [commitFilters, search]);

  // Sequence guard: با فیلتر زنده چند درخواست می‌توانند هم‌زمان در پرواز باشند؛
  // فقط پاسخ آخرین درخواست باید اعمال شود — پاسخ‌های قدیمی‌تر نادیده گرفته می‌شوند.
  const requestSeq = useRef(0);

  const fetchPage = useCallback(
    (append = false) => {
      setLoading(true);
      const offset = append ? rowsLengthRef.current : 0;
      const seq = ++requestSeq.current;
      startTransition(async () => {
        try {
          const result = await getLedgerEntries(filters, { offset, limit: PAGE_SIZE });
          if (seq !== requestSeq.current) return; // پاسخ قدیمی — نادیده بگیر
          if (result.success && result.data) {
            const d = result.data;
            if (append) {
              setRows((prev) => [...prev, ...d.rows]);
            } else {
              setRows(d.rows);
            }
            setTotal(d.total);
            setCreditTotal(d.creditTotal);
            setDebitTotal(d.debitTotal);
            setCreditCount(d.creditCount);
            setDebitCount(d.debitCount);
            setHasMore(d.rows.length === PAGE_SIZE);
          }
        } catch {
          // خطای شبکه/سرور — وضعیت لودینگ را قفل نکن
        } finally {
          if (seq === requestSeq.current) setLoading(false);
        }
      });
    },
    [filters],
  );

  // Fetch whenever the committed filter set changes (including first mount)
  useEffect(() => {
    fetchPage(false);
  }, [fetchPage]);

  const resetFilters = useCallback(() => {
    setDraft({});
    setDateRange(null);
    setSearch('');
  }, []);

  const loadMore = useCallback(() => fetchPage(true), [fetchPage]);

  const netValue = useMemo(() => {
    const credit = Number.parseFloat(creditTotal);
    const debit = Number.parseFloat(debitTotal);
    return (credit - debit).toString();
  }, [creditTotal, debitTotal]);

  /* ── Derived analytics ── */

  const currencyTotals = useMemo(() => {
    const totals = new Map<string, { credit: number; debit: number }>();
    for (const r of rows) {
      const cur = totals.get(r.currency) ?? { credit: 0, debit: 0 };
      const amt = Number.parseFloat(r.amount);
      if (r.direction === 'CREDIT') cur.credit += amt;
      else cur.debit += amt;
      totals.set(r.currency, cur);
    }
    return totals;
  }, [rows]);

  const orbitData = useMemo<OrbitCurrency[]>(
    () =>
      Array.from(currencyTotals.entries())
        .map(([code, v]) => ({ code, credit: v.credit, debit: v.debit }))
        .sort((a, b) => b.credit + b.debit - (a.credit + a.debit))
        .slice(0, 6),
    [currencyTotals],
  );

  const heatmapData = useMemo<HeatmapCell[]>(() => {
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const key = formatDateKey(r.createdAt);
      if (!key) continue;
      buckets.set(key, (buckets.get(key) ?? 0) + Number.parseFloat(r.amount));
    }
    const cells: HeatmapCell[] = [];
    for (const [date, value] of buckets) cells.push({ date, value });
    cells.sort((a, b) => a.date.localeCompare(b.date));
    return cells;
  }, [rows]);

  /* تعداد هفته‌های واقعیِ پوشش‌داده‌شده — عنوان panel را صادق نگه می‌دارد. */
  const heatmapWeeks = useMemo(() => {
    if (heatmapData.length === 0) return 0;
    const first = new Date(heatmapData[0].date).getTime();
    const last = new Date(heatmapData[heatmapData.length - 1].date).getTime();
    const days = Math.max(1, Math.round((last - first) / 86_400_000));
    return Math.min(12, Math.max(1, Math.ceil(days / 7)));
  }, [heatmapData]);

  /* ── CashflowPulse — last 14 entries net value ── */
  const pulseData = useMemo<CashflowPulsePoint[]>(() => {
    const slice = rows.slice(0, 14).reverse();
    return slice.map((r) => ({
      value: r.direction === 'CREDIT' ? Number.parseFloat(r.amount) : -Number.parseFloat(r.amount),
      label: formatTime(r.createdAt),
    }));
  }, [rows]);

  /* ── CashflowRiver — last 18 running balances ── */
  const riverData = useMemo<RiverPoint[]>(() => {
    const slice = rows.slice(0, 18).reverse();
    return slice.map((r) => ({
      balance: Number.parseFloat(r.runningBalance),
      direction: r.direction,
      label: formatTime(r.createdAt),
    }));
  }, [rows]);

  /* ── Top movers (by amount) ── */
  const topMovers = useMemo(() => {
    return [...rows]
      .sort((a, b) => Math.abs(Number.parseFloat(b.amount)) - Math.abs(Number.parseFloat(a.amount)))
      .slice(0, 5);
  }, [rows]);

  const topExchanges = useMemo(() => {
    const totals = new Map<string, { name: string; amount: number; count: number }>();
    for (const r of rows) {
      const e = totals.get(r.exchangeId) ?? { name: r.exchangeName, amount: 0, count: 0 };
      e.amount += Number.parseFloat(r.amount);
      e.count += 1;
      totals.set(r.exchangeId, e);
    }
    return Array.from(totals.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [rows]);

  const creditSeries = useMemo(() => {
    const last20 = rows.slice(0, 20);
    let running = 0;
    return last20.map((r) => {
      if (r.direction === 'CREDIT') running += Number.parseFloat(r.amount);
      return running;
    });
  }, [rows]);

  const debitSeries = useMemo(() => {
    const last20 = rows.slice(0, 20);
    let running = 0;
    return last20.map((r) => {
      if (r.direction === 'DEBIT') running += Number.parseFloat(r.amount);
      return running;
    });
  }, [rows]);

  /* ── Export ── */

  const exportData = useMemo(
    () =>
      rows.map((r) => ({
        time: r.time,
        exchange: r.exchangeName,
        party: r.customerName ?? r.accountLabel ?? '—',
        description: r.description ?? '—',
        direction: r.direction === 'CREDIT' ? 'واریز' : 'برداشت',
        amount: r.amount,
        currency: r.currency,
        balance: r.runningBalance,
      })),
    [rows],
  );

  const exportColumns = [
    { key: 'time', header: 'زمان' },
    { key: 'exchange', header: 'صرافی' },
    { key: 'party', header: 'طرف حساب' },
    { key: 'description', header: 'توضیحات' },
    { key: 'direction', header: 'جهت' },
    { key: 'amount', header: 'مبلغ' },
    { key: 'currency', header: 'ارز' },
    { key: 'balance', header: 'موجودی' },
  ];

  // فقط مقادیر truthy حساب می‌شوند — کلید با مقدار undefined (مثل انتخاب «همه») فیلتر کاذب نمی‌سازد.
  const hasActiveFilters = Object.values(draft).some(Boolean) || !!dateRange || !!search;

  return (
    <div className={s.root}>
      {/* ── Hero ── */}
      <PageHero
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'دفتر کل' }]}
        eyebrow="مرکز فرماندهی مالی"
        title="دفتر کل"
        description="کاوش زندهٔ جریان نقد پلتفرم — هر تراکنش، هر صرافی، هر ارز، در یک نگاه."
        icon={Wallet}
      />

      {/* ── KPI Strip ── */}
      <StatGrid>
        <KpiCard
          label="کل واریز"
          value={Number.parseFloat(creditTotal)}
          icon={ArrowUp}
          trend="up"
          format="compact"
          spark={creditSeries.length > 1 ? <TrendSparkline data={creditSeries} /> : undefined}
        />
        <KpiCard
          label="کل برداشت"
          value={Number.parseFloat(debitTotal)}
          icon={ArrowDown}
          trend="down"
          format="compact"
          spark={
            debitSeries.length > 1 ? (
              <TrendSparkline data={debitSeries} direction="down" />
            ) : undefined
          }
        />
        <KpiCard
          label="خالص"
          value={faCompact.format(Number.parseFloat(netValue))}
          icon={TrendingUp}
          trend={Number.parseFloat(netValue) < 0 ? 'down' : 'up'}
          format="compact"
        />
        <KpiCard label="تراکنش‌ها" value={total} icon={Calculator} format="compact" />
      </StatGrid>

      {/* ── Pulse + River (signature visualizations) ── */}
      <section className={s.signatureRow}>
        <div className={s.signatureCard}>
          <CashflowPulse data={pulseData} windowLabel="۱۴ تراکنش اخیر" />
        </div>
        <div className={s.signatureCard}>
          <CashflowRiver data={riverData} />
        </div>
      </section>

      {/* ── Main + Insight Rail ── */}
      <InsightLayout
        main={
          <DataPanel
            title="جریان تراکنش‌ها"
            count={fa.format(total)}
            footer={
              <div className={s.foot}>
                <span className={s.footCount}>
                  نمایش {fa.format(rows.length)} از {fa.format(total)} تراکنش
                </span>
                {hasMore && !loading ? (
                  <Button size="sm" variant="outline" onClick={loadMore} className={s.loadMore}>
                    <ChevronDown size={14} strokeWidth={1.75} />
                    <span>بارگذاری بیشتر</span>
                  </Button>
                ) : null}
              </div>
            }
          >
            <FlowFilters
              direction={draft.direction as 'ALL' | 'CREDIT' | 'DEBIT' | undefined}
              onDirectionChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  direction: v,
                }))
              }
              currency={draft.currency}
              onCurrencyChange={(v) => setDraft((d) => ({ ...d, currency: v }))}
              exchangeId={draft.exchangeId}
              onExchangeChange={(v) => setDraft((d) => ({ ...d, exchangeId: v }))}
              exchanges={exchanges}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              search={search}
              onSearchChange={setSearch}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
              datePickerSlot={
                <div className={s.dateGroup}>
                  <span className={s.groupLabel}>بازه</span>
                  <PersianDateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="انتخاب بازه"
                    className={s.datePicker}
                  />
                </div>
              }
              loading={loading}
            />

            <LedgerFlowList rows={rows} loading={loading} />

            {rows.length > 0 ? (
              <div className={s.tableFooterBar}>
                <ExportButton
                  data={exportData}
                  columns={exportColumns}
                  filename="ledger-export"
                  label="خروجی CSV"
                />
                <div className={s.footerStats}>
                  <span className={s.footerStat}>
                    <span className={s.footerStatDot} data-tone="up" />
                    <span>{fa.format(creditCount)} واریز</span>
                  </span>
                  <span className={s.footerStat}>
                    <span className={s.footerStatDot} data-tone="down" />
                    <span>{fa.format(debitCount)} برداشت</span>
                  </span>
                </div>
              </div>
            ) : null}
          </DataPanel>
        }
        aside={
          <InsightPanel>
            <InsightCard title="مدار ارزها" icon={PieChart}>
              <CurrencyOrbit data={orbitData} size={184} />
            </InsightCard>

            <InsightCard
              title={heatmapWeeks > 0 ? `نقشه فعالیت ${heatmapWeeks} هفته` : 'نقشه فعالیت'}
              icon={TimerReset}
            >
              <MovementHeatmap data={heatmapData} weeks={heatmapWeeks || 12} />
            </InsightCard>

            <InsightCard title="برترین صرافی‌ها" icon={ArrowLeftRight}>
              <ul className={s.moverList}>
                {topExchanges.map((e) => (
                  <li key={e.id} className={s.moverRow}>
                    <span className={s.moverRank}>
                      {e.amount >= 0 ? (
                        <ArrowUpRight size={11} strokeWidth={2} />
                      ) : (
                        <ArrowDownRight size={11} strokeWidth={2} />
                      )}
                    </span>
                    <div className={s.moverInfo}>
                      <span className={s.moverName}>{e.name}</span>
                      <span className={s.moverCount}>{fa.format(e.count)} تراکنش</span>
                    </div>
                    <span
                      className={`${s.moverValue} ${
                        e.amount >= 0 ? s.moverValueUp : s.moverValueDown
                      }`}
                    >
                      {faCompact.format(e.amount)}
                    </span>
                  </li>
                ))}
                {topExchanges.length === 0 ? (
                  <li className={s.moverEmpty}>صرافی‌ای برای نمایش نیست</li>
                ) : null}
              </ul>
            </InsightCard>

            <InsightCard title="بزرگ‌ترین تراکنش‌ها" icon={Wallet}>
              <ul className={s.moverList}>
                {topMovers.map((r) => (
                  <li key={r.id} className={s.moverRow}>
                    <span
                      className={`${s.moverRank} ${
                        r.direction === 'CREDIT' ? s.moverRankUp : s.moverRankDown
                      }`}
                    >
                      {r.direction === 'CREDIT' ? (
                        <ArrowUp size={11} strokeWidth={2} />
                      ) : (
                        <ArrowDown size={11} strokeWidth={2} />
                      )}
                    </span>
                    <div className={s.moverInfo}>
                      <span className={s.moverName}>{r.exchangeName}</span>
                      <span className={s.moverCount}>{r.customerName ?? r.description ?? '—'}</span>
                    </div>
                    <span
                      className={`${s.moverValue} ${
                        r.direction === 'CREDIT' ? s.moverValueUp : s.moverValueDown
                      }`}
                    >
                      {faCompact.format(Number.parseFloat(r.amount))}
                    </span>
                  </li>
                ))}
                {topMovers.length === 0 ? (
                  <li className={s.moverEmpty}>تراکنشی برای نمایش نیست</li>
                ) : null}
              </ul>
              <div className={s.asideFooter}>
                <Link href="/dashboard/exchanges" className={s.asideLink}>
                  مشاهده همه صرافی‌ها
                </Link>
              </div>
            </InsightCard>
          </InsightPanel>
        }
      />
    </div>
  );
}
