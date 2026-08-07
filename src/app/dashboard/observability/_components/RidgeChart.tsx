'use client';

import r from './LiveBar.module.css';
import { useObs } from './ObsProvider';
import { areaPath, axisPercent, linePath, maxOf, niceMax } from './chart';
import { bucketLabel, bucketStart, cssVars, faNum, hourKey } from './format';

const VIEW_W = 600;
const VIEW_H = 120;

/**
 * نوار سیگنال ۲۴ ساعت — امضای بصری این صفحه.
 * ─────────────────────────────────────────────────────────────
 *  دو سری روی یک بوم:
 *    سطحِ کم‌رنگ = حجم لاگ (مقیاس خودش)
 *    خط نازک    = خطا (مقیاس مستقل خودش)
 *  مقیاس‌ها عمداً جدا هستند وگرنه خطاها که یک‌صدم حجم‌اند روی کف صاف می‌شوند
 *  و نمودار دروغ می‌گوید. برای همین صراحتاً در راهنما نوشته شده «مقیاس مستقل».
 *
 *  محور زمان LTR قفل است: گذشت زمان از چپ به راست، ساعت جاری سمت راست.
 *  این تنها استثنای جهت در یک صفحهٔ کاملاً راست‌به‌چپ است و عمدی است.
 *
 *  کل نمودار یک SVG است: بدون کتابخانه، بدون canvas، بدون ری‌رندر سنگین.
 */
export function RidgeChart() {
  const { data, hour, windowHours } = useObs();

  const hourly = data?.hourly ?? [];
  const hourlyErrors = data?.hourlyErrors ?? [];
  const volumeMax = niceMax(maxOf(hourly));
  const errorMax = niceMax(maxOf(hourlyErrors));
  const hasVolume = maxOf(hourly) > 0;
  const hasErrors = maxOf(hourlyErrors) > 0;

  const geo = { width: VIEW_W, height: VIEW_H, padding: 3 };
  const volumeArea = areaPath(hourly, { ...geo, max: volumeMax });
  const volumeLine = linePath(hourly, { ...geo, max: volumeMax });
  const errorLine = linePath(hourlyErrors, { ...geo, max: errorMax });

  const cursor = axisPercent(hour, windowHours);
  const selectedVolume = hourly[hour] ?? 0;
  const selectedErrors = hourlyErrors[hour] ?? 0;
  const range = data ? bucketLabel(data.generatedAt, hour, windowHours) : '—';

  /* برچسب محور فقط هر شش ساعت — بیشتر از این روی موبایل روی هم می‌افتد */
  const ticks: Array<{ key: string; index: number; label: string }> = [];
  for (let index = 0; index < windowHours; index += 6) {
    ticks.push({
      key: hourKey(index),
      index,
      label: data ? bucketStart(data.generatedAt, index, windowHours) : '—',
    });
  }

  return (
    <div className={r.band}>
      <div className={r.plot} dir="ltr" style={cssVars({ '--cursor': `${cursor}%` })}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className={r.canvas}
          aria-hidden="true"
          focusable="false"
        >
          <line className={r.grid} x1="0" x2={VIEW_W} y1={VIEW_H * 0.25} y2={VIEW_H * 0.25} />
          <line className={r.grid} x1="0" x2={VIEW_W} y1={VIEW_H * 0.6} y2={VIEW_H * 0.6} />
          {hasVolume ? <path className={r.area} d={volumeArea} /> : null}
          {hasVolume ? <path className={r.line} d={volumeLine} /> : null}
          {hasErrors ? <path className={r.errorLine} d={errorLine} /> : null}
          <line className={r.base} x1="0" x2={VIEW_W} y1={VIEW_H - 3} y2={VIEW_H - 3} />
        </svg>

        <span className={r.cursor} aria-hidden="true" />

        {hasVolume ? null : <p className={r.quiet}>در پنجرهٔ جاری هیچ لاگی ثبت نشده است</p>}
      </div>

      <div className={r.axis} dir="ltr" aria-hidden="true">
        {ticks.map((tick) => (
          <span
            key={tick.key}
            style={cssVars({ '--at': `${axisPercent(tick.index, windowHours)}%` })}
          >
            {tick.label}
          </span>
        ))}
      </div>

      <p className={r.legend}>
        <span className={r.keyVolume}>حجم لاگ</span>
        <span className={r.keyError}>خطا (مقیاس مستقل)</span>
        <span className={r.readout} aria-live="polite">
          {range} · {faNum(selectedVolume)} رویداد · {faNum(selectedErrors)} خطا
        </span>
      </p>
    </div>
  );
}
