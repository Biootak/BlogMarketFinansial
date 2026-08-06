'use client';

import { Waves } from 'lucide-react';
import { useId } from 'react';

import { bucketLabel, faNum, faPercent, hourKey, ratio } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import d from './deck.module.css';

const VIEW_W = 240;
const VIEW_H = 72;
const TOP_PAD = 6;

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

/**
 * ریج ۲۴ ساعته — به‌جای ستون‌های میله‌ای، یک خط‌الرأسِ هموار با بندِ خطا زیرش.
 *
 * RTL: خودِ SVG در مختصات چپ‌به‌راست رسم می‌شود (قدیمی‌ترین در x=0) و فقط با یک
 * `scaleX(-1)` در `dir=rtl` آینه می‌شود. هیچ متنی داخل SVG نیست، پس چیزی
 * برعکس خوانده نمی‌شود. لایهٔ هدف‌های لمسی HTML و flex است، یعنی خودش در RTL
 * از راست شروع می‌کند و دقیقاً روی همان ساعتِ زیرش می‌نشیند.
 */
export function RidgeChart() {
  const gradientId = useId();
  const { data, hour, setHour } = useObs();
  if (!data) return null;

  const { hourly, hourlyErrors, windowHours, generatedAt } = data;
  const total = hourly.reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return (
      <ObsEmpty
        icon={Waves}
        title="جریانی برای رسم نیست"
        hint="به‌محض اینکه SystemLog رکورد بگیرد، خط‌الرأس حجم هر ساعت به‌همراه بند خطا همین‌جا کشیده می‌شود."
      />
    );
  }

  const max = Math.max(...hourly, 1);
  const volume = points(hourly, max);
  const errors = points(hourlyErrors, max);
  const line = smooth(volume);
  const area = `${line} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;

  const selected = hour ?? windowHours - 1;
  const selectedTotal = hourly[selected] ?? 0;
  const selectedErrors = hourlyErrors[selected] ?? 0;
  const selectedRate = selectedTotal > 0 ? (selectedErrors / selectedTotal) * 100 : 0;

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
            <line x1="0" y1="18" x2={VIEW_W} y2="18" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="39" x2={VIEW_W} y2="39" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="60" x2={VIEW_W} y2="60" vectorEffect="non-scaling-stroke" />
          </g>

          <path className={d.ridgeArea} d={area} fill={`url(#${gradientId})`} />
          <path className={d.ridgeLine} d={line} vectorEffect="non-scaling-stroke" />
          <path className={d.ridgeErrLine} d={smooth(errors)} vectorEffect="non-scaling-stroke" />
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
                  data-active={index === selected}
                  data-error={errorCount > 0}
                  aria-pressed={index === selected}
                  aria-label={`${label} — ${faNum(value)} رویداد، ${faNum(errorCount)} خطا`}
                  onClick={() => setHour(index)}
                  onFocus={() => setHour(index)}
                >
                  <span className={d.ridgeStem} aria-hidden="true" />
                  <span
                    className={d.ridgeDrop}
                    style={{ blockSize: `${ratio(errorCount, max, 0)}%` }}
                    aria-hidden="true"
                  />
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

      <div className={d.readout} aria-live="polite">
        <p className={d.readoutHour}>{bucketLabel(generatedAt, selected, windowHours)}</p>
        <p className={d.readoutMain}>
          {faNum(selectedTotal)}
          <span className={d.readoutUnit}>رویداد</span>
        </p>
        <ul className={d.readoutFacts}>
          <li data-tone={selectedErrors > 0 ? 'bad' : 'ok'}>
            <span>خطا</span>
            <b>{faNum(selectedErrors)}</b>
          </li>
          <li data-tone={selectedRate > 2 ? 'warn' : 'idle'}>
            <span>نرخ خطا</span>
            <b>{faPercent(selectedRate)}</b>
          </li>
          <li data-tone="idle">
            <span>سهم شبانه‌روز</span>
            <b>{faPercent((selectedTotal / total) * 100)}</b>
          </li>
        </ul>
      </div>
    </div>
  );
}
