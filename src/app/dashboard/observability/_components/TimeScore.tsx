'use client';

import { Waves } from 'lucide-react';
import { useCallback, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';

import { bucketLabel, cssVars, faNum, faPercent, hourKey, ratio } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import d from './deck.module.css';

/**
 * TimeScore — «پارتیتور زمانی»، ستون فقرات بصری کل مرکز مشاهده‌پذیری.
 * ─────────────────────────────────────────────────────────────
 *  ایدهٔ ساختاری: به‌جای اینکه هر نمودار محور زمان خودش را داشته باشد، همهٔ
 *  لایه‌ها روی **یک** محور ۲۴ ساعته قفل می‌شوند (CSS subgrid) و یک مکان‌نمای
 *  واحد در همهٔ لایه‌ها ساعت انتخاب‌شده را نشان می‌دهد. نتیجه: چشم یک محور
 *  یاد می‌گیرد و مقایسهٔ «حجم ↔ خطا ↔ بحران» بدون جابه‌جایی نگاه ممکن می‌شود.
 *
 *  RTL/LTR: خودِ SVG در مختصات چپ‌به‌راست رسم می‌شود و فقط در dir=rtl با
 *  scaleX(-1) آینه می‌گردد (هیچ متنی داخلش نیست، پس چیزی برعکس خوانده
 *  نمی‌شود). لایه‌های سلولی و هدف‌های لمسی گرید HTML هستند، پس خودشان در RTL
 *  از راست شروع می‌کنند. مکان‌نما با `--obs-dir` علامتش را برمی‌گرداند تا
 *  دقیقاً روی همان ستون بنشیند.
 *
 *  کارایی: تنها transform/opacity انیمیت می‌شوند؛ هیچ layout thrash نداریم.
 */

const VIEW_W = 240;
const VIEW_H = 64;
const TOP_PAD = 5;

interface Point {
  x: number;
  y: number;
}

function points(values: number[], max: number): Point[] {
  const last = Math.max(1, values.length - 1);
  return values.map((value, index) => ({
    x: Math.round(((index / last) * VIEW_W + Number.EPSILON) * 100) / 100,
    y:
      Math.round(
        (VIEW_H - (Math.max(0, value) / max) * (VIEW_H - TOP_PAD) + Number.EPSILON) * 100,
      ) / 100,
  }));
}

/** هموارسازی افقی — هر قطعه یک بزیهٔ درجه‌سه با دستگیره‌های عمودی روی نیمهٔ بازه. */
function smooth(list: Point[]): string {
  const head = list[0];
  if (!head) return '';
  let path = `M ${head.x} ${head.y}`;
  for (let index = 1; index < list.length; index += 1) {
    const prev = list[index - 1];
    const curr = list[index];
    if (!prev || !curr) continue;
    const mid = Math.round(((prev.x + curr.x) / 2 + Number.EPSILON) * 100) / 100;
    path += ` C ${mid} ${prev.y} ${mid} ${curr.y} ${curr.x} ${curr.y}`;
  }
  return path;
}

export function TimeScore() {
  const gradientId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const { data, hour, windowHours, isLiveHour, setHour, resetHour } = useObs();

  /** جابه‌جایی مکان‌نما + بردن focus روی همان ستون (roving tabindex). */
  const move = useCallback(
    (delta: number) => {
      const next = Math.min(windowHours - 1, Math.max(0, hour + delta));
      setHour(next);
      const buttons = listRef.current?.querySelectorAll('button');
      buttons?.[next]?.focus();
    },
    [hour, windowHours, setHour],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLUListElement>) => {
      // جهت افقی به dir صفحه بستگی دارد: در RTL حرکت به راست یعنی عقب‌تر در زمان.
      const rtl = document.documentElement.dir === 'rtl';
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(rtl ? -1 : 1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(rtl ? 1 : -1);
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        move(-windowHours);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        move(windowHours);
      }
    },
    [move, windowHours],
  );

  if (!data) return null;

  const { hourly, hourlyErrors, incidents, generatedAt } = data;
  const total = hourly.reduce((sum, value) => sum + value, 0);

  const head = (
    <header className={d.scoreHead}>
      <h2 className={d.scoreTitle}>
        <Waves size={16} strokeWidth={1.5} aria-hidden="true" />
        پارتیتور شبانه‌روز
      </h2>
      <p className={d.scoreHint}>
        همهٔ لایه‌ها روی یک محور {faNum(windowHours)} ساعته قفل‌اند. با کلیک، Tab یا کلید جهت‌دار،
        مکان‌نما در تمام لایه‌ها و بلوک‌های پایین صفحه هم‌زمان جابه‌جا می‌شود.
      </p>
    </header>
  );

  if (total === 0) {
    return (
      <section className={d.scoreShell} aria-label="جریان شبانه‌روز">
        {head}
        <ObsEmpty
          icon={Waves}
          title="جریانی برای رسم نیست"
          hint="به‌محض اینکه SystemLog رکورد بگیرد، حجم هر ساعت، سهم خطا و پنجره‌های بحرانی روی همین محور کشیده می‌شوند."
        />
      </section>
    );
  }

  const max = Math.max(...hourly, 1);
  const maxErrors = Math.max(...hourlyErrors, 1);
  const volume = points(hourly, max);
  const line = smooth(volume);
  const area = `${line} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;
  const errorLine = smooth(points(hourlyErrors, max));

  const selectedTotal = hourly[hour] ?? 0;
  const selectedErrors = hourlyErrors[hour] ?? 0;
  const selectedRate = selectedTotal > 0 ? (selectedErrors / selectedTotal) * 100 : 0;
  const totalErrors = hourlyErrors.reduce((sum, value) => sum + value, 0);

  return (
    <section className={d.scoreShell} aria-label="جریان شبانه‌روز">
      {head}

      <div className={d.scoreScroll}>
        <div className={d.score} style={cssVars({ '--hours': windowHours, '--hour': hour })}>
          {/* لایهٔ ۱ — حجم رویداد */}
          <div className={d.stratum}>
            <div className={d.stratumLabel}>
              <span className={d.stratumName}>حجم رویداد</span>
              <span className={d.stratumMeta}>{faNum(total)}</span>
            </div>

            <div className={d.plot}>
              <div className={d.ridgeBox}>
                <svg
                  className={d.ridgeSvg}
                  viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop className={d.ridgeStopTop} offset="0%" />
                      <stop className={d.ridgeStopBottom} offset="100%" />
                    </linearGradient>
                  </defs>

                  <g className={d.ridgeGrid}>
                    <line x1="0" y1="16" x2={VIEW_W} y2="16" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1="34" x2={VIEW_W} y2="34" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1="52" x2={VIEW_W} y2="52" vectorEffect="non-scaling-stroke" />
                  </g>

                  <path className={d.ridgeArea} d={area} fill={`url(#${gradientId})`} />
                  <path className={d.ridgeLine} d={line} vectorEffect="non-scaling-stroke" />
                  <path className={d.ridgeErrLine} d={errorLine} vectorEffect="non-scaling-stroke" />
                </svg>

                <ul
                  className={d.hits}
                  ref={listRef}
                  onKeyDown={onKeyDown}
                  aria-label="انتخاب ساعت"
                >
                  {hourly.map((value, index) => {
                    const label = bucketLabel(generatedAt, index, windowHours);
                    const errorCount = hourlyErrors[index] ?? 0;
                    return (
                      <li key={hourKey(index)} className={d.hit}>
                        <button
                          type="button"
                          className={d.hitBtn}
                          data-active={index === hour}
                          tabIndex={index === hour ? 0 : -1}
                          aria-pressed={index === hour}
                          aria-label={`${label} — ${faNum(value)} رویداد، ${faNum(errorCount)} خطا`}
                          onClick={() => setHour(index)}
                          onFocus={() => setHour(index)}
                        >
                          {errorCount > 0 ? (
                            <span
                              className={d.hitDrop}
                              style={{ blockSize: `${ratio(errorCount, max, 8)}%` }}
                              aria-hidden="true"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <span className={d.playhead} aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* لایهٔ ۲ — تراکم خطا */}
          <div className={d.stratum} data-tone={totalErrors > 0 ? 'bad' : 'ok'}>
            <div className={d.stratumLabel}>
              <span className={d.stratumName}>تراکم خطا</span>
              <span className={d.stratumMeta}>{faNum(totalErrors)}</span>
            </div>

            <div className={d.plot}>
              <ul className={d.cells}>
                {hourlyErrors.map((value, index) => (
                  <li
                    key={hourKey(index)}
                    className={d.cell}
                    data-error={value > 0}
                    data-empty={value === 0}
                    style={cssVars({ '--level': ratio(value, maxErrors, 0) })}
                    title={`${bucketLabel(generatedAt, index, windowHours)} · ${faNum(value)} خطا`}
                  />
                ))}
              </ul>
              <span className={d.playhead} aria-hidden="true" />
            </div>
          </div>

          {/* لایهٔ ۳ — پنجره‌های بحرانی (فقط اگر وجود داشته باشند) */}
          {incidents.length > 0 ? (
            <div className={d.stratum} data-tone="bad">
              <div className={d.stratumLabel}>
                <span className={d.stratumName}>پنجرهٔ بحرانی</span>
                <span className={d.stratumMeta}>{faNum(incidents.length)}</span>
              </div>

              <div className={d.plot}>
                <div className={d.band}>
                  {incidents.map((incident) => {
                    const span = incident.toHour - incident.fromHour + 1;
                    return (
                      <span
                        key={incident.id}
                        className={d.bandFill}
                        style={{
                          insetInlineStart: `${(incident.fromHour / windowHours) * 100}%`,
                          inlineSize: `${(span / windowHours) * 100}%`,
                        }}
                        title={`${faNum(incident.errors)} خطا در ${faNum(span)} ساعت`}
                      />
                    );
                  })}
                </div>
                <span className={d.playhead} aria-hidden="true" />
              </div>
            </div>
          ) : null}

          {/* محور مشترک */}
          <div className={d.stratum}>
            <div className={d.stratumLabel}>
              <span className={d.stratumMeta}>ساعت</span>
            </div>
            <div className={d.plot}>
              <p className={d.axis}>
                {hourly.map((_, index) => (
                  <span
                    key={hourKey(index)}
                    className={index === hour ? `${d.tick} ${d.tickOn}` : d.tick}
                  >
                    {index % 4 === 0 || index === hour
                      ? bucketLabel(generatedAt, index, windowHours).slice(0, 5)
                      : ''}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className={d.legend}>
        <span className={d.legendItem}>
          <span className={d.swatchLine} aria-hidden="true" />
          خط‌الرأس حجم
        </span>
        <span className={d.legendItem}>
          <span className={d.swatchDash} aria-hidden="true" />
          خط خطا (هم‌مقیاس با حجم)
        </span>
        <span className={d.legendItem}>
          <span className={d.swatchBox} aria-hidden="true" />
          شدت خانه = تراکم
        </span>
      </p>

      <div className={d.readout} aria-live="polite">
        <p className={d.readoutHour}>
          <span className={d.readoutValue}>{faNum(selectedTotal)}</span>
          <span className={d.readoutUnit}>رویداد</span>
          <span className={d.readoutRange}>{bucketLabel(generatedAt, hour, windowHours)}</span>
        </p>

        <ul className={d.facts}>
          <li className={d.fact} data-tone={selectedErrors > 0 ? 'bad' : 'ok'}>
            <span className={d.factKey}>خطا</span>
            <span className={d.factVal}>{faNum(selectedErrors)}</span>
          </li>
          <li className={d.fact} data-tone={selectedRate > 2 ? 'warn' : 'idle'}>
            <span className={d.factKey}>نرخ خطا</span>
            <span className={d.factVal}>{faPercent(selectedRate)}</span>
          </li>
          <li className={d.fact} data-tone="idle">
            <span className={d.factKey}>سهم شبانه‌روز</span>
            <span className={d.factVal}>{faPercent((selectedTotal / total) * 100)}</span>
          </li>
          <li className={d.fact} data-tone={isLiveHour ? 'ok' : 'info'}>
            <span className={d.factKey}>مکان‌نما</span>
            {isLiveHour ? (
              <span className={d.factVal}>ساعت جاری</span>
            ) : (
              <button type="button" className={d.pinned} onClick={resetHour}>
                بازگشت به ساعت جاری
              </button>
            )}
          </li>
        </ul>
      </div>
    </section>
  );
}
