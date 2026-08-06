'use client';

import { Grid2x2 } from 'lucide-react';

import { bucketLabel, cssVars, faNum, hourKey, ratio } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import h from './heat.module.css';

/**
 * ماتریس گرما — هر ردیف یک منبع لاگ واقعی از دیتابیس، هر خانه یک ساعت.
 *
 * روی **همان محور ۲۴ ساعتهٔ پارتیتور بالای صفحه** قفل است (subgrid)، پس ستون
 * ساعتِ ۱۴ اینجا دقیقاً زیر ستون ساعتِ ۱۴ در خط‌الرأس می‌افتد. هر خانه یک
 * دکمهٔ واقعی است: کلیک روی آن مکان‌نمای مشترک را جابه‌جا می‌کند، پس گرما فقط
 * تصویر نیست، ورودی هم هست.
 *
 * شدت رنگ = حجم؛ خانهٔ سرخ = آن ساعت خطا داشته. خانهٔ خالی با مرز مویی نشان
 * داده می‌شود نه با رنگ، تا «صفر» با «کم» اشتباه نشود.
 */
export function SourceHeat() {
  const { data, hour, windowHours, setHour } = useObs();
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

  return (
    <div className={h.wrap}>
      <div className={h.scroll}>
        <div className={h.grid} style={cssVars({ '--hours': windowHours, '--hour': hour })}>
          {data.heat.map((row) => (
            <div key={row.source} className={h.row}>
              <div className={h.label}>
                <span className={h.labelName} title={row.source}>
                  {row.source}
                </span>
                <span className={h.labelCount}>{faNum(row.total)}</span>
              </div>

              <div className={h.plot}>
                <ul className={h.cells}>
                  {row.cells.map((cell, index) => {
                    const label = bucketLabel(data.generatedAt, index, windowHours);
                    return (
                      <li key={hourKey(index)} className={h.cellWrap}>
                        <button
                          type="button"
                          className={h.cell}
                          data-error={cell.errors > 0}
                          data-empty={cell.total === 0}
                          data-active={index === hour}
                          tabIndex={index === hour ? 0 : -1}
                          style={cssVars({ '--level': ratio(cell.total, max, 0) })}
                          title={`${row.source} · ${label} · ${faNum(cell.total)} رویداد`}
                          aria-label={`${row.source} — ${label} — ${faNum(cell.total)} رویداد، ${faNum(cell.errors)} خطا`}
                          onClick={() => setHour(index)}
                        />
                      </li>
                    );
                  })}
                </ul>
                <span className={h.playhead} aria-hidden="true" />
              </div>
            </div>
          ))}

          <div className={h.axisRow}>
            <span aria-hidden="true" />
            <p className={h.axis}>
              <span>{faNum(windowHours)} ساعت پیش</span>
              <span>هم‌اکنون</span>
            </p>
          </div>
        </div>
      </div>

      <p className={h.legend}>
        <span className={h.legendItem}>
          <span className={`${h.swatch} ${h.swatchLow}`} aria-hidden="true" />
          حجم کم
        </span>
        <span className={h.legendItem}>
          <span className={`${h.swatch} ${h.swatchHigh}`} aria-hidden="true" />
          حجم زیاد
        </span>
        <span className={h.legendItem}>
          <span className={`${h.swatch} ${h.swatchError}`} aria-hidden="true" />
          دارای خطا
        </span>
      </p>
    </div>
  );
}
