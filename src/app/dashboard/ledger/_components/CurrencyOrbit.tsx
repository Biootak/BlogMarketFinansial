'use client';

/**
 * CurrencyOrbit — concentric-ring radial chart for currency mix.
 *
 * Unlike a flat donut, the orbit stacks two rings:
 *   - outer: gross volume (credit + |debit|)
 *   - inner: net direction (credit share only, in emerald)
 *
 * A floating dot in the middle marks the dominant currency; a thin
 * tick line connects it to the outer ring slice.
 *
 * Tokens only. RTL safe.
 */

import { useId, useMemo } from 'react';
import s from './CurrencyOrbit.module.css';

export interface OrbitCurrency {
  code: string;
  credit: number;
  debit: number;
  /** Optional Persian display label. */
  label?: string;
}

export interface CurrencyOrbitProps {
  data: OrbitCurrency[];
  size?: number;
  className?: string;
}

const CURRENCY_PALETTE: Record<string, string> = {
  AFN: 'var(--nova-up, var(--ds-accent-emerald))',
  USD: 'var(--nova-cyan, var(--ds-accent-cyan))',
  EUR: 'var(--nova-violet, var(--ds-accent-violet))',
  AED: 'var(--nova-amber, var(--ds-accent-amber))',
  IRR: 'var(--nova-rose, var(--ds-accent-rose))',
  PKR: 'var(--nova-indigo, var(--ds-accent-indigo))',
  INR: 'var(--nova-primary, var(--ds-brand-500))',
};

const DEFAULT_COLOR = 'var(--nova-muted, var(--ds-text-muted))';

function colorFor(code: string): string {
  return CURRENCY_PALETTE[code] ?? DEFAULT_COLOR;
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  // Angles in degrees, 0 = top, going clockwise.
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function CurrencyOrbit({ data, size = 200, className }: CurrencyOrbitProps) {
  const id = useId().replace(/:/g, '');
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 14;
  const innerR = outerR * 0.62;
  const coreR = innerR * 0.62;

  const { slices, total, dominant } = useMemo(() => {
    const total = data.reduce((s, d) => s + Math.max(0, d.credit) + Math.max(0, d.debit), 0);

    if (total === 0 || data.length === 0) {
      return { slices: [], total: 0, dominant: null as OrbitCurrency | null };
    }

    let acc = 0;
    const slices = data.map((d) => {
      const sliceVal = Math.max(0, d.credit) + Math.max(0, d.debit);
      const share = sliceVal / total;
      const start = acc * 360;
      const end = (acc + share) * 360;
      acc += share;
      return { ...d, start, end, share, color: colorFor(d.code) };
    });

    const dominant = slices.reduce<OrbitCurrency | null>((best, cur) => {
      if (best === null) return cur;
      const bestShare = (best as { share?: number }).share ?? 0;
      return cur.share > bestShare ? cur : best;
    }, null);

    return { slices, total, dominant };
  }, [data]);

  if (total === 0) {
    return (
      <div className={`${s.root} ${s.empty} ${className ?? ''}`}>
        <span>داده‌ای برای نمایش نیست</span>
      </div>
    );
  }

  return (
    <div className={`${s.root} ${className ?? ''}`} role="img" aria-label="مدار ارزها">
      <div className={s.canvas} style={{ inlineSize: size, blockSize: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className={s.svg}
          aria-hidden
        >
          <title>مدار ارزها</title>
          <defs>
            <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
              <stop offset="60%" stopColor="currentColor" stopOpacity="0.1" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer ring — gross volume */}
          <g>
            <circle cx={cx} cy={cy} r={outerR} className={s.trackOuter} />
            {slices.map((s2) => (
              <path
                key={`out-${s2.code}`}
                d={describeArc(cx, cy, outerR, s2.start, Math.max(s2.end, s2.start + 0.5))}
                fill="none"
                stroke={s2.color}
                strokeWidth="10"
                strokeLinecap="butt"
                className={s.seg}
              />
            ))}
          </g>

          {/* Inner ring — net credit share (only credit half) */}
          <g>
            <circle cx={cx} cy={cy} r={innerR} className={s.trackInner} />
            {slices.map((s2) => {
              const creditShare = s2.credit / (s2.credit + s2.debit || 1);
              if (creditShare <= 0) return null;
              const creditSpan = (s2.end - s2.start) * creditShare;
              if (creditSpan <= 0) return null;
              return (
                <path
                  key={`in-${s2.code}`}
                  d={describeArc(cx, cy, innerR, s2.start, s2.start + creditSpan)}
                  fill="none"
                  stroke={s2.color}
                  strokeWidth="6"
                  strokeLinecap="round"
                  className={s.segIn}
                />
              );
            })}
          </g>

          {/* Core glow */}
          <circle
            cx={cx}
            cy={cy}
            r={coreR * 2.4}
            fill={`url(#${id}-core)`}
            className={s.glow}
            style={{ color: dominant ? colorFor(dominant.code) : 'var(--nova-primary)' }}
          />

          {/* Tick from dominant to its slice */}
          {dominant &&
            (() => {
              const dom = slices.find((s2) => s2.code === dominant.code);
              if (!dom) return null;
              const midAngle = (dom.start + dom.end) / 2;
              const rad = ((midAngle - 90) * Math.PI) / 180;
              const x = cx + outerR * Math.cos(rad);
              const y = cy + outerR * Math.sin(rad);
              return (
                <line
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  className={s.tick}
                  style={{ stroke: colorFor(dominant.code) }}
                />
              );
            })()}

          {/* Center core dot */}
          <circle
            cx={cx}
            cy={cy}
            r={coreR}
            className={s.coreDot}
            style={{ fill: dominant ? colorFor(dominant.code) : 'var(--nova-primary)' }}
          />
        </svg>

        <div className={s.label}>
          <span className={s.code}>{dominant?.code ?? '—'}</span>
          <span className={s.share}>
            {Math.round(
              (dominant ? (slices.find((s2) => s2.code === dominant.code)?.share ?? 0) : 0) * 100,
            )}
            ٪
          </span>
        </div>
      </div>

      <ul className={s.legend}>
        {slices.map((s2) => (
          <li key={s2.code} className={s.legendItem}>
            <span className={s.legendDot} style={{ background: s2.color }} />
            <span className={s.legendCode}>{s2.code}</span>
            <span className={s.legendShare}>
              {Math.round(s2.share * 100).toLocaleString('fa-IR')}٪
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
