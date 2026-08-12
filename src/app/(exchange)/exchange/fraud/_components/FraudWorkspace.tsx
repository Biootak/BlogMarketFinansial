'use client';

/**
 * FraudWorkspace — صف بررسی تقلب صرافی (premium glass, لایه‌دار).
 *
 * ساختار:
 *   ۱. Hero: موارد باز + «باندهای ریسک» (بالا/متوسط/کم)
 *   ۲. نوار KPI
 *   ۳. InsightLayout: صف + rail (وضعیت Donut / دلایل هشدار BarList)
 */

import {
  type ExchangeFraudRow,
  type ExchangeFraudStats,
  getExchangeFraudQueue,
  getExchangeFraudStats,
  resolveExchangeFraud,
} from '@/actions/exchange-ops';
import {
  type BarItem,
  BarList,
  Donut,
  type DonutSegment,
  InsightCard,
  InsightLayout,
  InsightPanel,
} from '@/components/Dashboard/primitives/InsightPanel';
import { PanelDrawer } from '@/components/Dashboard/primitives/PanelDrawer';
import { ExchangeKpiRibbon, type ExchangeKpiTile } from '@/components/Exchange/ExchangeKpiRibbon';
import { ExchangePageHero } from '@/components/Exchange/ExchangePageHero';
import {
  CheckCircle2,
  ChevronLeft,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import s from './FraudWorkspace.module.css';

const faNum = new Intl.NumberFormat('fa-IR');

const STATUS_FA: Record<string, string> = {
  OPEN: 'باز',
  IN_REVIEW: 'در حال بررسی',
  RESOLVED: 'کلاهبرداری تأیید',
  CLOSED: 'بسته‌شده',
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

function riskColor(score: number): string {
  if (score >= 75) return 'var(--ds-rose)';
  if (score >= 45) return 'var(--ds-accent-amber)';
  return 'var(--ds-brand-500)';
}

interface Props {
  exchangeId: string;
  initial: ExchangeFraudRow[];
  stats: ExchangeFraudStats;
  staffRole: string;
}

type StatusFilter = 'all' | 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

export default function FraudWorkspace({ exchangeId, initial, stats, staffRole }: Props) {
  const [rows, setRows] = useState<ExchangeFraudRow[]>(initial);
  const [kpi, setKpi] = useState(stats);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<ExchangeFraudRow | null>(null);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canResolve = ['OWNER', 'MANAGER'].includes(staffRole);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
        .sort((a, b) => {
          if (statusFilter === 'all') {
            if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
            if (b.status === 'OPEN' && a.status !== 'OPEN') return 1;
          }
          return b.riskScore - a.riskScore;
        }),
    [rows, statusFilter],
  );

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return map;
  }, [rows]);

  // ── دادهٔ rail ────────────────────────────────────────────────────────
  const statusSegments: DonutSegment[] = useMemo(() => {
    const order: [string, DonutSegment['color']][] = [
      ['OPEN', 'rose'],
      ['IN_REVIEW', 'amber'],
      ['RESOLVED', 'emerald'],
      ['CLOSED', 'slate'],
    ];
    return order
      .map(([status, color]) => ({
        label: STATUS_FA[status] ?? status,
        value: statusCounts.get(status) ?? 0,
        color,
      }))
      .filter((x) => x.value > 0);
  }, [statusCounts]);

  const reasonItems: BarItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.reason.slice(0, 42);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value, color: 'rose' as const }));
  }, [rows]);

  // ── باندهای ریسک برای hero ────────────────────────────────────────────
  const riskBands = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const r of rows) {
      if (r.status === 'RESOLVED' || r.status === 'CLOSED') continue;
      if (r.riskScore >= 75) high += 1;
      else if (r.riskScore >= 45) medium += 1;
      else low += 1;
    }
    return { high, medium, low };
  }, [rows]);

  async function refresh() {
    const [next, nextStats] = await Promise.all([
      getExchangeFraudQueue(exchangeId),
      getExchangeFraudStats(exchangeId),
    ]);
    setRows(next);
    setKpi(nextStats);
  }

  async function resolve(status: 'RESOLVED' | 'CLOSED' | 'OPEN') {
    if (!selected) return;
    setBusy(status);
    setError(null);
    try {
      const res = await resolveExchangeFraud({
        reviewId: selected.id,
        status,
        resolution: resolution.trim() || undefined,
      });
      if (!res.success) setError(res.error?.message ?? 'عملیات ناموفق بود');
      else {
        setSelected(null);
        setResolution('');
        await refresh();
      }
    } catch {
      setError('خطای غیرمنتظره');
    } finally {
      setBusy(null);
    }
  }

  const tabs: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: 'همه' },
    { key: 'OPEN', label: 'باز' },
    { key: 'IN_REVIEW', label: 'در حال بررسی' },
    { key: 'RESOLVED', label: 'تأییدشده' },
    { key: 'CLOSED', label: 'بسته' },
  ];

  return (
    <div className={s.root}>
      {/* ── ۱. Hero + باندهای ریسک ────────────────── */}
      <ExchangePageHero
        eyebrow="صرافی · امنیت"
        title="بررسی تقلب"
        description="صف تراکنش‌های پرریسک این صرافی — اولویت‌بندی خودکار بر اساس امتیاز ریسک"
        statValue={faNum.format(kpi.open)}
        statLabel="پروندهٔ باز"
        trend={
          kpi.open > 0
            ? { label: `${faNum.format(kpi.open)} مورد نیاز به تصمیم دارد`, tone: 'down' }
            : { label: 'صف تقلب پاک است', tone: 'neutral' }
        }
        liveLabel="رصد زنده · هر ۳۰ ثانیه"
        visual={<RiskBands bands={riskBands} avg={kpi.avgRisk} />}
      />

      {/* ── ۲. روبان KPI فشرده ───────────────────── */}
      <ExchangeKpiRibbon
        tiles={
          [
            {
              label: 'پرونده‌های باز',
              value: faNum.format(kpi.open),
              icon: ShieldAlert,
              tone: 'rose',
              trend:
                kpi.open > 0
                  ? { dir: 'down', label: 'نیاز به تصمیم' }
                  : { dir: 'flat', label: 'صف پاک' },
            },
            {
              label: 'در حال بررسی',
              value: faNum.format(kpi.inReview),
              icon: ShieldCheck,
              tone: 'amber',
              sub: 'واگذار به کارکنان',
            },
            {
              label: 'بسته‌شده',
              value: faNum.format(kpi.resolved),
              icon: CheckCircle2,
              tone: 'emerald',
              sub: 'کل موارد بررسی‌شده',
            },
            {
              label: 'میانگین ریسک موارد باز',
              value: faNum.format(kpi.avgRisk),
              icon: ShieldAlert,
              tone: 'violet',
              sub: 'از ۱۰۰',
            },
          ] as ExchangeKpiTile[]
        }
      />

      {/* ── ۳. صف + rail ─────────────────────────── */}
      <InsightLayout
        main={
          <div className={s.workspace}>
            <div className={s.toolbar}>
              <div className={s.filters} role="tablist" aria-label="فیلتر وضعیت پرونده">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    className={`${s.pill} ${statusFilter === t.key ? s.pillActive : ''}`}
                    onClick={() => setStatusFilter(t.key)}
                  >
                    {t.label}
                    <span className={s.pillCount}>
                      {t.key === 'all' ? rows.length : (statusCounts.get(t.key) ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className={s.error} role="alert">
                {error}
              </div>
            )}

            <div className={s.panel}>
              {filtered.length === 0 ? (
                <div className={s.empty}>
                  <div className={s.emptyIcon}>
                    <ShieldCheck size={24} />
                  </div>
                  <b>پرونده‌ای در این وضعیت نیست</b>
                  <p>صف تقلب این صرافی پاک است — عالی.</p>
                </div>
              ) : (
                <div className={s.list}>
                  {filtered.map((r) => (
                    <div key={r.id} className={s.fraudRow} onClick={() => setSelected(r)}>
                      <div className={s.riskBox} style={{ color: riskColor(r.riskScore) }}>
                        <b>{r.riskScore}</b>
                        <span>ریسک</span>
                      </div>
                      <div className={s.grow}>
                        <div className={s.fraudTitle}>
                          <b>{r.customerName ?? 'مشتری ناشناس'}</b>
                          {r.txnId && (
                            <span className={s.tracking} dir="ltr">
                              {r.txnId}
                            </span>
                          )}
                        </div>
                        <div className={s.fraudMeta}>
                          {r.reason}
                          {r.txnAmount
                            ? ` · ${faNum.format(Number(r.txnAmount))} ${r.txnCurrency}`
                            : ''}
                        </div>
                        <div className={s.riskBar}>
                          <i
                            style={{
                              width: `${Math.min(100, r.riskScore)}%`,
                              background: riskColor(r.riskScore),
                            }}
                          />
                        </div>
                      </div>
                      <span className={`${s.status} ${s[`status_${r.status}`] ?? ''}`}>
                        {STATUS_FA[r.status] ?? r.status}
                      </span>
                      <ChevronLeft size={16} className={s.chev} aria-hidden />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
        aside={
          <InsightPanel>
            <InsightCard title="وضعیت پرونده‌ها" icon={ShieldCheck}>
              <Donut
                data={statusSegments}
                size={132}
                centerLabel="مجموع"
                centerValue={faNum.format(rows.length)}
              />
            </InsightCard>
            <InsightCard title="دلایل هشدار" icon={ShieldAlert}>
              <BarList data={reasonItems} />
            </InsightCard>
            <InsightCard title="معیار اولویت‌بندی" icon={ShieldCheck}>
              <div className={s.priorityHint}>
                <p>
                  پرونده‌های باز ابتدا بر اساس امتیاز ریسک مرتب می‌شوند؛ موارد بالای ۷۵ نیاز به تصمیم
                  فوری دارند.
                </p>
              </div>
            </InsightCard>
          </InsightPanel>
        }
      />

      {/* ── Detail drawer ──────────────────────── */}
      <PanelDrawer
        open={selected !== null}
        title={selected ? `پروندهٔ تقلب — ${selected.customerName ?? 'ناشناس'}` : ''}
        onClose={() => setSelected(null)}
        footer={
          selected && canResolve ? (
            <div className={s.drawerFooter}>
              {selected.status === 'OPEN' || selected.status === 'IN_REVIEW' ? (
                <>
                  <button
                    className={s.closedBtn}
                    disabled={busy !== null}
                    onClick={() => resolve('CLOSED')}
                  >
                    {busy === 'CLOSED' ? (
                      <Loader2 size={15} className={s.spin} />
                    ) : (
                      <XCircle size={15} />
                    )}
                    بستن بدون اقدام
                  </button>
                  <button
                    className={s.resolvedBtn}
                    disabled={busy !== null}
                    onClick={() => resolve('RESOLVED')}
                  >
                    {busy === 'RESOLVED' ? (
                      <Loader2 size={15} className={s.spin} />
                    ) : (
                      <ShieldAlert size={15} />
                    )}
                    تأیید کلاهبرداری
                  </button>
                </>
              ) : (
                <button
                  className={s.reopenBtn}
                  disabled={busy !== null}
                  onClick={() => resolve('OPEN')}
                >
                  {busy === 'OPEN' ? (
                    <Loader2 size={15} className={s.spin} />
                  ) : (
                    <RotateCcw size={15} />
                  )}
                  بازگشایی پرونده
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className={s.detail}>
            <div className={s.detailHero} style={{ borderColor: riskColor(selected.riskScore) }}>
              <div className={s.bigRisk} style={{ color: riskColor(selected.riskScore) }}>
                <b>{selected.riskScore}</b>
                <span>امتیاز ریسک از ۱۰۰</span>
              </div>
              <div className={s.detailGrid}>
                <div className={s.dField}>
                  <span>مشتری</span>
                  <b>{selected.customerName ?? '—'}</b>
                </div>
                <div className={s.dField}>
                  <span>شماره تماس</span>
                  <b dir="ltr">{selected.customerPhone ?? '—'}</b>
                </div>
                <div className={s.dField}>
                  <span>تراکنش</span>
                  <b dir="ltr">{selected.txnId ?? '—'}</b>
                </div>
                <div className={s.dField}>
                  <span>مبلغ</span>
                  <b>
                    {selected.txnAmount
                      ? `${faNum.format(Number(selected.txnAmount))} ${selected.txnCurrency}`
                      : '—'}
                  </b>
                </div>
                <div className={s.dField}>
                  <span>وضعیت</span>
                  <b>{STATUS_FA[selected.status] ?? selected.status}</b>
                </div>
                <div className={s.dField}>
                  <span>ثبت‌شده</span>
                  <b>{fmtDate(selected.createdAt)}</b>
                </div>
              </div>
            </div>

            <div className={s.note}>
              <span>دلیل هشدار</span>
              <p>{selected.reason}</p>
            </div>
            {selected.resolution && (
              <div className={`${s.note} ${s.noteResolved}`}>
                <span>نتیجهٔ بررسی</span>
                <p>{selected.resolution}</p>
              </div>
            )}

            {canResolve && (selected.status === 'OPEN' || selected.status === 'IN_REVIEW') && (
              <label className={s.resolutionField}>
                <span>نتیجهٔ بررسی (اختیاری)</span>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  placeholder="مثلاً: مشتری مدارک هویتی معتبر ارائه کرد — الگوی خرید مشکوک نبود"
                />
              </label>
            )}
          </div>
        )}
      </PanelDrawer>
    </div>
  );
}

// ─── Risk bands visual (hero) ────────────────────────────────────────────────

function RiskBands({
  bands,
  avg,
}: { bands: { high: number; medium: number; low: number }; avg: number }) {
  const total = bands.high + bands.medium + bands.low;
  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: 'ریسک بالا (۷۵+)', value: bands.high, color: 'var(--ds-rose)' },
    { label: 'ریسک متوسط (۴۵–۷۴)', value: bands.medium, color: 'var(--ds-accent-amber)' },
    { label: 'ریسک کم (زیر ۴۵)', value: bands.low, color: 'var(--ds-brand-500)' },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className={s.riskCard}>
      <div className={s.riskCardHead}>
        <span>توزیع ریسک موارد باز</span>
        <b>{faNum.format(total)} باز</b>
      </div>
      <div className={s.riskBands}>
        {rows.map((r) => (
          <div key={r.label} className={s.riskBand}>
            <div className={s.riskBandLabel}>
              <span>{r.label}</span>
              <b>{faNum.format(r.value)}</b>
            </div>
            <div className={s.riskBandTrack}>
              <i style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className={s.riskCardFoot}>
        <span>میانگین ریسک موارد باز</span>
        <b style={{ color: riskColor(avg) }}>{faNum.format(avg)} / ۱۰۰</b>
      </div>
    </div>
  );
}
