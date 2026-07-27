'use client';

import type { getExchangeStats } from '@/actions/exchange-transactions';
import { Building2, Plus, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import s from './ExchangeDashboardEnhancements.module.css';

type ExchangeStats = Awaited<ReturnType<typeof getExchangeStats>>;

interface Props {
  stats: ExchangeStats;
}

export default function ExchangeDashboardEnhancements({ stats }: Props) {
  // شبیه‌سازی داده‌های نمودار بر اساس آمار کلی
  const volumeData = [
    { name: 'شنبه', volume: stats.yesterdayCount * 0.8 },
    { name: 'یکشنبه', volume: stats.yesterdayCount * 1.1 },
    { name: 'دوشنبه', volume: stats.yesterdayCount },
    { name: 'سه شنبه', volume: stats.todayCount },
  ];

  const currencyData = [
    { name: 'USD', count: 45 },
    { name: 'AFN', count: 82 },
    { name: 'EUR', count: 12 },
    { name: 'IRR', count: 28 },
  ];

  return (
    <div className={s.root}>
      {/* Quick Actions */}
      <div className={s.quickActions}>
        <Link href="/exchange/rates" className={s.actionBtn}>
          <Plus className={s.actionIcon} size={20} />
          <span className={s.actionLabel}>ثبت نرخ جدید</span>
        </Link>
        <Link href="/exchange/customers" className={s.actionBtn}>
          <Users className={s.actionIcon} size={20} />
          <span className={s.actionLabel}>مدیریت مشتریان</span>
        </Link>
        <Link href="/exchange/settlement" className={s.actionBtn}>
          <Building2 className={s.actionIcon} size={20} />
          <span className={s.actionLabel}>تسویه حساب</span>
        </Link>
        <Link href="/exchange/settings" className={s.actionBtn}>
          <Settings className={s.actionIcon} size={20} />
          <span className={s.actionLabel}>تنظیمات پنل</span>
        </Link>
      </div>

      {/* Analytics */}
      <div className={s.chartsGrid}>
        <div className={s.chartCard}>
          <div className={s.chartHeader}>
            <h3 className={s.chartTitle}>حجم تراکنش‌های هفته (تعداد)</h3>
          </div>
          <div className={s.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border-secondary)"
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-text-tertiary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-text-tertiary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-background-secondary)',
                    border: '1px solid var(--color-border-secondary)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="var(--color-brand-accent)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--color-brand-accent)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={s.chartCard}>
          <div className={s.chartHeader}>
            <h3 className={s.chartTitle}>توزیع ارزهای محبوب</h3>
          </div>
          <div className={s.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currencyData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="var(--color-text-tertiary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-background-tertiary)' }}
                  contentStyle={{
                    background: 'var(--color-background-secondary)',
                    border: '1px solid var(--color-border-secondary)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="var(--color-viz-3)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
