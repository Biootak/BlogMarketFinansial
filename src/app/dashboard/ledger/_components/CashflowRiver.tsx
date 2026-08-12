'use client';

/**
 * CashflowRiver — waterfall / river chart for the ledger.
 *
 * Shows the running balance over time as a flowing "river" with credit
 * (emerald) and debit (rose) segments. The path is constructed from
 * rectangular blocks connected by smooth transitions, giving the
 * illusion of money flowing through a system. The end marker is a
 * glowing terminal dot.
 *
 * Tokens only (--ds-* / --nova-*). RTL safe.
 */

import { useId, useMemo } from 'react';
import s from './CashflowRiver.module.css';

export interface RiverPoint {
  /** Running balance after this transaction. */
  balance: number;
  /** CREDIT (positive step) or DEBIT (negative step). */
  direction: 'CREDIT' | 'DEBIT';
  /** Short label for x-axis (e.g. time HH:mm). */
  label?: string;
}

export interface CashflowRiverProps {
  data: RiverPoint[];
  height?: number;
  className?: string;
}

const WIDTH = 800;
const PADDING_X = 12;
const PADDING_Y = 24;
const SEG_GAP = 1.5;

function fmt(n: number): string {
  return Math.round(n).toLocaleString('fa-IR');
}

export function CashflowRiver({ data, height = 160, className }: CashflowRiverProps) {
  const id = useId().replace(/:/g, '');
  const plotW = WIDTH - PADDING_X * 2;
  const plotH = height - PADDING_Y * 2;

  const { segments, minVal, maxVal } = useMemo(() => {
    if (data.length === 0) {
      return { segments: [], minVal: 0, maxVal: 0 };
    }
    const balances = data.map((d) => d.balance);
    const rawMin = Math.min(...balances);
    const rawMax = Math.max(...balances);
    const span = rawMax - rawMin || 1;
    const pad = span * 0.08;
    const minVal = rawMin - pad;
    const maxVal = rawMax + pad;
    const range = maxVal - minVal || 1;

    const segW = (plotW - SEG_GAP * (data.length - 1)) / data.length;
    let runningFrom = data[0].balance;

    const segs = data.map((d, i) => {
      const x = PADDING_X + i * (segW + SEG_GAP);
      const y1 = PADDING_Y + plotH - ((runningFrom - minVal) / range) * plotH;
      const y2 = PADDING_Y + plotH - ((d.balance - minVal) / range) * plotH;
      const topY = Math.min(y1, y2);
      const bottomY = Math.max(y1, y2);
      const segH = Math.max(2, bottomY - topY);
      runningFrom = d.balance;
      return {
        x,
        y: topY,
        h: segH,
        w: segW,
        direction: d.direction,
        label: d.label,
      };
    });

    return { segments: segs, minVal, maxVal };
  }, [data, plotH, plotW]);

  const last = data[data.length - 1];
  const first = data[0];

  if (data.length === 0) {
    return (
      <div className={`${s.root} ${s.empty} ${className ?? ''}`}>
        <span>داده‌ای برای نمایش نیست</span>
      </div>
    );
  }

  return (
    <div className={`${s.root} ${className ?? ''}`} role="img" aria-label="رودخانه جریان نقد">
      <div className={s.meta}>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>آغاز</span>
          <span className={s.metaValue}>{fmt(first?.balance ?? 0)}</span>
        </div>
        <div className={s.metaItem}>
          <span className={s.metaLabel}>اکنون</span>
          <span className={`${s.metaValue} ${s.metaValueNow}`}>{fmt(last?.balance ?? 0)}</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        preserveAspectRatio="none"
        className={s.svg}
        role="presentation"
      >
        <defs>
          <linearGradient id={`${id}-credit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.85" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`${id}-debit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.78" />
          </linearGradient>
        </defs>

        {/* base grid line */}
        <line
          x1={PADDING_X}
          x2={WIDTH - PADDING_X}
          y1={PADDING_Y + plotH}
          y2={PADDING_Y + plotH}
          className={s.baseline}
        />

        {/* segments */}
        <g className={s.upGroup}>
          {segments
            .filter((seg) => seg.direction === 'CREDIT')
            .map((seg, i) => (
              <rect
                key={`up-${i}`}
                x={seg.x}
                y={seg.y}
                width={seg.w}
                height={seg.h}
                fill={`url(#${id}-credit)`}
                rx="1.5"
                className={s.barUp}
              />
            ))}
        </g>

        <g className={s.downGroup}>
          {segments
            .filter((seg) => seg.direction === 'DEBIT')
            .map((seg, i) => (
              <rect
                key={`down-${i}`}
                x={seg.x}
                y={seg.y}
                width={seg.w}
                height={seg.h}
                fill={`url(#${id}-debit)`}
                rx="1.5"
                className={s.barDown}
              />
            ))}
        </g>

        {/* terminal dot */}
        {segments.length > 0 && (
          <g
            transform={`translate(${(segments[segments.length - 1].x + segments[segments.length - 1].w).toFixed(2)}, ${(segments[segments.length - 1].y + segments[segments.length - 1].h).toFixed(2)})`}
          >
            <circle r="6" className={s.terminalHalo} />
            <circle r="2.5" className={s.terminalDot} />
          </g>
        )}
      </svg>

      <div className={s.scaleRow}>
        <span className={s.scaleMark}>
          <span className={s.scaleLine} />
          <span>{fmt(maxVal)}</span>
        </span>
        <span className={s.scaleMark}>
          <span>{fmt(minVal)}</span>
          <span className={`${s.scaleLine} ${s.scaleLineLow}`} />
        </span>
      </div>
    </div>
  );
}
