'use client';

import { Grid2x2 } from 'lucide-react';
import { Fragment } from 'react';
import type { CSSProperties } from 'react';

import { bucketLabel, faNum } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import h from './heat.module.css';

/**
 * ماتریس گرما — هر ردیف یک منبع لاگ واقعی از دیتابیس، هر خانه یک ساعت.
 * شدت رنگ = حجم؛ خانهٔ سرخ = آن ساعت خطا داشته است.
 */
export function SourceHeat() {
  const { data } = useObs();
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
      <div className={h.grid}>
        {data.heat.map((row) => (
          <Fragment key={row.source}>
            <span className={h.label} title={`${row.source} · ${faNum(row.total)} رویداد`}>
              {row.source}
            </span>
            <div className={h.cells}>
              {row.cells.map((cell, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: ساعت‌ها اندیس ثابت دارند
                  key={index}
                  className={h.cell}
                  data-error={cell.errors > 0}
                  style={{ '--level': Math.round((cell.total / max) * 100) } as CSSProperties}
                  title={`${row.source} · ${bucketLabel(data.generatedAt, index, data.windowHours)} · ${faNum(cell.total)} رویداد`}
                />
              ))}
            </div>
          </Fragment>
        ))}

        <span aria-hidden />
        <p className={h.axis}>
          <span>{faNum(data.windowHours)} ساعت پیش</span>
          <span>هم‌اکنون</span>
        </p>
      </div>

      <p className={h.legend}>
        <span className={`${h.swatch} ${h.swatchLow}`} aria-hidden />
        کم
        <span className={`${h.swatch} ${h.swatchHigh}`} aria-hidden />
        زیاد
        <span className={`${h.swatch} ${h.swatchError}`} aria-hidden />
        دارای خطا
      </p>
    </div>
  );
}
