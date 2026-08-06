'use client';

import { Waves } from 'lucide-react';

import { faNum, faPercent, hourRange, ratio } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

/**
 * نوار روز — ستون‌های ساعتی حجم رویداد با کلاهکِ خطا.
 *
 * ستون‌ها با flex چیده می‌شوند نه با مختصات SVG، پس در RTL خودبه‌خود
 * از راست (قدیمی‌ترین) به چپ (هم‌اکنون) می‌روند و محور و ستون هرگز
 * برعکس هم نمی‌افتند. روی موبایل نوار اسکرول افقی می‌شود تا هر ستون
 * هدف لمسی ۴۴ پیکسلی داشته باشد.
 */
export function DayStrip() {
  const { data, hour, setHour } = useObs();
  if (!data) return null;

  const { hourly, hourlyErrors, windowHours, generatedAt } = data;
  const total = hourly.reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return (
      <ObsEmpty
        icon={Waves}
        title="جریانی برای نمایش نیست"
        hint="به‌محض اینکه SystemLog رکورد بگیرد، حجم هر ساعت به‌همراه سهم خطا همین‌جا ستون‌به‌ستون رسم می‌شود."
      />
    );
  }

  const max = Math.max(...hourly, 1);
  const selected = hour ?? windowHours - 1;
  const selectedTotal = hourly[selected] ?? 0;
  const selectedErrors = hourlyErrors[selected] ?? 0;
  const selectedRate = selectedTotal > 0 ? (selectedErrors / selectedTotal) * 100 : 0;

  let peakIndex = 0;
  for (let i = 1; i < hourly.length; i += 1) {
    if ((hourly[i] ?? 0) > (hourly[peakIndex] ?? 0)) peakIndex = i;
  }

  return (
    <div className={s.strip}>
      <div>
        <div className={s.stripScroller}>
          <ul className={s.stripList}>
            {hourly.map((value, index) => {
              const errors = hourlyErrors[index] ?? 0;
              const label = hourRange(generatedAt, index, windowHours).label;
              const showTick = index % 4 === 0;

              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: سطل‌های ساعتی اندیس ثابت دارند
                  key={index}
                  className={s.stripCol}
                >
                  <button
                    type="button"
                    className={s.stripBtn}
                    data-active={index === selected}
                    aria-pressed={index === selected}
                    aria-label={`${label} — ${faNum(value)} رویداد، ${faNum(errors)} خطا`}
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
                    <span className={s.stripTick}>{showTick ? label.slice(0, 5) : ''}</span>
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
        <p className={s.readoutHour}>{hourRange(generatedAt, selected, windowHours).label}</p>
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
            <dd className={s.rowVal}>{hourRange(generatedAt, peakIndex, windowHours).start}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
