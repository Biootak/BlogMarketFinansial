'use client';

import { useId } from 'react';

import { faNum, type ToneKey } from './format';
import d from './deck.module.css';

interface HealthRingProps {
  /** ۰..۱۰۰ */
  score: number;
  tone: ToneKey;
  label: string;
  /** وقتی داده‌ای نداریم عدد نشان نمی‌دهیم — «نمی‌دانیم» با «سالم» فرق دارد. */
  unknown?: boolean;
}

const R = 40;
const C = 2 * Math.PI * R;
/** قوس ۲۸۰ درجه با شکافِ ۸۰ درجه در پایین — سازِ اندازه‌گیری، نه حلقهٔ کامل. */
const SWEEP_DEG = 280;
const START_DEG = 130;
const ARC = (C * SWEEP_DEG) / 360;
const TICKS = [0, 0.25, 0.5, 0.75, 1] as const;

/** مختصات قطبی — θ از محور x به‌سمت پایین (سیستم مختصات SVG). */
function polar(radius: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return {
    x: Math.round((50 + radius * Math.cos(rad)) * 100) / 100,
    y: Math.round((50 + radius * Math.sin(rad)) * 100) / 100,
  };
}

/**
 * دیال سلامت.
 *
 * چرا قوس و نه حلقه: حلقهٔ بسته «درصد پیشرفت» را می‌رساند، ولی این عدد یک
 * **خوانش ساز** است نه پیشرفت. قوسِ باز با تیک‌های مدرج و یک مکان‌نمای نقطه‌ای
 * همان چیزی است که چشم از یک گیج انتظار دارد — بدون عقربهٔ تزئینی و بدون glow.
 *
 * پیاده‌سازی: یک `<circle>` با stroke-dasharray و یک چرخش ثابت. حرکت فقط از
 * transition روی stroke-dasharray می‌آید، هیچ keyframe و هیچ JS انیمیشنی نیست.
 * SVG جهت‌مستقل است (هیچ متنی داخلش نیست) پس در RTL نیازی به آینه ندارد.
 */
export function HealthRing({ score, tone, label, unknown = false }: HealthRingProps) {
  const titleId = useId();
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const filled = unknown ? 0 : (safe / 100) * ARC;
  const cursor = polar(R, START_DEG + (SWEEP_DEG * safe) / 100);

  return (
    <div className={d.dial} data-tone={tone}>
      <svg className={d.dialSvg} viewBox="0 0 100 100" role="img" aria-labelledby={titleId}>
        <title id={titleId}>
          {unknown ? 'شاخص سلامت در دسترس نیست' : `شاخص سلامت سامانه: ${safe} از ۱۰۰`}
        </title>

        <g transform={`rotate(${START_DEG} 50 50)`}>
          <circle
            className={d.dialTrack}
            cx="50"
            cy="50"
            r={R}
            strokeDasharray={`${ARC.toFixed(2)} ${(C - ARC).toFixed(2)}`}
          />
          <circle
            className={d.dialArc}
            cx="50"
            cy="50"
            r={R}
            strokeDasharray={`${filled.toFixed(2)} ${(C - filled).toFixed(2)}`}
          />
        </g>

        <g className={d.dialTicks}>
          {TICKS.map((step) => {
            const deg = START_DEG + SWEEP_DEG * step;
            const from = polar(31, deg);
            const to = polar(35, deg);
            return (
              <line
                key={`tick-${step}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>

        {unknown ? null : <circle className={d.dialCursor} cx={cursor.x} cy={cursor.y} r="3.4" />}
      </svg>

      <span className={d.dialCore}>
        <b className={d.dialScore}>{unknown ? '—' : faNum(safe)}</b>
        <span className={d.dialUnit}>{unknown ? 'بدون خوانش' : 'از ۱۰۰'}</span>
      </span>

      <p className={d.dialLabel}>{label}</p>
    </div>
  );
}
