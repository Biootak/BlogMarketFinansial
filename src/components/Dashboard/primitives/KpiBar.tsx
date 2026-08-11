'use client';

/**
 * KpiBar — horizontal progress bar for dashboard KPI displays.
 *
 * Shows a value relative to a max, with optional label and percentage.
 * Uses --nova-* / --ds-* tokens. RTL-safe with logical properties.
 *
 * Usage:
 *   <KpiBar value={72} max={100} label="سلامت سرویس" />
 */

import { useMemo } from 'react';
import s from './KpiBar.module.css';

export interface KpiBarProps {
  /** Current value */
  value: number;
  /** Maximum value (100 by default) */
  max?: number;
  /** Label shown above the bar */
  label?: string;
  /** Show percentage badge */
  showPercent?: boolean;
  /** Color tone — auto picks green/amber/red based on ratio */
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'auto';
  /** Bar height in px */
  height?: number;
}

export function KpiBar({
  value,
  max = 100,
  label,
  showPercent = true,
  tone = 'auto',
  height = 6,
}: KpiBarProps) {
  const { percent, toneClass } = useMemo(() => {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
    let t: 'green' | 'amber' | 'red' | 'blue';
    if (tone !== 'auto') {
      t = tone;
    } else if (pct >= 75) {
      t = 'green';
    } else if (pct >= 40) {
      t = 'amber';
    } else {
      t = 'red';
    }
    return { percent: pct, toneClass: s[`tone_${t}`] };
  }, [value, max, tone]);

  return (
    <div className={s.root}>
      <div className={s.header}>
        {label && <span className={s.label}>{label}</span>}
        {showPercent && (
          <span className={s.percent} dir="ltr">
            {Math.round(percent)}٪
          </span>
        )}
      </div>
      <div className={s.track}>
        <div
          className={`${s.fill} ${toneClass}`}
          style={{ width: `${percent}%`, height: `${height}px` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
