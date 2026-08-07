'use client';

import { niceMax, tailScale } from './chart';
import { cssVars, faNum, msShort } from './format';
import { useObs } from './ObsProvider';
import g from './gauge.module.css';

/**
 * محور صدک‌ها.
 *
 * مقیاس ریشهٔ دوم است نه خطی. با محور خطی، وقتی p99 هزار برابر p50 باشد،
 * p50 و p95 روی هم می‌افتند و نمودار عملاً می‌گوید «همه‌چیز سریع است» —
 * دقیقاً برعکس واقعیت. ریشه دم را باز می‌کند بدون اینکه مثل لگاریتم خواندن
 * عدد را برای غیرمتخصص سخت کند.
 *
 * صداقت: اگر لاگ `duration=` نداشته باشیم، این اعداد مشتق‌شده‌اند و همین‌جا
 * روی صورتِ نمودار نوشته می‌شود، نه در یک tooltip پنهان.
 */
export function LatencyScale() {
  const { data } = useObs();
  const perf = data?.performance;

  const p50 = perf?.p50 ?? 0;
  const p95 = perf?.p95 ?? 0;
  const p99 = perf?.p99 ?? 0;
  const measured = perf?.latencySource === 'measured';
  const ceiling = niceMax(Math.max(p99, p95, p50, 1));

  const at50 = tailScale(p50, ceiling);
  const at95 = tailScale(p95, ceiling);
  const at99 = tailScale(p99, ceiling);

  const markers = [
    { key: 'p50', label: 'p50', value: p50, at: at50, place: 'bottom', tone: 'ok' },
    { key: 'p95', label: 'p95', value: p95, at: at95, place: 'top', tone: 'warn' },
    { key: 'p99', label: 'p99', value: p99, at: at99, place: 'bottom', tone: 'bad' },
  ] as const;

  return (
    <div className={g.scale}>
      <div
        className={g.plot}
        dir="ltr"
        role="img"
        aria-label={`صدک‌های تأخیر: p50 برابر ${msShort(p50)}، p95 برابر ${msShort(p95)}، p99 برابر ${msShort(p99)}`}
      >
        <span className={g.line} aria-hidden="true" />

        <span
          className={g.tail}
          aria-hidden="true"
          style={cssVars({ '--from': `${at95}%`, '--width': `${Math.max(0, at99 - at95)}%` })}
        />

        {markers.map((marker) => (
          <span
            key={marker.key}
            className={g.marker}
            data-tone={marker.tone}
            data-place={marker.place}
            style={cssVars({ '--at': `${marker.at}%` })}
          >
            <span className={g.markerLabel}>
              <span className={g.markerKey}>{marker.label}</span>
              <span className={g.markerValue}>{msShort(marker.value)}</span>
            </span>
          </span>
        ))}

        <span className={g.ticks} aria-hidden="true">
          <span>0</span>
          <span>{Math.round(ceiling / 4)}</span>
          <span>{ceiling}</span>
        </span>
      </div>

      <p className={g.note} data-tone={measured ? 'info' : 'idle'}>
        <span className={g.noteChip}>{measured ? 'اندازه‌گیری‌شده' : 'تخمینی'}</span>
        <span>
          {measured
            ? `از ${faNum(perf?.latencySamples ?? 0)} نمونهٔ واقعیِ ساعت اخیر محاسبه شده است.`
            : 'در ساعت اخیر هیچ لاگی با کلید duration ثبت نشده، پس این صدک‌ها مشتق‌شده‌اند نه اندازه‌گیری‌شده.'}
        </span>
        <span>ناحیهٔ رنگی بین p95 و p99 همان تجربهٔ کاربر بدشانس است.</span>
      </p>
    </div>
  );
}
