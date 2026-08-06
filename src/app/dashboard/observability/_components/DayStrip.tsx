'use client';

import { Waves } from 'lucide-react';

import { bucketLabel, faNum, hourKey, ratio } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { ScopeReadout } from './ScopeReadout';
import s from './obs.module.css';

/**
 * نوار روز — ستون‌های ساعتی حجم رویداد با کلاهکِ خطا.
 *
 * ستون‌ها با flex چیده می‌شوند نه با مختصات SVG، پس در RTL خودبه‌خود از راست
 * (قدیمی‌ترین) به چپ (هم‌اکنون) می‌روند و محور و ستون هرگز برعکس هم نمی‌افتند.
 * روی موبایل نوار اسکرول افقی می‌شود تا هر ستون هدف لمسی ۴۴ پیکسلی داشته باشد.
 *
 * خوانش ساعت از `ScopeReadout` مشترک می‌آید؛ قبلاً همان چهار عدد اینجا و در
 * نمودار deck دو بار جدا حساب می‌شد.
 */
export function DayStrip() {
  const { data, hour, setHour, windowHours } = useObs();
  if (!data) return null;

  const { hourly, hourlyErrors, generatedAt } = data;
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
  let peakIndex = 0;
  for (let index = 1; index < hourly.length; index += 1) {
    if ((hourly[index] ?? 0) > (hourly[peakIndex] ?? 0)) peakIndex = index;
  }

  return (
    <div className={s.strip}>
      <div className={s.stripMain}>
        <div className={s.stripScroller}>
          <ul className={s.stripList}>
            {hourly.map((value, index) => {
              const errors = hourlyErrors[index] ?? 0;
              const label = bucketLabel(generatedAt, index, windowHours);

              return (
                <li key={hourKey(index)} className={s.stripCol}>
                  <button
                    type="button"
                    className={s.stripBtn}
                    data-active={index === hour}
                    data-peak={index === peakIndex}
                    aria-pressed={index === hour}
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
                    <span className={s.stripTick}>
                      {index % 4 === 0 ? label.slice(0, 5) : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <p className={s.stripAxis}>
          <span>{faNum(windowHours)} ساعت پیش</span>
          <span>
            شلوغ‌ترین ساعت {bucketLabel(generatedAt, peakIndex, windowHours).slice(0, 5)}
          </span>
          <span>هم‌اکنون</span>
        </p>
      </div>

      <ScopeReadout layout="column" />
    </div>
  );
}
