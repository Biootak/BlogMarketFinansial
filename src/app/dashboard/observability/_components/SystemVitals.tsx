'use client';

import { Activity, ShieldAlert } from 'lucide-react';

import { faNum, faPercent, ratio, uptimeFa } from './format';
import { useObs } from './ObsProvider';
import s from './obs.module.css';

interface Verdict {
  tone: 'ok' | 'warn' | 'bad' | 'idle';
  label: string;
  note: string;
}

/**
 * ریل نشانه‌های حیاتی. رنگ کل ریل از خودِ داده می‌آید: وقتی سامانه سالم است
 * سبزِ کم‌اشباع، وقتی تحت فشار است کهربایی، و وقتی سرویسی افتاده سرخ.
 * یعنی رنگ اطلاعات است، نه تزئین.
 */
export function SystemVitals() {
  const { data } = useObs();

  if (!data) {
    return (
      <div className={s.vitals} data-tone="idle">
        <p className={s.verdictNote}>هنوز خوانشی از سامانه ثبت نشده است.</p>
      </div>
    );
  }

  const down = data.services.filter((service) => service.status === 'down').length;
  const degraded = data.services.filter((service) => service.status === 'degraded').length;
  const idle = data.services.filter((service) => service.status === 'idle').length;

  const verdict: Verdict =
    down > 0
      ? {
          tone: 'bad',
          label: 'ناپایدار',
          note: `${faNum(down)} سرویس خارج از سرویس است و نیاز به رسیدگی فوری دارد.`,
        }
      : degraded > 0 || data.performance.errorRate > 2
        ? {
            tone: 'warn',
            label: 'تحت فشار',
            note: `${faNum(degraded)} سرویس کند شده و نرخ خطا ${faPercent(data.performance.errorRate)} است.`,
          }
        : data.totals.logs === 0
          ? {
              tone: 'idle',
              label: 'بی‌صدا',
              note: 'در ۲۴ ساعت گذشته هیچ لاگی ثبت نشده؛ یا ترافیکی نبوده یا جمع‌آورنده خاموش است.',
            }
          : {
              tone: 'ok',
              label: 'پایدار',
              note: `${faNum(data.services.length - idle)} سرویس فعال، بدون قطعی در پنجرهٔ جاری.`,
            };

  const maxHour = Math.max(...data.hourly, 1);

  const rows: Array<{ key: string; value: string; tone?: 'ok' | 'warn' | 'bad' }> = [
    {
      key: 'خطا در پنجره',
      value: faNum(data.totals.errors),
      tone: data.totals.errors > 0 ? 'bad' : 'ok',
    },
    {
      key: 'هشدار',
      value: faNum(data.totals.warns),
      tone: data.totals.warns > 0 ? 'warn' : undefined,
    },
    { key: 'لاگ در ساعت اخیر', value: faNum(data.performance.logsPerHour) },
    { key: 'نرخ خطا', value: faPercent(data.performance.errorRate) },
    { key: 'منابع فعال', value: faNum(data.totals.sources) },
    { key: 'رد ممیزی', value: faNum(data.totals.audit) },
    { key: 'حافظهٔ heap', value: `${faNum(data.performance.memoryMb)} مگابایت` },
    { key: 'عمر پروسه', value: uptimeFa(data.performance.uptimeSec) },
  ];

  return (
    <div className={s.vitals} data-tone={verdict.tone}>
      <div className={s.verdict}>
        <div className={s.verdictTop}>
          <Activity size={18} strokeWidth={1.5} aria-hidden />
          <p className={s.verdictLabel}>{verdict.label}</p>
        </div>
        <p className={s.verdictNote}>{verdict.note}</p>
      </div>

      <div className={s.spine} aria-hidden>
        {data.hourly.map((total, index) => {
          const errors = data.hourlyErrors[index] ?? 0;
          const width = ratio(total, maxHour, 3);
          return (
            <span
              // اندیس سطل ساعتی پایدار است و ترتیبش هرگز جابه‌جا نمی‌شود
              // biome-ignore lint/suspicious/noArrayIndexKey: ساعت‌ها اندیس ثابت دارند
              key={index}
              className={s.spineRow}
            >
              <span
                className={s.spineTick}
                data-tone={errors > 0 ? 'bad' : 'ok'}
                style={{ inlineSize: `${width}%` }}
              />
            </span>
          );
        })}
      </div>

      <div className={s.spineLegend}>
        <span>قدیمی‌ترین ساعت</span>
        <span>هم‌اکنون</span>
      </div>

      <dl className={s.rows}>
        {rows.map((row) => (
          <div key={row.key} className={s.row}>
            <dt className={s.rowKey}>{row.key}</dt>
            <dd className={s.rowVal} data-tone={row.tone}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {data.totals.sampled ? (
        <p className={s.verdictNote}>
          <ShieldAlert size={14} strokeWidth={1.5} aria-hidden /> حجم لاگ به سقف اسکن رسیده؛ اعداد
          نمونه‌ای از تازه‌ترین رکوردهاست.
        </p>
      ) : null}
    </div>
  );
}
