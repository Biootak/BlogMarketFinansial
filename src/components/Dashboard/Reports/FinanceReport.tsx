'use client';

/**
 * FinanceReport 2026 — Asymmetric Command-Center Layout
 * ─ KPI row (5 cards) + Hero trend chart + 2-col bottom
 * ─ DS tokens only — no hex/rgb — RTL-safe
 * ─ Real data from getPlatformFinanceReport()
 */

import { getPlatformFinanceReport } from '@/actions/platform-finance-report';
import type {
  PlatformFinanceKpi,
  SettlementStatusDist,
  TransactionTrend,
} from '@/actions/platform-finance-report';
import { EmptyState } from '@/components/Dashboard/primitives';
import { motion } from '@/lib/motion-shim';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Globe,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import s from './FinanceReport.module.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _faNum = new Intl.NumberFormat('fa-IR');

function fmt(n: number): string {
  return _faNum.format(n);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportData {
  kpi: PlatformFinanceKpi;
  txTrend: TransactionTrend[];
  topExchanges: {
    exchangeId: string;
    exchangeName: string;
    txCount: number;
    customerCount: number;
  }[];
  settlementDist: SettlementStatusDist[];
}

// ─── Tooltip Component ────────────────────────────────────────────────────────

interface TipPayload {
  color?: string;
  name?: string;
  value?: number;
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={s.tooltip}>
      {label && <p className={s.tooltipDate}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className={s.tooltipRow}>
          <span className={s.tooltipDot} style={{ background: p.color }} />
          <span className={s.tooltipVal}>{fmt(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: 'emerald' | 'violet' | 'cyan' | 'rose' | 'amber';
  trend?: 'up' | 'down' | 'flat';
  trendVal?: string;
  delay?: number;
}

function KpiCard({ icon, label, value, sub, tone, trend, trendVal, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      className={`${s.kpiCard} ${s[`kpiCard--${tone}`]}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={s.kpiTop}>
        <span className={`${s.kpiIcon} ${s[`kpiIcon--${tone}`]}`} aria-hidden>
          {icon}
        </span>
        {trend && (
          <span className={`${s.kpiTrend} ${s[`kpiTrend--${trend}`]}`}>
            {trend === 'up' ? (
              <ArrowUpRight size={13} aria-hidden />
            ) : trend === 'down' ? (
              <ArrowDownRight size={13} aria-hidden />
            ) : null}
            {trendVal}
          </span>
        )}
      </div>
      <p className={s.kpiValue}>{value}</p>
      <p className={s.kpiLabel}>{label}</p>
      {sub && <p className={s.kpiSub}>{sub}</p>}
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FinanceSkeleton() {
  return (
    <div className={s.root}>
      <div className={s.kpiRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={s.skCard}
            style={{ '--sk-delay': `${i * 60}ms` } as React.CSSProperties}
          />
        ))}
      </div>
      <div className={s.skHero} />
      <div className={s.bottomRow}>
        <div className={s.skChart} />
        <div className={s.skChart} />
      </div>
    </div>
  );
}

// ─── Settlement color map ──────────────────────────────────────────────────────

const SETTLEMENT_TONE: Record<string, string> = {
  PAID: 'var(--nova-emerald)',
  PENDING: 'var(--nova-amber)',
  FAILED: 'var(--nova-rose)',
  CANCELLED: 'var(--ds-text-muted)',
};

const SETTLE_LABEL: Record<string, string> = {
  PAID: 'پرداخت شده',
  PENDING: 'در انتظار',
  FAILED: 'ناموفق',
  CANCELLED: 'لغو شده',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinanceReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPlatformFinanceReport();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError('خطای داخلی سرور');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <FinanceSkeleton />;

  if (error)
    return (
      <EmptyState
        icon={AlertCircle}
        title="خطا در دریافت گزارش"
        description={error}
        action={
          <button
            type="button"
            onClick={load}
            style={{
              background: 'transparent',
              border: '1px solid var(--ds-border-default)',
              borderRadius: 'var(--ds-radius-md)',
              padding: '4px 12px',
              fontSize: 'var(--ds-text-sm)',
              color: 'var(--ds-text-secondary)',
              cursor: 'pointer',
            }}
          >
            تلاش مجدد
          </button>
        }
      />
    );

  if (!data)
    return (
      <EmptyState
        icon={BarChart3}
        title="داده‌ای موجود نیست"
        description="هنوز تراکنشی ثبت نشده است."
      />
    );

  const { kpi, txTrend, topExchanges, settlementDist } = data;

  // settlement total for %
  const settleTotal = settlementDist.reduce((s, r) => s + r.count, 0);

  return (
    <div className={s.root}>
      {/* ── KPI Row ── */}
      <div className={s.kpiRow}>
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="کل تراکنش‌ها"
          value={fmt(kpi.totalTransactions)}
          sub={`${fmt(kpi.completedTransactions)} تکمیل شده`}
          tone="emerald"
          trend="up"
          delay={0}
        />
        <KpiCard
          icon={<Activity size={18} />}
          label="در انتظار"
          value={fmt(kpi.pendingTransactions)}
          tone="amber"
          delay={0.04}
        />
        <KpiCard
          icon={<Globe size={18} />}
          label="صراف‌های فعال"
          value={fmt(kpi.activeExchanges)}
          sub={`از ${fmt(kpi.totalExchanges)} کل`}
          tone="cyan"
          delay={0.08}
        />
        <KpiCard
          icon={<Users size={18} />}
          label="مشتریان فعال"
          value={fmt(kpi.activeCustomers)}
          sub={`از ${fmt(kpi.totalCustomers)} کل`}
          tone="violet"
          delay={0.12}
        />
        <KpiCard
          icon={<CheckCircle2 size={18} />}
          label="تسویه‌های پرداخت"
          value={fmt(kpi.paidSettlements)}
          sub={`از ${fmt(kpi.totalSettlements)} تسویه`}
          tone="rose"
          delay={0.16}
        />
      </div>

      {/* ── Hero Trend Chart ── */}
      <motion.div
        className={s.heroChart}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={s.heroChartHead}>
          <div>
            <p className={s.heroChartEyebrow}>۳۰ روز گذشته</p>
            <h3 className={s.heroChartTitle}>
              <TrendingUp size={18} aria-hidden /> روند تراکنش‌ها
            </h3>
          </div>
          <button type="button" onClick={load} className={s.refreshBtn} aria-label="بارگذاری مجدد">
            <RefreshCw size={14} aria-hidden />
          </button>
        </div>

        {txTrend.length === 0 ? (
          <div className={s.noData}>داده‌ای برای نمایش وجود ندارد</div>
        ) : (
          <div className={s.heroChartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={txTrend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--nova-emerald)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--nova-emerald)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--nova-rose)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--nova-rose)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide axisLine={false} tickLine={false} />
                <YAxis hide axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="تکمیل شده"
                  stroke="var(--nova-emerald)"
                  strokeWidth={2}
                  fill="url(#gCompleted)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--nova-emerald)', strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  name="ناموفق"
                  stroke="var(--nova-rose)"
                  strokeWidth={1.5}
                  fill="url(#gFailed)"
                  dot={false}
                  activeDot={{ r: 3, fill: 'var(--nova-rose)', strokeWidth: 0 }}
                  strokeDasharray="4 2"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className={s.heroLegend}>
          <span className={s.legendItem}>
            <span className={s.legendDot} style={{ background: 'var(--nova-emerald)' }} />
            تکمیل شده
          </span>
          <span className={s.legendItem}>
            <span className={s.legendDot} style={{ background: 'var(--nova-rose)' }} />
            ناموفق
          </span>
        </div>
      </motion.div>

      {/* ── Bottom Row ── */}
      <div className={s.bottomRow}>
        {/* ── Top Exchanges ── */}
        <motion.div
          className={s.chartCard}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={s.cardHead}>
            <span className={`${s.cardHeadIcon} ${s['cardHeadIcon--cyan']}`} aria-hidden>
              <Building2 size={16} />
            </span>
            <h3 className={s.cardTitle}>صرافی‌های برتر</h3>
          </div>

          {topExchanges.length === 0 ? (
            <div className={s.noData}>داده‌ای وجود ندارد</div>
          ) : (
            <div className={s.barChartWrap}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={topExchanges}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                >
                  <XAxis type="number" hide axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="exchangeName"
                    type="category"
                    width={90}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: 'var(--ds-text-secondary)',
                      fontFamily: 'var(--font-fa, inherit)',
                    }}
                  />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--ds-canvas-subtle)' }} />
                  <Bar
                    dataKey="txCount"
                    name="تراکنش"
                    fill="var(--nova-cyan)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* ── Settlement Distribution ── */}
        <motion.div
          className={s.chartCard}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={s.cardHead}>
            <span className={`${s.cardHeadIcon} ${s['cardHeadIcon--violet']}`} aria-hidden>
              <CheckCircle2 size={16} />
            </span>
            <h3 className={s.cardTitle}>وضعیت تسویه‌ها</h3>
          </div>

          {settlementDist.length === 0 ? (
            <div className={s.noData}>داده‌ای وجود ندارد</div>
          ) : (
            <>
              <div className={s.pieWrap}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={settlementDist}
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="status"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {settlementDist.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={SETTLEMENT_TONE[entry.status] ?? 'var(--ds-text-muted)'}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className={s.settleLegend}>
                {settlementDist.map((row) => (
                  <div key={row.status} className={s.settleRow}>
                    <span
                      className={s.settleDot}
                      style={{ background: SETTLEMENT_TONE[row.status] ?? 'var(--ds-text-muted)' }}
                    />
                    <span className={s.settleLabel}>{SETTLE_LABEL[row.status] ?? row.status}</span>
                    <span className={s.settleCount}>{fmt(row.count)}</span>
                    <span className={s.settlePct}>
                      {settleTotal > 0 ? `${Math.round((row.count / settleTotal) * 100)}٪` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
