'use client';

/**
 * AuditWorkspace — سوابق عملیات صرافی (premium glass).
 *
 * KPI ها از همین آیتم‌های AuditLog محاسبه می‌شوند؛ فید با کامپوننت مشترک
 * StaffActivityFeed (از بخش کارکنان) رندر می‌شود — بدون کد تکراری.
 */

import type { StaffActivityItem } from '@/actions/exchanges';
import { KpiCard } from '@/components/Dashboard/primitives/KpiCard';
import { StatGrid } from '@/components/Dashboard/primitives/StatGrid';
import { ClipboardList, History, LogIn, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { StaffActivityFeed } from '../../staff/activity/_components/StaffActivityFeed';
import s from './AuditWorkspace.module.css';

interface Props {
  items: StaffActivityItem[];
}

const RISK_ACTIONS = new Set([
  'DEAL_CONFIRMED',
  'DEAL_COMPLETED',
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'FRAUD_RESOLVED',
  'FRAUD_CLOSED',
  'rate.updated',
  'staff.role.updated',
  'staff.invited',
  'staff.revoked',
]);

export default function AuditWorkspace({ items }: Props) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = items.filter((i) => new Date(i.createdAt) >= today).length;
    const loginCount = items.filter((i) => i.action === 'login').length;
    const riskCount = items.filter((i) => RISK_ACTIONS.has(i.action)).length;
    const actors = new Set(items.map((i) => i.actorName ?? i.actorEmail ?? '').filter(Boolean))
      .size;
    return { todayCount, loginCount, riskCount, actors };
  }, [items]);

  return (
    <div className={s.root}>
      <StatGrid>
        <KpiCard
          label="رویدادهای امروز"
          value={stats.todayCount}
          icon={ClipboardList}
          trend={stats.todayCount > 0 ? 'up' : 'neutral'}
          info="از کل رویدادهای نمایش‌داده‌شده"
        />
        <KpiCard label="ورود به پنل" value={stats.loginCount} icon={LogIn} info="در بازهٔ نمایش" />
        <KpiCard
          label="اقدامات پرریسک"
          value={stats.riskCount}
          icon={ShieldAlert}
          trend={stats.riskCount > 0 ? 'down' : 'neutral'}
          info="تأیید معامله، تغییر نرخ، دعوت/اخراج کارمند…"
        />
        <KpiCard
          label="اعضای فعال"
          value={stats.actors}
          icon={History}
          info="تعداد افراد دارای اقدام در بازه"
        />
      </StatGrid>

      <div className={s.feedPanel}>
        <StaffActivityFeed items={items} />
      </div>
    </div>
  );
}
