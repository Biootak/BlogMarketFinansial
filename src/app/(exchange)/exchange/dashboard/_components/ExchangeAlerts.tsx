/**
 * ExchangeAlerts — لیست وضعیت‌هایی که نیاز به اقدام دارند.
 *
 * Server Component. لینک مستقیم به صفحات مربوطه.
 */

import s from './ExchangeDashboard.module.css';
import Link from 'next/link';
import { Check, ChevronLeft } from 'lucide-react';
import type { DashboardAlert } from '@/actions/exchange-dashboard';

export default function ExchangeAlerts({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className={s.flowEmpty}>
        <Check size={14} aria-hidden style={{ color: 'var(--at-accent)', marginInlineEnd: 6, verticalAlign: 'middle' }} />
        هیچ هشدار فعالی وجود ندارد.
      </div>
    );
  }

  return (
    <ul className={s.alerts} aria-label="هشدارها">
      {alerts.map((a) => (
        <li key={a.id}>
          <Link href={a.href} className={s.alert} data-tone={a.tone}>
            <span className={s.alertDot} aria-hidden />
            <span className={s.alertBody}>
              <span className={s.alertTitle}>{a.title}</span>
              <span className={s.alertDetail}>{a.detail}</span>
            </span>
            <span className={s.alertMetric} dir="ltr">
              {new Intl.NumberFormat('fa-IR').format(a.metric)}
            </span>
            <ChevronLeft
              size={14}
              aria-hidden
              style={{
                color: 'var(--at-fg-muted)',
                transform: 'scaleX(-1)',
                flexShrink: 0,
              }}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
