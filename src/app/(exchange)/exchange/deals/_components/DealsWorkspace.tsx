'use client';

/**
 * DealsWorkspace — کارتابل معاملات ارزی صرافی (premium glass, لایه‌دار).
 *
 * ساختار:
 *   ۱. Hero شیشه‌ای + «خط لولهٔ معامله» (ایجاد ← در انتظار ← تأیید ← تکمیل)
 *   ۲. نوار KPI با trend
 *   ۳. InsightLayout: جدول اصلی + rail تحلیلی (Donut وضعیت / جفت‌ارزها / کانال‌ها)
 *
 * اقدامات از اکشن‌های موجود (currency-deals.ts) و جزئیات در PanelDrawer.
 */

import {
  type DealRow,
  cancelDeal,
  completeDeal,
  confirmDeal,
  createDeal,
  getExchangeDeals,
} from '@/actions/currency-deals';
import { type ExchangeDealStats, getExchangeDealStats } from '@/actions/exchange-ops';
import type { QuoteRow } from '@/actions/exchange-quotes';
import {
  type BarItem,
  BarList,
  Donut,
  type DonutSegment,
  InsightCard,
  InsightLayout,
  InsightPanel,
  SplitBar,
  type SplitBarSegment,
} from '@/components/Dashboard/primitives/InsightPanel';
import { PanelDrawer } from '@/components/Dashboard/primitives/PanelDrawer';
import { ExchangeKpiRibbon, type ExchangeKpiTile } from '@/components/Exchange/ExchangeKpiRibbon';
import { ExchangePageHero } from '@/components/Exchange/ExchangePageHero';
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import s from './DealsWorkspace.module.css';

const faNum = new Intl.NumberFormat('fa-IR');

const STATUS_FA: Record<string, string> = {
  PENDING: 'در انتظار تأیید',
  CONFIRMED: 'تأییدشده',
  PROCESSING: 'در حال انجام',
  COMPLETED: 'تکمیل‌شده',
  CANCELLED: 'لغوشده',
  DISPUTED: 'اختلافی',
  REFUNDED: 'بازگشتی',
};

const CHANNEL_FA: Record<string, string> = {
  ONLINE: 'آنلاین',
  INPERSON: 'حضوری',
  PHONE: 'تلفنی',
};

function fmtAmount(v: string | null | undefined, currency?: string): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  const num = faNum.format(n);
  return currency ? `${num} ${currency}` : num;
}

function fmtNum(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return faNum.format(n);
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

interface Props {
  exchangeId: string;
  initialDeals: DealRow[];
  stats: ExchangeDealStats;
  activeQuotes: QuoteRow[];
  staffRole: string;
  primaryCurrency: string;
}

type StatusFilter = 'all' | DealRow['status'];

export default function DealsWorkspace({
  exchangeId,
  initialDeals,
  stats,
  activeQuotes,
  staffRole,
  primaryCurrency,
}: Props) {
  const [rows, setRows] = useState<DealRow[]>(initialDeals);
  const [kpi, setKpi] = useState(stats);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DealRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canWrite = ['OWNER', 'MANAGER', 'STAFF'].includes(staffRole);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.trackingCode.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        d.customerPhone.includes(q) ||
        `${d.fromCurrency}/${d.toCurrency}`.toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, query]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of rows) map.set(d.status, (map.get(d.status) ?? 0) + 1);
    return map;
  }, [rows]);

  // ── دادهٔ rail تحلیلی ──────────────────────────────────────────────
  const statusSegments: DonutSegment[] = useMemo(() => {
    const order: [DealRow['status'], DonutSegment['color']][] = [
      ['PENDING', 'amber'],
      ['CONFIRMED', 'indigo'],
      ['PROCESSING', 'violet'],
      ['COMPLETED', 'emerald'],
      ['CANCELLED', 'rose'],
      ['DISPUTED', 'amber'],
    ];
    return order
      .map(([status, color]) => ({
        label: STATUS_FA[status],
        value: counts.get(status) ?? 0,
        color,
      }))
      .filter((x) => x.value > 0);
  }, [counts]);

  const pairItems: BarItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of rows) {
      const key = `${d.fromCurrency}/${d.toCurrency}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value, color: 'emerald' as const }));
  }, [rows]);

  const channelSegments: SplitBarSegment[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of rows)
      map.set(
        CHANNEL_FA[d.channel] ?? d.channel,
        (map.get(CHANNEL_FA[d.channel] ?? d.channel) ?? 0) + 1,
      );
    const order: [string, SplitBarSegment['color']][] = [
      ['آنلاین', 'emerald'],
      ['حضوری', 'indigo'],
      ['تلفنی', 'violet'],
    ];
    return order
      .map(([label, color]) => ({ label, value: map.get(label) ?? 0, color }))
      .filter((x) => x.value > 0);
  }, [rows]);

  async function refresh() {
    const [next, nextStats] = await Promise.all([
      getExchangeDeals(exchangeId, { limit: 60 }),
      getExchangeDealStats(exchangeId),
    ]);
    setRows(next);
    setKpi(nextStats);
  }

  async function run(
    action: () => Promise<{ success: boolean; error?: { message?: string } }>,
    key: string,
  ) {
    setBusy(key);
    setError(null);
    try {
      const res = await action();
      if (!res.success) setError(res.error?.message ?? 'عملیات ناموفق بود');
      else {
        setSelected(null);
        await refresh();
      }
    } catch {
      setError('خطای غیرمنتظره در عملیات');
    } finally {
      setBusy(null);
    }
  }

  const filters: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: 'همه' },
    { key: 'PENDING', label: 'در انتظار' },
    { key: 'CONFIRMED', label: 'تأییدشده' },
    { key: 'PROCESSING', label: 'در حال انجام' },
    { key: 'COMPLETED', label: 'تکمیل' },
    { key: 'CANCELLED', label: 'لغوشده' },
  ];

  const pendingTrend =
    kpi.pending > 0
      ? { label: `${faNum.format(kpi.pending)} معامله نیاز به اقدام دارد`, tone: 'up' as const }
      : { label: 'صف تأیید خالی است', tone: 'neutral' as const };

  return (
    <div className={s.root}>
      {/* ── ۱. Hero + خط لوله ─────────────────────── */}
      <ExchangePageHero
        eyebrow="صرافی · معاملات"
        title="کارتابل معاملات ارزی"
        description="تأیید، رسید و پیگیری معاملات حضوری و آنلاین — روند هر معامله از ثبت تا تکمیل در یک نگاه"
        statValue={faNum.format(kpi.pending)}
        statLabel="در انتظار تأیید"
        trend={pendingTrend}
        liveLabel="رصد زنده · هر ۲۰ ثانیه"
        visual={<DealPipeline stats={kpi} />}
        action={
          canWrite ? (
            <button className={s.cta} onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> ثبت معاملهٔ حضوری
            </button>
          ) : undefined
        }
      />

      {/* ── ۲. روبان KPI فشرده ───────────────────── */}
      <ExchangeKpiRibbon
        tiles={
          [
            {
              label: 'در انتظار تأیید',
              value: faNum.format(kpi.pending),
              icon: Clock,
              tone: 'amber',
              trend:
                kpi.pending > 0
                  ? { dir: 'up', label: 'نیاز به اقدام' }
                  : { dir: 'flat', label: 'صف خالی' },
            },
            {
              label: 'تأییدشده / در حال انجام',
              value: faNum.format(kpi.confirmed + kpi.processing),
              icon: RefreshCw,
              tone: 'sky',
              sub: 'در انتظار تکمیل',
            },
            {
              label: 'تکمیل‌شده امروز',
              value: faNum.format(kpi.todayCount),
              icon: CheckCircle2,
              tone: 'emerald',
              sub: kpi.todayCount > 0 ? `از ${faNum.format(kpi.completed)} کل` : '—',
            },
            {
              label: `حجم امروز (${primaryCurrency})`,
              value: fmtNum(kpi.todayVolume) || '۰',
              icon: TrendingUp,
              tone: 'violet',
              sub: 'مبلغ ورودی تکمیل‌شدهٔ امروز',
            },
          ] as ExchangeKpiTile[]
        }
      />

      {/* ── ۳. جدول + rail ───────────────────────── */}
      <InsightLayout
        main={
          <div className={s.workspace}>
            <div className={s.toolbar}>
              <div className={s.filters} role="tablist" aria-label="فیلتر وضعیت معامله">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    className={`${s.pill} ${statusFilter === f.key ? s.pillActive : ''}`}
                    onClick={() => setStatusFilter(f.key)}
                  >
                    {f.label}
                    <span className={s.pillCount}>
                      {f.key === 'all' ? rows.length : (counts.get(f.key) ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
              <div className={s.search}>
                <Search size={15} aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی کد پیگیری، مشتری، جفت ارز…"
                  aria-label="جستجوی معامله"
                />
              </div>
            </div>

            {error && (
              <div className={s.error} role="alert">
                {error}
                <button onClick={() => setError(null)} aria-label="بستن">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className={s.panel}>
              {filtered.length === 0 ? (
                <div className={s.empty}>
                  <div className={s.emptyIcon}>💱</div>
                  <b>معامله‌ای یافت نشد</b>
                  <p>
                    فیلتر یا جستجو را تغییر دهید — یا با «ثبت معاملهٔ حضوری» یک معاملهٔ جدید بسازید.
                  </p>
                </div>
              ) : (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>کد پیگیری</th>
                        <th>مشتری</th>
                        <th>جفت ارز</th>
                        <th>مبلغ</th>
                        <th>نرخ</th>
                        <th>کانال</th>
                        <th>وضعیت</th>
                        <th aria-label="اقدامات" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((d) => (
                        <tr key={d.id} onClick={() => setSelected(d)} className={s.row}>
                          <td className={s.stickyCol}>
                            <span className={s.tracking} dir="ltr">
                              {d.trackingCode}
                            </span>
                          </td>
                          <td>
                            <div className={s.customer}>
                              <span className={s.avatar}>{d.customerName.slice(0, 1)}</span>
                              <div>
                                <b>{d.customerName}</b>
                                <span className={s.phone} dir="ltr">
                                  {d.customerPhone}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className={s.pair} dir="ltr">
                            <b>{d.fromCurrency}</b> → <b>{d.toCurrency}</b>
                          </td>
                          <td>{fmtAmount(d.fromAmount)}</td>
                          <td className={s.rate} dir="ltr">
                            {fmtNum(d.appliedRate)}
                          </td>
                          <td>
                            <span className={s.channel}>{CHANNEL_FA[d.channel] ?? d.channel}</span>
                          </td>
                          <td>
                            <span className={`${s.status} ${s[`status_${d.status}`] ?? ''}`}>
                              {STATUS_FA[d.status] ?? d.status}
                            </span>
                          </td>
                          <td>
                            <div className={s.rowActions} onClick={(e) => e.stopPropagation()}>
                              {d.status === 'PENDING' && canWrite && (
                                <button
                                  className={`${s.miniBtn} ${s.miniG}`}
                                  disabled={busy !== null}
                                  onClick={() =>
                                    run(
                                      () =>
                                        confirmDeal(d.id, { idempotencyKey: crypto.randomUUID() }),
                                      `confirm-${d.id}`,
                                    )
                                  }
                                >
                                  تأیید
                                </button>
                              )}
                              {d.status === 'CONFIRMED' && canWrite && (
                                <button
                                  className={`${s.miniBtn} ${s.miniG}`}
                                  disabled={busy !== null}
                                  onClick={() =>
                                    run(
                                      () => completeDeal(d.id, undefined, crypto.randomUUID()),
                                      `complete-${d.id}`,
                                    )
                                  }
                                >
                                  تکمیل
                                </button>
                              )}
                              {(d.status === 'PENDING' || d.status === 'CONFIRMED') && canWrite && (
                                <button
                                  className={`${s.miniBtn} ${s.miniGhost}`}
                                  disabled={busy !== null}
                                  onClick={() =>
                                    run(() => cancelDeal(d.id, 'لغو توسط صرافی'), `cancel-${d.id}`)
                                  }
                                >
                                  لغو
                                </button>
                              )}
                              <ChevronLeft size={15} className={s.chev} aria-hidden />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        }
        aside={
          <InsightPanel>
            <InsightCard title="توزیع وضعیت معاملات" icon={Clock}>
              <Donut
                data={statusSegments}
                size={132}
                centerLabel="مجموع"
                centerValue={faNum.format(rows.length)}
              />
            </InsightCard>
            <InsightCard title="جفت‌ارزهای پرتکرار" icon={TrendingUp}>
              <BarList data={pairItems} />
            </InsightCard>
            <InsightCard title="کانال‌های معامله" icon={RefreshCw}>
              <SplitBar data={channelSegments} />
            </InsightCard>
          </InsightPanel>
        }
      />

      {/* ── Detail drawer ──────────────────────── */}
      <PanelDrawer
        open={selected !== null}
        title={selected ? `معاملهٔ ${selected.trackingCode}` : ''}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <div className={s.drawerFooter}>
              {selected.status === 'PENDING' && canWrite && (
                <button
                  className={s.cta}
                  disabled={busy !== null}
                  onClick={() =>
                    run(
                      () => confirmDeal(selected.id, { idempotencyKey: crypto.randomUUID() }),
                      'confirm',
                    )
                  }
                >
                  {busy === 'confirm' ? (
                    <Loader2 size={15} className={s.spin} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  تأیید و ادامه
                </button>
              )}
              {selected.status === 'CONFIRMED' && canWrite && (
                <button
                  className={s.cta}
                  disabled={busy !== null}
                  onClick={() =>
                    run(() => completeDeal(selected.id, undefined, crypto.randomUUID()), 'complete')
                  }
                >
                  {busy === 'complete' ? (
                    <Loader2 size={15} className={s.spin} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  تکمیل معامله
                </button>
              )}
              {(selected.status === 'PENDING' || selected.status === 'CONFIRMED') && canWrite && (
                <button
                  className={s.ghostBtn}
                  disabled={busy !== null}
                  onClick={() => run(() => cancelDeal(selected.id, 'لغو توسط صرافی'), 'cancel')}
                >
                  لغو معامله
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className={s.detail}>
            <div className={s.detailHead}>
              <span className={`${s.status} ${s[`status_${selected.status}`] ?? ''}`}>
                {STATUS_FA[selected.status] ?? selected.status}
              </span>
              <span className={s.channel}>{CHANNEL_FA[selected.channel] ?? selected.channel}</span>
            </div>

            <div className={s.detailGrid}>
              <div className={s.dField}>
                <span>مشتری</span>
                <b>{selected.customerName}</b>
              </div>
              <div className={s.dField}>
                <span>شماره تماس</span>
                <b dir="ltr">{selected.customerPhone}</b>
              </div>
              <div className={s.dField}>
                <span>جفت ارز</span>
                <b dir="ltr">
                  {selected.fromCurrency} → {selected.toCurrency}
                </b>
              </div>
              <div className={s.dField}>
                <span>مبلغ ورودی</span>
                <b>{fmtAmount(selected.fromAmount, selected.fromCurrency)}</b>
              </div>
              <div className={s.dField}>
                <span>مبلغ دریافتی</span>
                <b>{fmtAmount(selected.toAmount, selected.toCurrency)}</b>
              </div>
              <div className={s.dField}>
                <span>نرخ اعمال‌شده</span>
                <b dir="ltr">{fmtNum(selected.appliedRate)}</b>
              </div>
              <div className={s.dField}>
                <span>کارمزد</span>
                <b>{fmtAmount(selected.feeAmount, selected.toCurrency)}</b>
              </div>
              <div className={s.dField}>
                <span>نرخ مرجع بازار</span>
                <b dir="ltr">{fmtNum(selected.marketRateRef)}</b>
              </div>
              <div className={s.dField}>
                <span>ثبت‌شده</span>
                <b>{fmtDate(selected.createdAt)}</b>
              </div>
              <div className={s.dField}>
                <span>تأیید</span>
                <b>{fmtDate(selected.confirmedAt)}</b>
              </div>
              <div className={s.dField}>
                <span>تکمیل</span>
                <b>{fmtDate(selected.completedAt)}</b>
              </div>
            </div>

            {selected.note && (
              <div className={s.note}>
                <span>یادداشت مشتری</span>
                <p>{selected.note}</p>
              </div>
            )}
            {selected.internalNote && (
              <div className={s.note}>
                <span>یادداشت داخلی</span>
                <p>{selected.internalNote}</p>
              </div>
            )}

            <div className={s.timeline}>
              <div className={s.tlItem}>
                <span className={s.tlDot} />
                <div>
                  <b>ایجاد معامله</b>
                  <p>{fmtDate(selected.createdAt)}</p>
                </div>
              </div>
              {selected.confirmedAt && (
                <div className={s.tlItem}>
                  <span className={s.tlDot} />
                  <div>
                    <b>تأیید صرافی</b>
                    <p>{fmtDate(selected.confirmedAt)}</p>
                  </div>
                </div>
              )}
              {selected.completedAt && (
                <div className={s.tlItem}>
                  <span className={s.tlDot} />
                  <div>
                    <b>تکمیل معامله</b>
                    <p>{fmtDate(selected.completedAt)}</p>
                  </div>
                </div>
              )}
              {selected.status === 'CANCELLED' && (
                <div className={s.tlItem}>
                  <span className={`${s.tlDot} ${s.tlDotRose}`} />
                  <div>
                    <b>لغو معامله</b>
                    <p>{fmtDate(selected.updatedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </PanelDrawer>

      {/* ── Create in-person drawer ────────────── */}
      <CreateDealDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        exchangeId={exchangeId}
        quotes={activeQuotes}
        onCreated={() => {
          setCreateOpen(false);
          void refresh();
        }}
      />
    </div>
  );
}

// ─── Deal pipeline visual ───────────────────────────────────────────────────

function DealPipeline({ stats }: { stats: ExchangeDealStats }) {
  const stages = [
    {
      key: 'pending',
      label: 'در انتظار تأیید',
      count: stats.pending,
      color: 'var(--ds-accent-amber)',
    },
    { key: 'confirmed', label: 'تأییدشده', count: stats.confirmed, color: '#2563eb' },
    {
      key: 'processing',
      label: 'در حال انجام',
      count: stats.processing,
      color: 'var(--ds-accent-violet)',
    },
    { key: 'completed', label: 'تکمیل', count: stats.completed, color: 'var(--ds-brand-500)' },
  ];
  const total = stages.reduce((sum, st) => sum + st.count, 0);

  return (
    <div className={s.pipeline} aria-label="خط لولهٔ وضعیت معاملات">
      {stages.map((st, i) => (
        <div key={st.key} className={s.pipeStageWrap}>
          {i > 0 && (
            <div className={s.pipeConnector} aria-hidden>
              <span className={s.pipeFlow} />
            </div>
          )}
          <div className={`${s.pipeStage} ${i === 0 && st.count > 0 ? s.pipeActive : ''}`}>
            <span className={s.pipeCount} style={{ color: st.color }}>
              {faNum.format(st.count)}
            </span>
            <span className={s.pipeLabel}>{st.label}</span>
          </div>
        </div>
      ))}
      <div className={s.pipeTotal}>
        <span>{faNum.format(total)}</span>
        <span>کل</span>
      </div>
    </div>
  );
}

function CreateDealDrawer({
  open,
  onClose,
  exchangeId,
  quotes,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  exchangeId: string;
  quotes: QuoteRow[];
  onCreated: () => void;
}) {
  const [quoteId, setQuoteId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedQuote = quotes.find((q) => q.id === quoteId);

  async function submit() {
    setError(null);
    if (!quoteId || !customerName.trim() || !customerPhone.trim() || !fromAmount) {
      setError('همهٔ فیلدهای الزامی را پر کنید');
      return;
    }
    const amount = Number(fromAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('مبلغ نامعتبر است');
      return;
    }
    const [fromCurrency, toCurrency] = (selectedQuote?.currencyPair ?? '').split('/');
    if (!fromCurrency || !toCurrency) {
      setError('quote انتخاب‌شده ساختار ارز نامعتبری دارد');
      return;
    }
    setSaving(true);
    try {
      const res = await createDeal({
        exchangeId,
        quoteId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        channel: 'INPERSON',
        note: note.trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!res.success) {
        setError(res.error?.message ?? 'ثبت معامله ناموفق بود');
      } else {
        onCreated();
      }
    } catch {
      setError('خطای غیرمنتظره در ثبت معامله');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelDrawer
      open={open}
      title="ثبت معاملهٔ حضوری"
      onClose={onClose}
      footer={
        <div className={s.drawerFooter}>
          <button className={s.ghostBtn} onClick={onClose} disabled={saving}>
            انصراف
          </button>
          <button className={s.cta} onClick={submit} disabled={saving}>
            {saving ? <Loader2 size={15} className={s.spin} /> : <Plus size={15} />}
            ثبت معامله
          </button>
        </div>
      }
    >
      <div className={s.form}>
        {error && <div className={s.error}>{error}</div>}
        <label>
          <span>نرخ پایه (quote فعال)</span>
          <select value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
            <option value="">انتخاب کنید…</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.currencyPair} — فروش {faNum.format(Number(q.sellRate))}
              </option>
            ))}
          </select>
          {quotes.length === 0 && (
            <small className={s.hint}>
              هیچ quote فعالی ندارید — اول از صفحهٔ «قیمت‌گذاری» یک quote تأیید کنید.
            </small>
          )}
        </label>
        {selectedQuote && (
          <div className={s.quotePreview}>
            <b dir="ltr">{selectedQuote.currencyPair}</b>
            <span>
              نرخ فروش: <b dir="ltr">{fmtNum(selectedQuote.sellRate)}</b>
            </span>
          </div>
        )}
        <label>
          <span>نام مشتری *</span>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="نام و نام خانوادگی"
          />
        </label>
        <label>
          <span>شماره تماس *</span>
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="۰۹۱۲ …"
            dir="ltr"
          />
        </label>
        <label>
          <span>مبلغ ورودی *</span>
          <input
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder={selectedQuote ? selectedQuote.currencyPair.split('/')[0] : 'مبلغ'}
            inputMode="decimal"
            dir="ltr"
          />
        </label>
        <label>
          <span>یادداشت</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="اختیاری"
          />
        </label>
      </div>
    </PanelDrawer>
  );
}
