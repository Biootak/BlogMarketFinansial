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

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * حلقهٔ سلامت — یک stroke نازکِ خودروشن به‌جای گیج و عقربه.
 * کمان با `stroke-dasharray` رسم می‌شود، پس فقط یک path است و هیچ JS انیمیشنی
 * لازم ندارد؛ transition روی `stroke-dasharray` کار حرکت را می‌کند.
 * SVG جهت‌مستقل است: هیچ متنی داخلش نیست و در RTL نیازی به flip ندارد.
 */
export function HealthRing({ score, tone, label, unknown = false }: HealthRingProps) {
  const titleId = useId();
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const filled = unknown ? 0 : (safe / 100) * CIRCUMFERENCE;

  return (
    <div className={d.ring} data-tone={tone}>
      <svg className={d.ringSvg} viewBox="0 0 100 100" role="img" aria-labelledby={titleId}>
        <title id={titleId}>
          {unknown ? 'شاخص سلامت در دسترس نیست' : `شاخص سلامت سامانه: ${safe} از ۱۰۰`}
        </title>
        <circle className={d.ringTrack} cx="50" cy="50" r={RADIUS} />
        <circle
          className={d.ringArc}
          cx="50"
          cy="50"
          r={RADIUS}
          strokeDasharray={`${filled.toFixed(2)} ${(CIRCUMFERENCE - filled).toFixed(2)}`}
        />
        <circle className={d.ringInner} cx="50" cy="50" r={RADIUS - 9} />
      </svg>

      <span className={d.ringCore}>
        <b className={d.ringScore}>{unknown ? '—' : faNum(safe)}</b>
        <span className={d.ringUnit}>{unknown ? 'بدون خوانش' : 'از ۱۰۰'}</span>
      </span>

      <p className={d.ringLabel}>{label}</p>
    </div>
  );
}
