'use client';

import { Grid2x2 } from 'lucide-react';
import { Fragment } from 'react';

import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { heatLevel, maxOf } from './chart';
import { bucketLabel, cssVars, faNum, hourKey, sourceName } from './format';
import h from './heat.module.css';

const LEVELS = [0, 1, 2, 3, 4] as const;

/**
 * ماتریس گرمای منبع × ساعت.
 *
 * این یک نمایشگر است نه یک کنترل: انتخاب ساعت جای دیگری انجام می‌شود
 * (نوار روز و مکان‌نمای سرصفحه) و ماتریس فقط ستون انتخاب‌شده را برجسته
 * می‌کند. دلیلش دسترس‌پذیری است — ۱۹۲ سلولِ کلیک‌پذیرِ ۱۰ پیکسلی نه هدف
 * لمسی قابل قبولی دارد و نه ناوبری صفحه‌کلید قابل تحملی.
 *
 * شدت پله‌ای است (۵ پله) نه پیوسته، چون چشم انسان اختلاف چنددرصدی روشنایی
 * را نمی‌خواند ولی پله را بله.
 */
export function SourceHeat() {
  const { data, hour, windowHours } = useObs();
  const rows = data?.heat ?? [];

  if (!data || rows.length === 0) {
    return (
      <ObsEmpty
        icon={Grid2x2}
        title="ماتریسی برای رسم نیست"
        hint="هیچ منبعی در پنجرهٔ جاری لاگ نفرستاده است، پس شبکهٔ منبع در ساعت خالی می‌ماند."
      />
    );
  }

  /* سقف مشترک بین همهٔ سطرها — وگرنه هر سطر مقیاس خودش را می‌گیرد و
     مقایسهٔ بین منابع بی‌معنا می‌شود. */
  const ceiling = Math.max(1, maxOf(rows.flatMap((row) => row.cells.map((cell) => cell.total))));

  return (
    <div className={h.heat}>
      <div
        className={h.grid}
        dir="ltr"
        role="img"
        aria-label={`ماتریس حجم لاگ برای ${faNum(rows.length)} منبع در ${faNum(windowHours)} ساعت گذشته`}
        style={cssVars({ '--cols-template': `repeat(${windowHours}, minmax(0, 1fr))` })}
      >
        {rows.map((row) => (
          <Fragment key={row.source}>
            {row.cells.map((cell, index) => (
              <span
                key={`${row.source}-${hourKey(index)}`}
                className={h.cell}
                data-level={heatLevel(cell.total, ceiling)}
                data-errors={cell.errors > 0 ? 'true' : undefined}
                data-cursor={index === hour ? 'true' : undefined}
                title={`${sourceName(row.source)} · ${bucketLabel(data.generatedAt, index, windowHours)} · ${faNum(cell.total)} رویداد · ${faNum(cell.errors)} خطا`}
              />
            ))}
            <span className={h.rowLabel} dir="rtl">
              <bdi>{sourceName(row.source)}</bdi>
              <span className={h.rowTotal}>{faNum(row.total)}</span>
            </span>
          </Fragment>
        ))}
      </div>

      <p className={h.foot}>
        <span className={h.scale}>
          کم
          {LEVELS.map((level) => (
            <span key={level} className={h.swatch} data-level={level} aria-hidden="true" />
          ))}
          زیاد
        </span>
        <span className={h.scale}>
          <span className={h.swatchError} aria-hidden="true" />
          خانه‌ای که خطا داشته
        </span>
        <span>ستون برجسته: {bucketLabel(data.generatedAt, hour, windowHours)}</span>
      </p>
    </div>
  );
}
