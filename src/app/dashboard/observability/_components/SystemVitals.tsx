'use client';

import { ShieldAlert } from 'lucide-react';

import { faNum, faPercent, mbShort, ratio, uptimeFa, type ToneKey } from './format';
import { MeterBar } from './MeterBar';
import { useObs } from './ObsProvider';
import d from './deck.module.css';

interface Gauge {
  id: string;
  label: string;
  value: string;
  tone: ToneKey;
  /** ۰..۱۰۰ — وقتی تعریف نشده باشد فقط عدد نشان داده می‌شود، نه ریل. */
  fill?: number;
  /** یک کلمه که می‌گوید این عدد نسبت به چه چیزی سنجیده شده. */
  scale?: string;
}

/**
 * بانک نشانه‌های حیاتی — هشت سازِ کوچک در یک نوار تمام‌عرض.
 *
 * قبلاً این هشت عدد در یک ستون باریک کنار deck چیده شده بودند و روی دسکتاپ
 * ارتفاع بی‌دلیل می‌ساختند. حالا یک «بانک» افقی‌اند: ۲ ستون موبایل، ۴ ستون
 * تبلت، ۸ ستون دسکتاپ. یعنی همان تراکم اطلاعات با یک‌سومِ ارتفاع.
 *
 * هیچ عددی اینجا تخمینی نیست؛ همه از snapshot می‌آید و هرکدام مقیاس نسبی‌اش
 * را هم می‌گوید، چون عدد خالی بدون مقیاس معنا ندارد.
 */
export function SystemVitals() {
  const { data } = useObs();
  if (!data) return null;

  const { totals, performance } = data;
  const maxHour = Math.max(...data.hourly, 1);

  const gauges: Gauge[] = [
    {
      id: 'logs',
      label: 'حجم پنجره',
      value: faNum(totals.logs),
      tone: 'info',
      fill: 100,
      scale: 'کل رکورد اسکن‌شده',
    },
    {
      id: 'errors',
      label: 'خطای پنجره',
      value: faNum(totals.errors),
      tone: totals.errors > 0 ? 'bad' : 'ok',
      fill: ratio(totals.errors, Math.max(totals.logs, 1), 0),
      scale: 'از کل حجم',
    },
    {
      id: 'warns',
      label: 'هشدار',
      value: faNum(totals.warns),
      tone: totals.warns > 0 ? 'warn' : 'idle',
      fill: ratio(totals.warns, Math.max(totals.logs, 1), 0),
      scale: 'از کل حجم',
    },
    {
      id: 'throughput',
      label: 'لاگ ساعت اخیر',
      value: faNum(performance.logsPerHour),
      tone: 'info',
      fill: ratio(performance.logsPerHour, maxHour, 0),
      scale: 'نسبت به اوج',
    },
    {
      id: 'rate',
      label: 'نرخ خطا',
      value: faPercent(performance.errorRate),
      tone: performance.errorRate > 2 ? 'bad' : performance.errorRate > 0 ? 'warn' : 'ok',
      fill: ratio(performance.errorRate, 10, 0),
      scale: 'تا سقف ۱۰٪',
    },
    {
      id: 'sources',
      label: 'منابع فعال',
      value: faNum(totals.sources),
      tone: 'idle',
      scale: 'مقدار متمایز source',
    },
    {
      id: 'heap',
      label: 'حافظهٔ heap',
      value: mbShort(performance.memoryMb),
      tone: 'idle',
      scale: 'پروسهٔ Node',
    },
    {
      id: 'uptime',
      label: 'عمر پروسه',
      value: uptimeFa(performance.uptimeSec),
      tone: 'idle',
      scale: 'از آخرین راه‌اندازی',
    },
  ];

  return (
    <div className={d.vitals}>
      <p className={d.vitalsHead}>نشانه‌های حیاتی</p>

      <dl className={d.bank}>
        {gauges.map((gauge) => (
          <div key={gauge.id} className={d.gauge} data-tone={gauge.tone}>
            <dt className={d.gaugeKey}>{gauge.label}</dt>
            <dd className={d.gaugeVal}>{gauge.value}</dd>
            {typeof gauge.fill === 'number' ? (
              <MeterBar value={gauge.fill} tone={gauge.tone} />
            ) : (
              <span className={d.gaugeNoMeter} aria-hidden="true" />
            )}
            {gauge.scale ? <p className={d.gaugeScale}>{gauge.scale}</p> : null}
          </div>
        ))}
      </dl>

      {totals.sampled ? (
        <p className={d.vitalsNote} data-tone="warn">
          <ShieldAlert size={14} strokeWidth={1.5} aria-hidden="true" />
          حجم لاگ به سقف اسکن رسیده؛ اعداد نمونه‌ای از تازه‌ترین رکوردهاست، نه شمارش کامل.
        </p>
      ) : null}
    </div>
  );
}
