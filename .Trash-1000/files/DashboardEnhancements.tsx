'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CreditCard,
  History,
  LayoutGrid,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import s from './DashboardEnhancements.module.css';
import type { CustomerDashboardData } from '@/actions/customer-portal';

interface Props {
  data: CustomerDashboardData;
}

export default function DashboardEnhancements({ data }: Props) {
  const { recentTransactions, accounts } = data;

  // Process data for charts
  const chartData = recentTransactions
    .slice(0, 7)
    .reverse()
    .map((t) => ({
      name: new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(new Date(t.createdAt)),
      amount: t.amount,
      type: t.kind,
    }));

  const accountDistribution = accounts.map((a) => ({
    name: a.currency,
    value: a.balance,
  }));

  return (
    <div className={s.root}>
      {/* Quick Actions */}
      <div className={s.quickActions}>
        <Link href="/customer/transfer" className={s.actionBtn}>
          <Zap className={s.actionIcon} size={24} />
          <span className={s.actionLabel}>انتقال آنی</span>
        </Link>
        <Link href="/customer/accounts" className={s.actionBtn}>
          <PlusCircle className={s.actionIcon} size={24} />
          <span className={s.actionLabel}>حساب جدید</span>
        </Link>
        <Link href="/customer/kyc" className={s.actionBtn}>
          <ShieldCheck className={s.actionIcon} size={24} />
          <span className={s.actionLabel}>ارتقاء سطح</span>
        </Link>
        <Link href="/customer/transactions" className={s.actionBtn}>
          <History className={s.actionIcon} size={24} />
          <span className={s.actionLabel}>تاریخچه</span>
        </Link>
        <Link href="/customer/dashboard/virtual-cards" className={s.actionBtn}>
          <CreditCard className={s.actionIcon} size={24} />
          <span className={s.actionLabel}>کارت مجازی</span>
        </Link>
        <Link href="/customer/crypto" className={s.actionBtn}>
          <RefreshCw className={s.actionIcon} size={24} />
          <span className={s.actionLabel}>تبادل ارز</span>
        </Link>
      </div>

      {/* Analytics Charts */}
      <div className={s.chartsGrid}>
        <div className={s.chartCard}>
          <div className={s.chartHeader}>
            <h3 className={s.chartTitle}>روند تراکنش‌های اخیر</h3>
          </div>
          <div className={s.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand-accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-brand-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-background-secondary)',
                    border: '1px solid var(--color-border-secondary)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-brand-accent)"
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={s.chartCard}>
          <div className={s.chartHeader}>
            <h3 className={s.chartTitle}>توزیع موجودی ارزها</h3>
          </div>
          <div className={s.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountDistribution}>
                <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'var(--color-background-tertiary)' }}
                  contentStyle={{
                    background: 'var(--color-background-secondary)',
                    border: '1px solid var(--color-border-secondary)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="var(--color-viz-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
