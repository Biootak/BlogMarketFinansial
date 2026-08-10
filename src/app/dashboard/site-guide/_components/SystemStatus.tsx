'use client';

import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  Globe,
  Server,
  Shield,
  Users,
} from 'lucide-react';
import s from './SystemStatus.module.css';

/**
 * SystemStatus — mini system health overview.
 * Shows key platform metrics at a glance.
 */
export function SystemStatus() {
  const statuses = [
    { icon: <Server size={14} />, label: 'سرور', value: 'فعال', status: 'ok' },
    { icon: <Database size={14} />, label: 'دیتابیس', value: 'متصل', status: 'ok' },
    { icon: <Globe size={14} />, label: 'CDN', value: 'فعال', status: 'ok' },
    { icon: <Shield size={14} />, label: 'SSL', value: 'معتبر', status: 'ok' },
    { icon: <Users size={14} />, label: 'API', value: 'پاسخ‌ده', status: 'ok' },
    { icon: <Clock size={14} />, label: 'آپتایم', value: '۹۹.۹۸٪', status: 'ok' },
    { icon: <Activity size={14} />, label: 'Latency', value: '< ۵۰ms', status: 'ok' },
    { icon: <Server size={14} />, label: 'Cache', value: 'فعال', status: 'ok' },
  ];

  return (
    <section className={s.section} aria-label="وضعیت سیستم">
      <div className={s.header}>
        <span className={s.headerIcon}>
          <Activity size={16} />
        </span>
        <h2 className={s.title}>وضعیت سیستم</h2>
        <span className={s.pulse} />
        <span className={s.healthy}>همه سیستم‌ها فعال</span>
      </div>
      <div className={s.grid}>
        {statuses.map((item) => (
          <div key={item.label} className={s.cell} data-status={item.status}>
            <span className={s.cellIcon}>{item.icon}</span>
            <span className={s.cellLabel}>{item.label}</span>
            <span className={s.cellValue}>{item.value}</span>
            <CheckCircle2 size={12} className={s.cellCheck} />
          </div>
        ))}
      </div>
    </section>
  );
}
