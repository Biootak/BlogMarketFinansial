'use client';

import { getPlatformFinanceReport } from '@/actions/platform-finance-report';
import type {
  ExchangeVolumeRow,
  PlatformFinanceKpi,
  SettlementStatusDist,
  TransactionTrend,
} from '@/actions/platform-finance-report';
import { EmptyState } from '@/components/Dashboard/primitives';
import { BarChart3, Building2, CheckCircle2, Clock, TrendingUp, Users, Activity, Globe } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import s from './FinanceReport.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPersian(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function fmtCompact(n: number): string {
  return new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(n);
}

// ─── Components ────────────────────────────────────────────────────────────────

const SETTLEMENT_COLORS = ['#3E7096', '#C56443', '#6F8854', '#C68E31', '#836687'];

export default function FinanceReport() {
  const [data, setData] = useState<any>(null);
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
    } catch (e) {
      setError('Internal Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return (
    <div className={s.kpiGrid}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className={s.skeletonCard} />)}
    </div>
  );

  if (error) return <EmptyState icon={BarChart3} title="Error" description={error} />;
  if (!data) return <EmptyState icon={BarChart3} title="No Data" />;

  const { kpi, txTrend, topExchanges, settlementDist } = data;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={s.root}
    >
      <div className={s.kpiGrid}>
        <KpiCard icon={<TrendingUp />} label="کل تراکنش‌ها" value={fmtPersian(kpi.totalTransactions)} accent="#3E7096" />
        <KpiCard icon={<Activity />} label="در انتظار" value={fmtPersian(kpi.pendingTransactions)} accent="#C68E31" />
        <KpiCard icon={<Globe />} label="صراف‌های فعال" value={fmtPersian(kpi.activeExchanges)} accent="#6F8854" />
        <KpiCard icon={<Users />} label="مشتریان کل" value={fmtPersian(kpi.totalCustomers)} accent="#836687" />
      </div>

      <div className={s.chartCard}>
        <h3 className={s.chartTitle}><TrendingUp size={20} /> روند تراکنش‌های ۳۰ روزه</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={txTrend}>
              <defs>
                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3E7096" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3E7096" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--ds-shadow-lg)' }}
                labelStyle={{ display: 'none' }}
              />
              <Area type="monotone" dataKey="completed" stroke="#3E7096" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={s.bottomRow}>
        <div className={s.chartCard}>
          <h3 className={s.chartTitle}><Building2 size={20} /> صرافی‌های برتر</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={topExchanges} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="exchangeName" type="category" width={100} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="txCount" fill="#3E7096" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={s.chartCard}>
          <h3 className={s.chartTitle}><CheckCircle2 size={20} /> وضعیت تسویه‌حساب‌ها</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={settlementDist}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {settlementDist.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={SETTLEMENT_COLORS[index % SETTLEMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function KpiCard({ icon, label, value, accent }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={s.kpiCard} 
      style={{ '--accent': accent } as any}
    >
      <div className={s.kpiIcon}>{icon}</div>
      <div className={s.kpiValue}>{value}</div>
      <div className={s.kpiLabel}>{label}</div>
    </motion.div>
  );
}
