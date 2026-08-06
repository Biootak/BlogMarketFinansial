'use client';

import { Grid2x2 } from 'lucide-react';
import { Fragment } from 'react';

import { bucketLabel, cssVars, faNum, hourKey } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import h from './heat.module.css';

/**
 * ماتریس گرما — هر ردیف یک منبع لاگ واقعی، هر خانه یک ساعت.
 *
 * دو تغییر ساختاری مهم:
 *  ۱. خط‌کش ساعت بالای ماتریس **کلیک‌پذیر** است و مکان‌نمای زمانی سراسری را
 *     جابه‌جا می‌کند؛ پس ماتریس هم عضو همان دستگاه زمانیِ نوار لرزه‌نگار است،
 *     نه یک جزیرهٔ جدا. ۲۴ دکمه داریم نه ۱۹۲ (هر خانه دکمه نیست) تا DOM و
 *     هدف‌های لمسی سالم بمانند.
 *  ۲. خانهٔ دارای خطا علاوه بر رنگ یک **مثلث گوشه** می‌گیرد، چون رنگ هرگز
 *     نباید تنها حامل معنا باشد.
 */
export function SourceHeat() {
  const { data, hour, setHour, windowHours } = useObs();
  if (!data) return null;

  if (data.heat.length === 0) {
    return (
      <ObsEmpty
        icon={Grid2x2}
        title="منبعی ثبت نشده"
        hint="هر مقدار متمایز در ستون source جدول SystemLog یک ردیف اینجا می‌سازد و توزیع ساعتی‌اش رسم می‌شود."
      />
    );
  }

  const max = Math.max(1, ...data.heat.flatMap((row) => row.cells.map((cell) => cell.total)));
  const ticks = Array.from({ length: windowHours }, (_, index) => index);

  return (
    <div className={h.wrap}>
      <div className={h.grid}>
        <span className={h.corner} aria-hidden="true" />

        <div className={h.ruler}>
          {ticks.map((index) => (
            <button
              key={hourKey(index)}
              type="button"
              className={h.tick}
              data-active={index === hour}
              data-major={index % 6 === 0}
              onClick={() => setHour(index)}
              aria-pressed={index === hour}
              aria-label={`قفل مکان‌نما روی ${bucketLabel(data.generatedAt, index, windowHours)}`}
            >
              <span aria-hidden="true">{index % 6 === 0 ? bucketLabel(data.generatedAt, index, windowHours).slice(0, 2) : ''}</span>
            </button>
          ))}
        </div>

        {data.heat.map((row) => (
          <Fragment key={row.source}>
            <span className={h.label} title={`${row.source} · ${faNum(row.total)} رویداد`}>
              {row.source}
            </span>
            <div className={h.cells}>
              {row.cells.map((cell, index) => (
                <span
                  key={hourKey(index)}
                  className={h.cell}
                  data-error={cell.errors > 0}
                  data-active={index === hour}
                  style={cssVars({ '--level': Math.round((cell.total / max) * 100) })}
                  title={`${row.source} · ${bucketLabel(data.generatedAt, index, windowHours)} · ${faNum(cell.total)} رویداد${cell.errors > 0 ? ` · ${faNum(cell.errors)} خطا` : ''}`}
                />
              ))}
            </div>
          </Fragment>
        ))}

        <span aria-hidden="true" />
        <p className={h.axis}>
          <span>{faNum(windowHours)} ساعت پیش</span>
          <span>هم‌اکنون</span>
        </p>
      </div>

      <p className={h.legend}>
        <span className={h.swatchRamp} aria-hidden="true" />
        <span>کم تا زیاد</span>
        <span className={h.swatchError} aria-hidden="true" />
        <span>دارای خطا</span>
        <span className={h.legendHint}>شدت رنگ = حجم واقعی همان ساعت، نسبت به پرحجم‌ترین خانهٔ ماتریس.</span>
      </p>
    </div>
  );
}
