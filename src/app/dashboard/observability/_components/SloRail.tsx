'use client';

import { Target } from 'lucide-react';

import { faNum, faPercent } from './format';
import { MeterBar } from './MeterBar';
import { readHealth } from './obsHealth';
import { useObs } from './ObsProvider';
import d from './deck.module.css';

/** هدف در دسترس بودن — سه‌نُه. مبنای محاسبهٔ بودجهٔ خطا. */
const AVAILABILITY_TARGET = 99.9;
/** آستانهٔ نرخ خطای ساعتی که «تحت فشار» شمرده می‌شود (درصد). */
const ERROR_RATE_BUDGET = 2;

/**
 * ریل بودجه — تنها جای صفحه که عدد را در برابر یک **هدف** می‌گذارد.
 *
 * چرا لازم بود: «۹۹٫۶٪ در دسترس» بدون هدف یک عدد خوش‌ظاهر است؛ در برابر هدف
 * ۹۹٫۹٪ یعنی چهار برابر بودجهٔ مجاز مصرف شده. همین تفاوت، تفاوت داشبورد
 * تزئینی با داشبورد عملیاتی است.
 *
 * هر عدد از snapshot می‌آید: در دسترس بودن از میانگین uptime سرویس‌های
 * ترافیک‌دار، نرخ خطا از پنجرهٔ یک ساعت، پایداری از شمار سرویس‌های قطع و کند.
 */
export function SloRail() {
  const { data } = useObs();
  if (!data) return null;

  const health = readHealth(data);
  const burn = Math.min(
    100,
    Math.max(0, ((100 - health.availability) / (100 - AVAILABILITY_TARGET)) * 100),
  );
  const rateBurn = Math.min(100, (data.performance.errorRate / ERROR_RATE_BUDGET) * 100);
  const unstable = health.down + health.degraded;

  const rows = [
    {
      id: 'availability',
      label: 'در دسترس بودن',
      value: faPercent(health.availability, 2),
      fill: Math.max(0, Math.min(100, (health.availability - 90) * 10)),
      target: (AVAILABILITY_TARGET - 90) * 10,
      tone: health.availability >= AVAILABILITY_TARGET ? ('ok' as const) : ('warn' as const),
      note: `هدف ${faPercent(AVAILABILITY_TARGET, 1)}`,
    },
    {
      id: 'burn',
      label: 'مصرف بودجهٔ خطا',
      value: faPercent(burn),
      fill: burn,
      tone: burn >= 100 ? ('bad' as const) : burn > 50 ? ('warn' as const) : ('ok' as const),
      note: burn >= 100 ? 'بودجه تمام شده' : 'از سهم مجاز شبانه‌روز',
    },
    {
      id: 'rate',
      label: 'نرخ خطای ساعت',
      value: faPercent(data.performance.errorRate),
      fill: rateBurn,
      target: 100,
      tone:
        data.performance.errorRate > ERROR_RATE_BUDGET
          ? ('bad' as const)
          : data.performance.errorRate > 0
            ? ('warn' as const)
            : ('ok' as const),
      note: `آستانه ${faPercent(ERROR_RATE_BUDGET, 0)}`,
    },
    {
      id: 'stability',
      label: 'سرویس ناسالم',
      value: faNum(unstable),
      fill: health.healthy + unstable > 0 ? (unstable / (health.healthy + unstable)) * 100 : 0,
      tone: health.down > 0 ? ('bad' as const) : unstable > 0 ? ('warn' as const) : ('ok' as const),
      note: `از ${faNum(health.healthy + unstable)} سرویس ترافیک‌دار`,
    },
  ];

  return (
    <div className={d.slo}>
      <p className={d.sloHead}>
        <Target size={14} strokeWidth={1.5} aria-hidden="true" />
        بودجه و هدف
      </p>

      <dl className={d.sloList}>
        {rows.map((row) => (
          <div key={row.id} className={d.sloRow} data-tone={row.tone}>
            <dt className={d.sloKey}>{row.label}</dt>
            <dd className={d.sloVal}>{row.value}</dd>
            <MeterBar value={row.fill} target={row.target} tone={row.tone} weight="bold" />
            <p className={d.sloNote}>{row.note}</p>
          </div>
        ))}
      </dl>
    </div>
  );
}
