'use client';

import { Waves } from 'lucide-react';
import { useId } from 'react';

import { bucketLabel, faNum, hourKey } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import d from './deck.module.css';

const VIEW_W = 240;
const VIEW_H = 100;
/** خط مبنا — حجم بالای آن، خطا آینه‌ای زیر آن. */
const BASE_Y = 66;
const UP_SPAN = 58;
const DOWN_SPAN = 28;

interface Point {
  x: number;
  y: number;
}

const round = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

function project(values: number[], max: number, up: boolean): Point[] {
  const last = Math.max(1, values.length - 1);
  const span = up ? UP_SPAN : DOWN_SPAN;
  const sign = up ? -1 : 1;
  return values.map((value, index) => ({
    x: round((index / last) * VIEW_W),
    y: round(BASE_Y + sign * (Math.max(0, value) / max) * span),
  }));
}

/** هموارسازی افقی — بزیهٔ درجه‌سه با دستگیره‌های عمودی روی نیمهٔ هر بازه. */
function smooth(list: Point[]): string {
  const head = list[0];
  if (!head) return '';
  let path = `M ${head.x} ${head.y}`;
  for (let index = 1; index < list.length; index += 1) {
    const prev = list[index - 1];
    const curr = list[index];
    if (!prev || !curr) continue;
    const mid = round((prev.x + curr.x) / 2);
    path += ` C ${mid} ${prev.y} ${mid} ${curr.y} ${curr.x} ${curr.y}`;
  }
  return path;
}

/**
 * نوار لرزه‌نگار شبانه‌روز.
 *
 * ایدهٔ ساختاری: به‌جای یک نمودار سطحی که خطا را زیر حجم قایم می‌کند، دو باندِ
 * **آینه‌ای** حول یک خط مبنا داریم. بالای خط حجم رویداد، پایین خط خطا. چشم
 * انسان تقارن را در چند صدم ثانیه می‌خواند، پس «کجا خطا با حجم هم‌زمان بالا
 * رفته» بی‌نیاز از مقایسهٔ دو نمودار جدا دیده می‌شود.
 *
 * صداقت مقیاس: باند خطا مقیاس **مستقل** دارد، چون خطا معمولاً چند دهم درصد
 * حجم است و روی مقیاس مشترک عملاً صفر دیده می‌شود. این نکته زیر نمودار صریح
 * نوشته شده تا کسی دو باند را هم‌مقیاس فرض نکند.
 *
 * RTL: SVG در مختصات چپ‌به‌راست رسم می‌شود (قدیمی‌ترین در x=0) و در `dir=rtl`
 * فقط با یک scaleX(-1) آینه می‌شود؛ هیچ متنی داخلش نیست. لایهٔ هدف‌های لمسی
 * HTML و flex است، پس خودش در RTL از راست شروع می‌کند و دقیقاً روی همان ساعتِ
 * زیرش می‌نشیند.
 */
export function RidgeChart() {
  const gradientId = useId();
  const { data, hour, setHour, windowHours } = useObs();
  if (!data) return null;

  const { hourly, hourlyErrors, generatedAt } = data;
  const total = hourly.reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return (
      <ObsEmpty
        icon={Waves}
        title="جریانی برای رسم نیست"
        hint="به‌محض اینکه SystemLog رکورد بگیرد، حجم هر ساعت بالای خط مبنا و خطای همان ساعت آینه‌ای زیر آن کشیده می‌شود."
      />
    );
  }

  const maxVolume = Math.max(...hourly, 1);
  const maxErrors = Math.max(...hourlyErrors, 1);

  const volume = project(hourly, maxVolume, true);
  const errors = project(hourlyErrors, maxErrors, false);

  const volumeLine = smooth(volume);
  const volumeArea = `${volumeLine} L ${VIEW_W} ${BASE_Y} L 0 ${BASE_Y} Z`;
  const errorLine = smooth(errors);
  const errorArea = `${errorLine} L ${VIEW_W} ${BASE_Y} L 0 ${BASE_Y} Z`;

  return (
    <div className={d.ridge}>
      <div className={d.ridgePlot}>
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
            <line x1="0" y1="20" x2={VIEW_W} y2="20" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="43" x2={VIEW_W} y2="43" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="82" x2={VIEW_W} y2="82" vectorEffect="non-scaling-stroke" />
          </g>

          <path className={d.ridgeArea} d={volumeArea} fill={`url(#${gradientId})`} />
          <path className={d.ridgeLine} d={volumeLine} vectorEffect="non-scaling-stroke" />

          <path className={d.ridgeErrArea} d={errorArea} />
          <path className={d.ridgeErrLine} d={errorLine} vectorEffect="non-scaling-stroke" />

          <line
            className={d.ridgeBase}
            x1="0"
            y1={BASE_Y}
            x2={VIEW_W}
            y2={BASE_Y}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <ul className={d.ridgeHits}>
          {hourly.map((value, index) => {
            const label = bucketLabel(generatedAt, index, windowHours);
            const errorCount = hourlyErrors[index] ?? 0;
            return (
              <li key={hourKey(index)} className={d.ridgeHit}>
                <button
                  type="button"
                  className={d.ridgeBtn}
                  data-active={index === hour}
                  data-error={errorCount > 0}
                  aria-pressed={index === hour}
                  aria-label={`${label} — ${faNum(value)} رویداد، ${faNum(errorCount)} خطا`}
                  onClick={() => setHour(index)}
                  onFocus={() => setHour(index)}
                >
                  <span className={d.ridgeStem} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className={d.ridgeAxis}>
        <span>{faNum(windowHours)} ساعت پیش</span>
        <span>{faNum(Math.round(windowHours / 2))} ساعت پیش</span>
        <span>هم‌اکنون</span>
      </p>

      <p className={d.ridgeNote}>
        بالای خط مبنا حجم رویداد (اوج {faNum(maxVolume)}) و زیر آن خطای همان ساعت (اوج{' '}
        {faNum(maxErrors)}). مقیاس دو باند مستقل است تا خطای کم‌حجم صفر دیده نشود.
      </p>
    </div>
  );
}
