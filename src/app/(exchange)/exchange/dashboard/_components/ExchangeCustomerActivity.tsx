/**
 * ExchangeCustomerActivity — خلاصهٔ فعالیت اخیر مشتریان.
 *
 * چهار KPI فشرده:
 *   - ثبت‌نام ۷ روز اخیر
 *   - فعال‌سازی ۷ روز اخیر (تراکنش داشته)
 *   - میانگین تراکنش به ازای هر مشتری فعال
 *   - درصد فعال‌سازی
 *
 * Server Component.
 */

import type { CustomerActivity } from '@/actions/exchange-dashboard';
import { Activity, Percent, UserCheck, UserPlus } from 'lucide-react';
import s from './ExchangeDashboard.module.css';

function formatFaNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function formatPercent(share: number): string {
  return new Intl.NumberFormat('fa-IR', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(share);
}

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  Icon: typeof UserPlus;
  tone: 'emerald' | 'amber' | 'sky' | 'muted';
}

function MetricCard({ label, value, sub, Icon, tone }: MetricCardProps) {
  return (
    <div className={s.custMetric} data-tone={tone}>
      <div className={s.custMetricHead}>
        <span className={s.custMetricIcon} aria-hidden>
          <Icon size={13} strokeWidth={1.75} />
        </span>
        <span className={s.custMetricLabel}>{label}</span>
      </div>
      <div className={s.custMetricValue} dir="ltr">
        {value}
      </div>
      <div className={s.custMetricSub}>{sub}</div>
    </div>
  );
}

export default function ExchangeCustomerActivity({ data }: { data: CustomerActivity }) {
  return (
    <div className={s.custActivity}>
      <MetricCard
        label="ثبت‌نام ۷ روز اخیر"
        value={formatFaNumber(data.newLast7d)}
        sub="مشتری جدید"
        Icon={UserPlus}
        tone="emerald"
      />
      <MetricCard
        label="فعال ۷ روز اخیر"
        value={formatFaNumber(data.activatedLast7d)}
        sub="دست‌کم یک تراکنش"
        Icon={UserCheck}
        tone="sky"
      />
      <MetricCard
        label="میانگین تراکنش/مشتری"
        value={formatFaNumber(data.avgTxnPerActiveCustomer)}
        sub="در ۳۰ روز اخیر"
        Icon={Activity}
        tone="amber"
      />
      <MetricCard
        label="نرخ فعال‌سازی"
        value={formatPercent(data.activeRate)}
        sub="از کل مشتریان"
        Icon={Percent}
        tone="muted"
      />
    </div>
  );
}
