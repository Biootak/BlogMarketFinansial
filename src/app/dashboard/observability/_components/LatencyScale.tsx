'use client';

<<<<<<< HEAD
import { Info } from 'lucide-react';

import { useObs } from './ObsProvider';
import { faNum, faPercent, msShort } from './format';
import s from './obs.module.css';
=======
import { niceMax, tailScale } from './chart';
import { cssVars, faNum, msShort } from './format';
import { useObs } from './ObsProvider';
import g from './gauge.module.css';
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f

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

<<<<<<< HEAD
  const { p50, p95, p99, latencySource, latencySamples } = data.performance;
  const max = Math.max(p99, p95, p50, 1) * 1.1;
  const tailRatio = p50 > 0 ? p99 / p50 : 0;
  const marks: Array<{ id: string; value: number; tone: 'ok' | 'warn' | 'bad' }> = [
    { id: 'p50', value: p50, tone: 'ok' },
    { id: 'p95', value: p95, tone: 'warn' },
    { id: 'p99', value: p99, tone: 'bad' },
  ];

  return (
    <div className={s.latencySurface}>
      <div className={s.scale}>
        <div
          className={s.scaleTrack}
          role="img"
          aria-label={`p50 ${msShort(p50)}، p95 ${msShort(p95)}، p99 ${msShort(p99)}`}
        >
          {marks.map((mark) => {
            const position = Math.min(97, (mark.value / max) * 100);
            return (
              <span
                key={mark.id}
                className={
                  mark.tone === 'ok'
                    ? s.scaleMarkOk
                    : mark.tone === 'warn'
                      ? s.scaleMarkWarn
                      : s.scaleMarkBad
                }
              >
                <span className={s.scaleMark} style={{ insetInlineStart: `${position}%` }} />
                <span className={s.scaleLabel} style={{ insetInlineStart: `${position}%` }}>
                  <b>{msShort(mark.value)}</b>
                  {mark.id}
                </span>
              </span>
            );
          })}
        </div>
        <p className={s.scaleAxis}>
          <span>{faNum(0)}</span>
          <span>{msShort(Math.round(max))}</span>
        </p>
      </div>
      <div className={s.latencyReadout}>
        <div>
          <span className={s.readoutKicker}>سیگنال تصمیم</span>
          <strong className={s.readoutHeadline}>
            {tailRatio > 0 ? `${tailRatio.toFixed(1)}×` : '—'}
          </strong>
          <span className={s.readoutCopy}>کشیدگی دم، p99 نسبت به p50</span>
        </div>
        <dl className={s.rows}>
          <div className={s.row}>
            <dt className={s.rowKey}>نرخ خطای ساعت اخیر</dt>
            <dd className={s.rowVal} data-tone={data.performance.errorRate > 2 ? 'bad' : 'ok'}>
              {faPercent(data.performance.errorRate)}
            </dd>
          </div>
          <div className={s.row}>
            <dt className={s.rowKey}>حجم لاگ ساعت اخیر</dt>
            <dd className={s.rowVal}>{faNum(data.performance.logsPerHour)}</dd>
          </div>
          <div className={s.row}>
            <dt className={s.rowKey}>نمونه‌های اندازه‌گیری‌شده</dt>
            <dd className={s.rowVal}>{faNum(latencySamples)}</dd>
          </div>
        </dl>
      </div>
      <p className={s.note}>
        <Info size={16} strokeWidth={1.5} aria-hidden />
        {latencySource === 'measured'
          ? `صدک‌ها از ${faNum(latencySamples)} نمونهٔ واقعی duration در لاگ‌های یک ساعت اخیر محاسبه شده‌اند.`
          : 'هنوز نمونهٔ کافی duration در لاگ‌ها نیست، پس این اعداد مشتق‌شده از حجم و نرخ خطا هستند نه اندازه‌گیری مستقیم. برای اعداد دقیق، در مسیرهای داغ الگوی duration=<ms> را لاگ کنید.'}
=======
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
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
      </p>
    </div>
  );
}
