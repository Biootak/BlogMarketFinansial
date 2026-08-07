'use client';

import { Activity } from 'lucide-react';

import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { maxOf } from './chart';
import { bucketLabel, bucketStart, cssVars, faNum, faPercent, hourKey, ratio } from './format';
import g from './gauge.module.css';

/**
 * نوار روز — تنها کنترلِ انتخاب ساعت در کل ماژول.
 *
 * چرا اینجا و نه روی ماتریس گرما: انتخاب باید یک هدف لمسی واقعی داشته باشد.
 * هر ستون یک دکمهٔ کامل است و روی موبایل ریل به‌جای فشرده شدن، اسکرول می‌شود.
 *
 * انتخاب در provider ذخیره می‌شود، پس نوار سیگنال سرصفحه، ماتریس گرما و
 * نمودارهای نردبان همگی روی همان لحظه قفل می‌شوند.
 */
export function DayStrip() {
  const { data, hour, windowHours, isLiveHour, setHour } = useObs();

  if (!data) {
    return (
      <ObsEmpty
        icon={Activity}
        title="ریتمی برای نمایش نیست"
        hint="تا اولین خوانش نرسد، سطل‌های ساعتی خالی‌اند."
      />
    );
  }

  const hourly = data.hourly;
  const hourlyErrors = data.hourlyErrors;
  const peak = Math.max(1, maxOf(hourly));
  const totalLogs = data.totals.logs;

  const selectedVolume = hourly[hour] ?? 0;
  const selectedErrors = hourlyErrors[hour] ?? 0;
  const selectedShare = totalLogs > 0 ? (selectedVolume / totalLogs) * 100 : 0;
  const selectedErrorRate = selectedVolume > 0 ? (selectedErrors / selectedVolume) * 100 : 0;
  const inIncident = data.incidents.some(
    (incident) => hour >= incident.fromHour && hour <= incident.toHour,
  );

  return (
    <div className={g.strip}>
      <div className={g.rail} dir="ltr" role="group" aria-label="انتخاب سطل ساعتی">
        {hourly.map((value, index) => {
          const errors = hourlyErrors[index] ?? 0;
          const label = bucketLabel(data.generatedAt, index, windowHours);

          return (
            <button
              key={hourKey(index)}
              type="button"
              className={g.col}
              data-selected={index === hour ? 'true' : undefined}
              data-live={index === windowHours - 1 ? 'true' : undefined}
              aria-pressed={index === hour}
              onClick={() => setHour(index)}
              title={`${label} · ${faNum(value)} رویداد · ${faNum(errors)} خطا`}
              style={cssVars({
                '--h': `${ratio(value, peak, 3)}%`,
                '--e': `${ratio(errors, peak, 0)}%`,
              })}
            >
              <span className={g.colFill} aria-hidden="true" />
              {errors > 0 ? <span className={g.colErrors} aria-hidden="true" /> : null}
              <span className="sr-only">
                {label}، {faNum(value)} رویداد، {faNum(errors)} خطا
              </span>
            </button>
          );
        })}
      </div>

      <div className={g.axis} dir="ltr" aria-hidden="true">
        <span>{bucketStart(data.generatedAt, 0, windowHours)}</span>
        <span>{bucketStart(data.generatedAt, Math.floor(windowHours / 2), windowHours)}</span>
        <span>{bucketStart(data.generatedAt, windowHours - 1, windowHours)}</span>
      </div>

      <dl className={g.readout} aria-live="polite">
        <div className={g.readCell}>
          <dt className={g.readLabel}>بازه</dt>
          <dd className={g.readValue}>{bucketLabel(data.generatedAt, hour, windowHours)}</dd>
        </div>
        <div className={g.readCell}>
          <dt className={g.readLabel}>رویداد</dt>
          <dd className={g.readValue}>{faNum(selectedVolume)}</dd>
        </div>
        <div className={g.readCell}>
          <dt className={g.readLabel}>خطا</dt>
          <dd className={g.readValue}>{faNum(selectedErrors)}</dd>
        </div>
        <div className={g.readCell}>
          <dt className={g.readLabel}>سهم از پنجره</dt>
          <dd className={g.readValue}>{faPercent(selectedShare)}</dd>
        </div>

        <div className={g.readNote}>
          {inIncident
            ? `این ساعت داخل یک پنجرهٔ بحرانی است؛ نرخ خطای همین سطل ${faPercent(selectedErrorRate)} است.`
            : isLiveHour
              ? `ساعت جاری، نرخ خطای این سطل ${faPercent(selectedErrorRate)}. هر نیم دقیقه تازه می‌شود.`
              : `نرخ خطای این سطل ${faPercent(selectedErrorRate)} است. برای بازگشت به لحظهٔ جاری از سرصفحه استفاده کنید.`}
        </div>
      </dl>
    </div>
  );
}
