'use client';

/**
 * CashflowPulse — animated waveform hero signature for the ledger.
 *
 * Renders an SVG ribbon chart that visualizes the daily credit/debit
 * rhythm. The wave is generated from a smooth path; bars rising above
 * the baseline are credits (emerald), bars below are debits (rose). The
 * pulse breathes slowly via a CSS keyframe so the page never feels
 * static — a Bloomberg-terminal hint without the visual noise.
 *
 * Tokens only (--ds-* / --nova-*). No raw hex. RTL safe (mirrored on
 * `dir="rtl"` via the path direction). Honors prefers-reduced-motion
 * via the global clamp in tokens.css.
 */

import { useId, useMemo } from 'react';
import s from './CashflowPulse.module.css';

export interface CashflowPulsePoint {
  /** Signed value: positive = credit, negative = debit. */
  value: number;
  /** Optional label rendered as x-axis tick. */
  label?: string;
}

export interface CashflowPulseProps {
  data: CashflowPulsePoint[];
  height?: number;
  className?: string;
  /** Total time window shown (e.g. "۷ روز اخیر"). */
  windowLabel?: string;
}

const WIDTH = 800;
const PADDING_X = 24;
const PADDING_Y = 28;
const BAR_GAP = 2;

function buildPath(
  data: CashflowPulsePoint[],
  plotH: number,
  plotW: number,
): { credit: string; debit: string; maxAbs: number } {
  if (data.length === 0) return { credit: '', debit: '', maxAbs: 1 };
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const barW = (plotW - BAR_GAP * (data.length - 1)) / data.length;

  let credit = '';
  let debit = '';
  const midY = plotH / 2;

  data.forEach((d, i) => {
    const x = PADDING_X + i * (barW + BAR_GAP);
    const h = (Math.abs(d.value) / maxAbs) * (plotH / 2 - 4);
    if (d.value >= 0) {
      const y = midY - h;
      // rounded top via line + arc
      credit += `${i === 0 ? 'M' : 'M'}${x.toFixed(2)},${midY.toFixed(2)} L${x.toFixed(2)},${(y + Math.min(4, h)).toFixed(2)} Q${x.toFixed(2)},${y.toFixed(2)} ${(x + Math.min(4, barW / 2)).toFixed(2)},${y.toFixed(2)} L${(x + barW - Math.min(4, barW / 2)).toFixed(2)},${y.toFixed(2)} Q${(x + barW).toFixed(2)},${y.toFixed(2)} ${(x + barW).toFixed(2)},${(y + Math.min(4, h)).toFixed(2)} L${(x + barW).toFixed(2)},${midY.toFixed(2)} Z `;
    } else {
      const y = midY + h;
      debit += `${i === 0 ? 'M' : 'M'}${x.toFixed(2)},${midY.toFixed(2)} L${x.toFixed(2)},${(y - Math.min(4, h)).toFixed(2)} Q${x.toFixed(2)},${y.toFixed(2)} ${(x + Math.min(4, barW / 2)).toFixed(2)},${y.toFixed(2)} L${(x + barW - Math.min(4, barW / 2)).toFixed(2)},${y.toFixed(2)} Q${(x + barW).toFixed(2)},${y.toFixed(2)} ${(x + barW).toFixed(2)},${(y - Math.min(4, h)).toFixed(2)} L${(x + barW).toFixed(2)},${midY.toFixed(2)} Z `;
    }
  });

  return { credit, debit, maxAbs };
}

export function CashflowPulse({ data, height = 140, className, windowLabel }: CashflowPulseProps) {
  const id = useId().replace(/:/g, '');
  const plotW = WIDTH - PADDING_X * 2;
  const plotH = height - PADDING_Y * 2;

  const { credit, debit, maxAbs } = useMemo(
    () => buildPath(data, plotH, plotW),
    [data, plotH, plotW],
  );

  // Pick sparse label ticks (every ~4-5 bars)
  const labelStride = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div
      className={`${s.root} ${className ?? ''}`}
      aria-hidden={false}
      role="img"
      aria-label="ریتم جریان نقد"
    >
      <div className={s.head}>
        <span className={s.eyebrow}>
          <span className={s.dot} />
          ریتم جریان نقد
        </span>
        {windowLabel && <span className={s.window}>{windowLabel}</span>}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        preserveAspectRatio="none"
        className={s.svg}
        role="presentation"
      >
        <defs>
          <linearGradient id={`${id}-up`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id={`${id}-down`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.85" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* baseline rule */}
        <line
          x1={PADDING_X}
          x2={WIDTH - PADDING_X}
          y1={PADDING_Y + plotH / 2}
          y2={PADDING_Y + plotH / 2}
          className={s.baseline}
        />

        {/* credit bars (above baseline) */}
        <g className={s.upGroup} transform={`translate(0, ${PADDING_Y})`}>
          <path d={credit} fill={`url(#${id}-up)`} className={s.barUp} />
        </g>

        {/* debit bars (below baseline) */}
        <g className={s.downGroup} transform={`translate(0, ${PADDING_Y})`}>
          <path d={debit} fill={`url(#${id}-down)`} className={s.barDown} />
        </g>

        {/* x-axis labels (sparse) */}
        {data.map((d, i) => {
          if (i % labelStride !== 0 && i !== data.length - 1) return null;
          const x = PADDING_X + i * ((plotW - BAR_GAP * (data.length - 1)) / data.length + BAR_GAP);
          return (
            <text key={`lbl-${i}`} x={x} y={height - 6} className={s.axisLabel} textAnchor="middle">
              {d.label ?? ''}
            </text>
          );
        })}
      </svg>

      <div className={s.scaleRow}>
        <span className={s.scale}>
          <span className={s.scaleUp} />
          بیشینه: {Math.round(maxAbs).toLocaleString('fa-IR')}
        </span>
        <span className={s.scaleDown}>
          بیشینه: {Math.round(maxAbs).toLocaleString('fa-IR')}
          <span className={s.scaleDownDot} />
        </span>
      </div>
    </div>
  );
}
