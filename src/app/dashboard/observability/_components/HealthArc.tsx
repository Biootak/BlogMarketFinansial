'use client';

import { useId } from 'react';

import type { ToneKey } from './format';
import { faNum } from './format';
import d from './deck.module.css';

interface HealthArcProps {
  /** ۰..۱۰۰ */
  score: number;
  tone: ToneKey;
  /** وقتی داده‌ای نداریم کمان پر نمی‌شود — «نمی‌دانیم» با «سالم» فرق دارد. */
  unknown?: boolean;
}

const RADIUS = 40;
/** طول نیم‌دایره — مبنای stroke-dasharray. */
const ARC_LENGTH = Math.PI * RADIUS;

/** آستانه‌های عملیاتی روی کمان؛ همان اعدادی که در متن هم گفته می‌شوند. */
const THRESHOLDS = [
  { value: 40, outer: [37.64, 13.96], inner: [39.8, 20.62] },
  { value: 70, outer: [73.51, 19.64], inner: [69.4, 25.3] },
  { value: 90, outer: [88.04, 39.64], inner: [81.39, 41.8] },
] as const;

/**
 * کمانِ شاخص — یک ابزار اندازه‌گیریِ نازک، نه گیج و نه دونات.
 *
 * عدد عمداً **داخل** کمان نیست؛ در سرلوحه به‌عنوان بخشی از جمله خوانده می‌شود.
 * کمان فقط موقعیت نسبی آن عدد را در برابر آستانه‌های ۴۰/۷۰/۹۰ نشان می‌دهد.
 * کمان با stroke-dasharray رسم می‌شود، پس یک path است و هیچ JS انیمیشنی لازم
 * ندارد. SVG جهت‌مستقل است: هیچ متنی داخلش نیست و در RTL flip نمی‌خواهد.
 */
export function HealthArc({ score, tone, unknown = false }: HealthArcProps) {
  const titleId = useId();
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const filled = unknown ? 0 : (safe / 100) * ARC_LENGTH;

  return (
    <div className={d.arc} data-tone={tone}>
      <svg className={d.arcSvg} viewBox="0 0 100 60" role="img" aria-labelledby={titleId}>
        <title id={titleId}>
          {unknown ? 'شاخص سلامت در دسترس نیست' : `شاخص سلامت سامانه: ${safe} از ۱۰۰`}
        </title>

        <path className={d.arcTrack} d="M 10 52 A 40 40 0 0 1 90 52" />
        <path
          className={d.arcFill}
          d="M 10 52 A 40 40 0 0 1 90 52"
          strokeDasharray={`${filled.toFixed(2)} ${(ARC_LENGTH - filled).toFixed(2)}`}
        />

        {THRESHOLDS.map((mark) => (
          <line
            key={mark.value}
            className={d.arcTick}
            x1={mark.inner[0]}
            y1={mark.inner[1]}
            x2={mark.outer[0]}
            y2={mark.outer[1]}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <p className={d.arcScale} aria-hidden="true">
        <span>{faNum(0)}</span>
        <span>{faNum(50)}</span>
        <span>{faNum(100)}</span>
      </p>

      <p className={d.arcCaption}>
        آستانه‌ها: زیر {faNum(70)} نیازمند رسیدگی، زیر {faNum(40)} بحرانی.
      </p>
    </div>
  );
}
