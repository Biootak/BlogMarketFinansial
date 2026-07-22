'use client';

/**
 * FinanceReport — 2026 Million-Dollar Platform Finance Report
 *
 * طراحی: Ramp Analytics — SVG-native charts، بدون recharts dependency
 * ویژگی‌ها:
 * - KPI grid: 8 عدد کلیدی
 * - Trend sparkline: تراکنش‌های روزانه ۳۰ روز (SVG path)
 * - Top exchanges bar chart (SVG)
 * - Settlement distribution donut (SVG)
 * - همه حالت‌ها: loading / empty / error
 */

import { getPlatformFinanceReport } from '@/actions/platform-finance-report';
import type {
  ExchangeVolumeRow,
  PlatformFinanceKpi,
  SettlementStatusDist,
  TransactionTrend,
} from '@/actions/platform-finance-report';
import { EmptyState } from '@/components/Dashboard/primitives';
import { BarChart3, Building2, CheckCircle2, Clock, TrendingUp, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import s from './FinanceReport.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportData = {
  kpi: PlatformFinanceKpi;
  txTrend: TransactionTrend[];
  topExchanges: ExchangeVolumeRow[];
  settlementDist: SettlementStatusDist[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPersian(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function fmtCompact(n: number): string {
  return new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
}

// ─── SVG Sparkline ────────────────────────────────────────────────────────────

function TrendSparkline({ data }: { data: TransactionTrend[] }) {
  if (!data.length) return <div className={s.sparklineEmpty}>بدون داده</div>;

  const W = 620;
  const H = 88;
  const PAD = 8;

  const counts = data.map((d) => d.count);
  const maxCount = Math.max(...counts, 1);

  const pts = data.map((d, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - (d.count / maxCount) * (H - PAD * 2);
    return [x, y] as [number, number];
  });

  const completedPts = data.map((d, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - (d.completed / maxCount) * (H - PAD * 2);
    return [x, y] as [number, number];
  });

  function toPath(points: [number, number][]): string {
    if (!points.length) return '';
    const [first, ...rest] = points;
    return [`M ${first?.[0] ?? 0} ${first?.[1] ?? 0}`, ...rest.map(([x, y]) => `L ${x} ${y}`)].join(
      ' ',
    );
  }

  function toArea(points: [number, number][]): string {
    if (!points.length) return '';
    const path = toPath(points);
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return path;
    return `${path} L ${last[0]} ${H - PAD} L ${first[0]} ${H - PAD} Z`;
  }

  // تاریخ‌های محور X: فقط هر ۶ روز
  const xLabels = data.filter((_, i) => i % 6 === 0 || i === data.length - 1);

  return (
    <div className={s.sparklineWrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={s.sparklineSvg}
        aria-label="نمودار تراکنش‌های ۳۰ روز گذشته"
        role="img"
      >
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={PAD}
            y1={H - PAD - t * (H - PAD * 2)}
            x2={W - PAD}
            y2={H - PAD - t * (H - PAD * 2)}
            stroke="var(--ds-border-subtle, oklch(90% 0.005 250))"
            strokeWidth="0.5"
          />
        ))}

        {/* area fill — کل تراکنش‌ها */}
        <path d={toArea(pts)} fill="color-mix(in oklch, var(--ds-brand-500) 8%, transparent)" />
        {/* line — کل */}
        <path
          d={toPath(pts)}
          fill="none"
          stroke="var(--ds-brand-500)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* line — تکمیل‌شده */}
        <path
          d={toPath(completedPts)}
          fill="none"
          stroke="var(--nova-emerald, oklch(50% 0.14 145))"
          strokeWidth="1"
          strokeDasharray="3 2"
          strokeLinecap="round"
        />

        {/* نقاط */}
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" fill="var(--ds-brand-500)" opacity="0.6" />
        ))}

        {/* baseline */}
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="var(--ds-border-default)"
          strokeWidth="1"
        />
      </svg>

      {/* X labels */}
      <div className={s.sparklineXLabels} aria-hidden>
        {xLabels.map((d) => (
          <span key={d.date}>{fmtDate(d.date)}</span>
        ))}
      </div>

      {/* legend */}
      <div className={s.sparklineLegend} aria-hidden>
        <span className={s.legendDotBlue} /> کل تراکنش
        <span className={s.legendDotGreen} /> تکمیل‌شده
      </div>
    </div>
  );
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function ExchangeBars({ data }: { data: ExchangeVolumeRow[] }) {
  if (!data.length) return <div className={s.sparklineEmpty}>صرافی‌ای یافت نشد</div>;

  const maxTx = Math.max(...data.map((r) => r.txCount), 1);

  return (
    <div className={s.barsWrap} role="list" aria-label="برترین صراف‌ها">
      {data.map((ex) => {
        const pct = (ex.txCount / maxTx) * 100;
        return (
          <div key={ex.exchangeId} className={s.barRow} role="listitem">
            <span className={s.barLabel} title={ex.exchangeName}>
              {ex.exchangeName}
            </span>
            <div className={s.barTrack}>
              <div
                className={s.barFill}
                style={{ '--w': `${pct}%` } as React.CSSProperties}
                aria-label={`${fmtPersian(ex.txCount)} تراکنش`}
              />
            </div>
            <span className={s.barCount}>{fmtCompact(ex.txCount)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────

const SETTLEMENT_COLORS: Record<string, string> = {
  PENDING: 'var(--nova-amber, oklch(60% 0.16 70))',
  APPROVED: 'var(--ds-brand-500)',
  PAID: 'var(--nova-emerald, oklch(50% 0.14 145))',
  REJECTED: 'var(--nova-rose, oklch(55% 0.18 25))',
  CANCELLED: 'var(--ds-text-muted)',
};

const SETTLEMENT_FA: Record<string, string> = {
  PENDING: 'در انتظار',
  APPROVED: 'تأیید شده',
  PAID: 'پرداخت شده',
  REJECTED: 'رد شده',
  CANCELLED: 'لغو',
};

function SettlementDonut({ data }: { data: SettlementStatusDist[] }) {
  const total = data.reduce((s, r) => s + r.count, 0);
  if (!total) return <div className={s.sparklineEmpty}>تسویه‌ای ندارد</div>;

  const R = 44;
  const CX = 56;
  const CY = 56;
  const circ = 2 * Math.PI * R;

  let offset = 0;
  const slices = data.map((r) => {
    const frac = r.count / total;
    const len = frac * circ;
    const o = offset;
    offset += len;
    return { ...r, len, dashOffset: -o, frac };
  });

  return (
    <div className={s.donutWrap}>
      <svg viewBox="0 0 112 112" className={s.donutSvg} aria-hidden>
        {slices.map((sl) => (
          <circle
            key={sl.status}
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={SETTLEMENT_COLORS[sl.status] ?? 'var(--ds-text-muted)'}
            strokeWidth="14"
            strokeDasharray={`${sl.len} ${circ - sl.len}`}
            strokeDashoffset={sl.dashOffset}
            transform="rotate(-90 56 56)"
          />
        ))}
        {/* center text */}
        <text x="56" y="58" textAnchor="middle" className={s.donutCenter} fill="currentColor">
          {fmtPersian(total)}
        </text>
      </svg>
      <div className={s.donutLegend} role="list">
        {slices.map((sl) => (
          <div key={sl.status} className={s.donutLegendItem} role="listitem">
            <span
              className={s.donutDot}
              style={{ background: SETTLEMENT_COLORS[sl.status] ?? 'var(--ds-text-muted)' }}
            />
            <span>{SETTLEMENT_FA[sl.status] ?? sl.status}</span>
            <span className={s.donutCount}>{fmtPersian(sl.count)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={s.kpiCard} style={{ '--accent': accent } as React.CSSProperties}>
      <span className={s.kpiIcon} aria-hidden>
        {icon}
      </span>
      <span className={s.kpiValue}>{value}</span>
      <span className={s.kpiLabel}>{label}</span>
      {sub && <span className={s.kpiSub}>{sub}</span>}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function FinanceReportSkeleton() {
  return (
    <div className={s.skeleton}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={s.skeletonCard} style={{ '--i': i } as React.CSSProperties} />
      ))}
      <div className={s.skeletonChart} />
      <div className={s.skeletonChartHalf} />
      <div className={s.skeletonChartHalf} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FinanceReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getPlatformFinanceReport();
    setLoading(false);
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <FinanceReportSkeleton />;
  if (error)
    return (
      <EmptyState
        icon={BarChart3}
        title="خطا در بارگذاری گزارش"
        description={error}
        action={
          <button type="button" className={s.retryBtn} onClick={load}>
            تلاش مجدد
          </button>
        }
      />
    );
  if (!data) return <EmptyState icon={BarChart3} title="داده‌ای موجود نیست" />;

  const { kpi, txTrend, topExchanges, settlementDist } = data;

  // حجم مالی — از string BigInt (ذخیره در واحد صدم)
  const volumeNum = Number(kpi.totalVolumeSampled) / 100;

  return (
    <div className={s.root}>
      {/* ── KPI Grid ──────────────────────────────────────────────── */}
      <section className={s.kpiGrid} aria-label="شاخص‌های کلیدی مالی">
        <KpiCard
          icon={<TrendingUp size={16} />}
          label="کل تراکنش‌ها"
          value={fmtPersian(kpi.totalTransactions)}
          sub={`${fmtPersian(kpi.completedTransactions)} تکمیل`}
          accent="var(--ds-brand-500)"
        />
        <KpiCard
          icon={<Clock size={16} />}
          label="در انتظار"
          value={fmtPersian(kpi.pendingTransactions)}
          sub="تراکنش معلق"
          accent="var(--nova-amber, oklch(60% 0.16 70))"
        />
        <KpiCard
          icon={<CheckCircle2 size={16} />}
          label="حجم مالی (sample)"
          value={fmtCompact(volumeNum)}
          sub="۱۰۰۰ تراکنش اخیر"
          accent="var(--nova-emerald, oklch(50% 0.14 145))"
        />
        <KpiCard
          icon={<BarChart3 size={16} />}
          label="تسویه‌حساب‌ها"
          value={fmtPersian(kpi.totalSettlements)}
          sub={`${fmtPersian(kpi.paidSettlements)} پرداخت شده`}
          accent="var(--nova-violet, oklch(55% 0.16 280))"
        />
        <KpiCard
          icon={<Building2 size={16} />}
          label="صراف‌ها"
          value={fmtPersian(kpi.totalExchanges)}
          sub={`${fmtPersian(kpi.activeExchanges)} فعال`}
          accent="var(--ds-brand-500)"
        />
        <KpiCard
          icon={<Users size={16} />}
          label="مشتریان"
          value={fmtPersian(kpi.totalCustomers)}
          sub={`${fmtPersian(kpi.activeCustomers)} فعال`}
          accent="var(--nova-cyan, oklch(58% 0.14 200))"
        />
        <KpiCard
          icon={<CheckCircle2 size={16} />}
          label="نرخ تکمیل"
          value={
            kpi.totalTransactions > 0
              ? `${Math.round((kpi.completedTransactions / kpi.totalTransactions) * 100)}٪`
              : '—'
          }
          sub="تراکنش‌های موفق"
          accent="var(--nova-emerald, oklch(50% 0.14 145))"
        />
        <KpiCard
          icon={<Clock size={16} />}
          label="تسویه در انتظار"
          value={fmtPersian(kpi.pendingSettlements)}
          sub="نیاز به تأیید"
          accent="var(--nova-amber, oklch(60% 0.16 70))"
        />
      </section>

      {/* ── Trend ─────────────────────────────────────────────────── */}
      <section className={s.chartCard}>
        <h3 className={s.chartTitle}>
          <TrendingUp size={14} aria-hidden />
          تراکنش‌های ۳۰ روز گذشته
        </h3>
        <TrendSparkline data={txTrend} />
      </section>

      {/* ── Bottom Row ────────────────────────────────────────────── */}
      <div className={s.bottomRow}>
        {/* Top exchanges */}
        <section className={s.chartCard}>
          <h3 className={s.chartTitle}>
            <Building2 size={14} aria-hidden />
            برترین صراف‌ها (بر اساس تراکنش)
          </h3>
          <ExchangeBars data={topExchanges} />
        </section>

        {/* Settlement distribution */}
        <section className={s.chartCard}>
          <h3 className={s.chartTitle}>
            <BarChart3 size={14} aria-hidden />
            وضعیت تسویه‌حساب‌ها
          </h3>
          <SettlementDonut data={settlementDist} />
        </section>
      </div>
    </div>
  );
}
