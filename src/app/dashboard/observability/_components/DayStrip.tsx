'use client';

import { Activity } from 'lucide-react';

<<<<<<< HEAD
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { bucketLabel, faNum, faPercent, ratio } from './format';
import s from './obs.module.css';
=======
import { maxOf } from './chart';
import {
  bucketLabel,
  bucketStart,
  cssVars,
  faNum,
  faPercent,
  hourKey,
  ratio,
} from './format';
import { ObsEmpty } from './ObsSection';
import { useObs } from './ObsProvider';
import g from './gauge.module.css';
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f

/**
 * نوار روز — تنها کنترلِ انتخاب ساعت در کل ماژول.
 *
 * چرا اینجا و نه روی ماتریس گرما: انتخاب باید یک هدف لمسی واقعی داشته باشد.
 * هر ستون یک دکمهٔ کامل با ارتفاع ۴۴ پیکسل است (حتی اگر خودِ ستون کوتاه
 * باشد) و روی موبایل ریل به‌جای فشرده شدن، اسکرول می‌شود.
 *
 * انتخاب در provider ذخیره می‌شود، پس نوار سیگنال سرصفحه، ماتریس گرما و
 * نمودارهای نردبان همگی روی همان لحظه قفل می‌شوند.
 */
export function DayStrip() {
<<<<<<< HEAD
  const { data, hour, setHour } = useObs();
  if (!data) return null;
  const { hourly, hourlyErrors, windowHours, generatedAt } = data;
  const total = hourly.reduce((sum, value) => sum + value, 0);
  if (total === 0)
    return (
      <ObsEmpty
        icon={Waves}
        title="جریانی برای نمایش نیست"
        hint="به‌محض اینکه SystemLog رکورد بگیرد، حجم هر ساعت اینجا رسم می‌شود."
      />
    );
  const max = Math.max(...hourly, 1);
  const selected = hour ?? windowHours - 1;
  const selectedTotal = hourly[selected] ?? 0;
  const selectedErrors = hourlyErrors[selected] ?? 0;
  const selectedRate = selectedTotal > 0 ? (selectedErrors / selectedTotal) * 100 : 0;
  let peakIndex = 0;
  for (let i = 1; i < hourly.length; i += 1)
    if ((hourly[i] ?? 0) > (hourly[peakIndex] ?? 0)) peakIndex = i;

  return (
    <div className={s.strip}>
      <div className={s.stripMain}>
        <div className={s.stripHeader}>
          <span>شدت رویداد</span>
          <span>
            <i className={s.legendVolume} /> حجم <i className={s.legendError} /> خطا
          </span>
        </div>
        <div className={s.stripScroller}>
          <ul className={s.stripList}>
            {hourly.map((value, index) => {
              const errors = hourlyErrors[index] ?? 0;
              const label = bucketLabel(generatedAt, index, windowHours);
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: سطل‌های ساعتی اندیس ثابت دارند
                <li key={index} className={s.stripCol}>
                  <button
                    type="button"
                    className={s.stripBtn}
                    data-active={index === selected}
                    aria-pressed={index === selected}
                    aria-label={`${label}، ${faNum(value)} رویداد، ${faNum(errors)} خطا`}
                    onClick={() => setHour(index)}
                    onFocus={() => setHour(index)}
                  >
                    <span className={s.stripTrack}>
                      <span
                        className={s.stripFill}
                        style={{ blockSize: `${ratio(value, max, 2)}%` }}
                      />
                      {errors > 0 ? (
                        <span
                          className={s.stripErr}
                          style={{ blockSize: `${ratio(errors, max, 2)}%` }}
                        />
                      ) : null}
                    </span>
                    <span className={s.stripTick}>{index % 4 === 0 ? label.slice(0, 5) : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <p className={s.stripAxis}>
          <span>{faNum(windowHours)} ساعت پیش</span>
          <span>هم‌اکنون</span>
        </p>
      </div>
      <aside className={s.readout} aria-live="polite">
        <p className={s.readoutHour}>{bucketLabel(generatedAt, selected, windowHours)}</p>
        <p className={s.readoutValue}>
          {faNum(selectedTotal)}
          <span className={s.readoutUnit}>رویداد</span>
        </p>
        <dl className={s.rows}>
          <div className={s.row}>
            <dt className={s.rowKey}>خطا</dt>
            <dd className={s.rowVal} data-tone={selectedErrors > 0 ? 'bad' : 'ok'}>
              {faNum(selectedErrors)}
            </dd>
          </div>
          <div className={s.row}>
            <dt className={s.rowKey}>نرخ خطا</dt>
            <dd className={s.rowVal}>{faPercent(selectedRate)}</dd>
          </div>
          <div className={s.row}>
            <dt className={s.rowKey}>سهم از شبانه‌روز</dt>
            <dd className={s.rowVal}>{faPercent((selectedTotal / total) * 100)}</dd>
          </div>
          <div className={s.row}>
            <dt className={s.rowKey}>شلوغ‌ترین ساعت</dt>
            <dd className={s.rowVal}>
              {bucketLabel(generatedAt, peakIndex, windowHours).slice(0, 5)}
            </dd>
          </div>
        </dl>
      </aside>
=======
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
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
    </div>
  );
}
