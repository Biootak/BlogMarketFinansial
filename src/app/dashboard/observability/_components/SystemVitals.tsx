'use client';

import { ShieldAlert } from 'lucide-react';

import { faNum, faPercent, hourKey, mbShort, ratio, uptimeFa, type ToneKey } from './format';
import { useObs } from './ObsProvider';
import d from './deck.module.css';

interface Rib {
  id: string;
  label: string;
  value: string;
  tone: ToneKey;
  /** ۰..۱۰۰ — وقتی تعریف نشده باشد فقط عدد نشان داده می‌شود، نه نوار. */
  fill?: number;
}

/**
 * دنده‌های حیاتی — هشت عدد واقعی سامانه در یک ستون فشرده.
 * هر دنده یک هیرلاین دارد که «بزرگی نسبی» را می‌رساند؛ عدد خالی بدون مقیاس
 * چیزی نمی‌گوید. هیچ عددی اینجا تخمینی نیست؛ همه از snapshot می‌آید.
 */
export function SystemVitals() {
  const { data } = useObs();
  if (!data) return null;

  const { totals, performance } = data;
  const maxHour = Math.max(...data.hourly, 1);

  const ribs: Rib[] = [
    {
      id: 'errors',
      label: 'خطای پنجره',
      value: faNum(totals.errors),
      tone: totals.errors > 0 ? 'bad' : 'ok',
      fill: ratio(totals.errors, Math.max(totals.logs, 1), 0),
    },
    {
      id: 'warns',
      label: 'هشدار',
      value: faNum(totals.warns),
      tone: totals.warns > 0 ? 'warn' : 'idle',
      fill: ratio(totals.warns, Math.max(totals.logs, 1), 0),
    },
    {
      id: 'throughput',
      label: 'لاگ ساعت اخیر',
      value: faNum(performance.logsPerHour),
      tone: 'info',
      fill: ratio(performance.logsPerHour, maxHour, 0),
    },
    {
      id: 'rate',
      label: 'نرخ خطا',
      value: faPercent(performance.errorRate),
      tone: performance.errorRate > 2 ? 'bad' : performance.errorRate > 0 ? 'warn' : 'ok',
      fill: ratio(performance.errorRate, 10, 0),
    },
    { id: 'sources', label: 'منابع فعال', value: faNum(totals.sources), tone: 'idle' },
    { id: 'audit', label: 'رد ممیزی', value: faNum(totals.audit), tone: 'idle' },
    { id: 'heap', label: 'حافظهٔ heap', value: mbShort(performance.memoryMb), tone: 'idle' },
    { id: 'uptime', label: 'عمر پروسه', value: uptimeFa(performance.uptimeSec), tone: 'idle' },
  ];

  return (
    <div className={d.vitals}>
      <p className={d.vitalsHead}>نشانه‌های حیاتی</p>

      <dl className={d.ribs}>
        {ribs.map((rib) => (
          <div key={rib.id} className={d.rib} data-tone={rib.tone}>
            <dt className={d.ribKey}>{rib.label}</dt>
            <dd className={d.ribVal}>{rib.value}</dd>
            {typeof rib.fill === 'number' ? (
              <span className={d.ribTrack} aria-hidden="true">
                <span className={d.ribFill} style={{ inlineSize: `${rib.fill}%` }} />
              </span>
            ) : null}
          </div>
        ))}
      </dl>

      <div className={d.pulse} aria-hidden="true">
        {data.hourly.map((value, index) => (
          <span
            key={hourKey(index)}
            className={d.pulseTick}
            data-tone={(data.hourlyErrors[index] ?? 0) > 0 ? 'bad' : 'ok'}
            style={{ blockSize: `${ratio(value, maxHour, 8)}%` }}
          />
        ))}
      </div>

      {totals.sampled ? (
        <p className={d.vitalsNote}>
          <ShieldAlert size={14} strokeWidth={1.5} aria-hidden="true" />
          حجم لاگ به سقف اسکن رسیده؛ اعداد نمونه‌ای از تازه‌ترین رکوردهاست.
        </p>
      ) : null}
    </div>
  );
}
