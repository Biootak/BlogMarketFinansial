// src/app/dashboard/exchange-rates/_components/LeadRateHero.tsx
// 2026-07-29: Spotlight card for the lead rate (دلار هرات / افغانی / first active).
// Big numerical display + sparkline + last sync indicator.

'use client';

import type { MarketRateGroup } from '@/lib/market-rates';
import {
  HiArrowTrendingDown,
  HiArrowTrendingUp,
  HiMinus,
  HiOutlineClock,
  HiOutlineSparkles,
} from 'react-icons/hi2';

interface Props {
  /** Symbol key (e.g. "AFGHANI_USD"). */
  symbol: string;
  /** Persian display name (e.g. "دلار هرات"). */
  displayNameFa: string;
  /** Group tag (e.g. "afghan"). */
  group: MarketRateGroup;
  /** Latest value (rawValue, after divisor). */
  value: number | null;
  /** Persian unit label (e.g. "تومان"). */
  unitLabel: string;
  /** 24h change percent. */
  changePercent: number;
  /** Last update timestamp. */
  updatedAt: Date | null;
  /** Sparkline points (24h, rawValue, after divisor). */
  sparkline?: number[];
}

const GROUP_GLYPH: Record<MarketRateGroup, string> = {
  afghan: '◆',
  'iran-forex': '◇',
  'iran-coin': '◈',
  'iran-gold': '◉',
  global: '◯',
  minor: '◐',
};

function formatNumber(n: number | null): string {
  if (n === null || Number.isNaN(n)) return '—';
  if (n >= 1000) {
    return n.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
  }
  return n.toLocaleString('fa-IR', { maximumFractionDigits: 2 });
}

function formatRelative(date: Date | null): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMin = Math.round((Date.now() - d.getTime()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
  if (Math.abs(diffMin) < 1) return 'لحظاتی پیش';
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
  const diffH = Math.round(diffMin / 60);
  if (Math.abs(diffH) < 24) return rtf.format(-diffH, 'hour');
  const diffD = Math.round(diffH / 24);
  return rtf.format(-diffD, 'day');
}

export default function LeadRateHero({
  symbol,
  displayNameFa,
  group,
  value,
  unitLabel,
  changePercent,
  updatedAt,
  sparkline = [],
}: Props) {
  const isUp = changePercent > 0;
  const isDown = changePercent < 0;
  // m2-fix: وقتی changePercent=0 و sparkline خالی است، یعنی دادهٔ کافی برای
  // روند نیست — «۰٪ بدون تغییر» دروغ می‌گوید. به‌جایش «نرخ فعلی» صادق نمایش
  // داده می‌شود.
  const hasTrend = sparkline.length >= 2 || changePercent !== 0;
  const isFlat = !hasTrend || changePercent === 0;
  const trendColor = isUp
    ? 'var(--ds-accent-emerald)'
    : isDown
      ? 'var(--ds-accent-rose)'
      : 'var(--ds-text-muted)';
  const trendBg = isUp
    ? 'color-mix(in oklch, var(--ds-accent-emerald) 14%, transparent)'
    : isDown
      ? 'color-mix(in oklch, var(--ds-accent-rose) 14%, transparent)'
      : 'var(--ds-canvas-subtle)';

  return (
    <article
      aria-label={`نرخ شاخص: ${displayNameFa}`}
      className="relative flex flex-col overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in oklch, var(--ds-brand-500) 6%, var(--ds-surface)) 0%, var(--ds-surface) 70%)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-lg)',
        padding: 'var(--ds-space-5) var(--ds-space-5)',
        gap: 'var(--ds-space-3)',
        boxShadow: 'var(--ds-shadow-md)',
        minHeight: '11rem',
      }}
    >
      {/* Decorative corner accent */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          insetInlineEnd: 'var(--ds-space-4)',
          top: 'var(--ds-space-4)',
          fontSize: '0.7rem',
          color: 'var(--ds-text-muted)',
          letterSpacing: '0.1em',
          fontFamily: 'var(--ds-font-mono, monospace)',
        }}
      >
        {GROUP_GLYPH[group]} · {symbol}
      </span>

      <div className="flex items-center" style={{ gap: '0.5rem' }}>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.6rem',
            height: '1.6rem',
            borderRadius: 'var(--ds-radius-sm)',
            background: 'color-mix(in oklch, var(--ds-brand-500) 14%, transparent)',
            color: 'var(--ds-brand-500)',
          }}
        >
          <HiOutlineSparkles style={{ width: '0.95rem', height: '0.95rem' }} />
        </span>
        <span
          className="font-semibold uppercase"
          style={{
            fontSize: 'var(--ds-text-xs)',
            letterSpacing: '0.08em',
            color: 'var(--ds-text-muted)',
          }}
        >
          نرخ شاخص
        </span>
      </div>

      <h3
        className="font-extrabold"
        style={{
          fontSize: 'var(--ds-text-xl)',
          color: 'var(--ds-text-primary)',
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {displayNameFa}
      </h3>

      <div
        className="flex items-end justify-between flex-wrap"
        style={{ gap: 'var(--ds-space-3)' }}
      >
        <div className="flex flex-col" style={{ gap: '0.2rem' }}>
          <div
            className="font-extrabold tabular-nums"
            dir="ltr"
            style={{
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'var(--ds-text-primary)',
              textAlign: 'start',
            }}
          >
            {formatNumber(value)}
          </div>
          <div
            className="font-semibold"
            style={{
              fontSize: 'var(--ds-text-sm)',
              color: 'var(--ds-text-muted)',
            }}
          >
            {unitLabel}
          </div>
        </div>

        <div className="flex flex-col items-end" style={{ gap: '0.4rem' }}>
          {/* Trend chip */}
          <span
            className="inline-flex items-center font-bold tabular-nums"
            style={{
              fontSize: 'var(--ds-text-sm)',
              paddingInline: '0.6rem',
              height: '1.7rem',
              borderRadius: 'var(--ds-radius-full)',
              background: trendBg,
              color: trendColor,
              gap: '0.3rem',
            }}
            aria-label={
              isUp
                ? `افزایش ${changePercent.toLocaleString('fa-IR')} درصد`
                : isDown
                  ? `کاهش ${Math.abs(changePercent).toLocaleString('fa-IR')} درصد`
                  : hasTrend
                    ? 'بدون تغییر'
                    : 'نرخ فعلی'
            }
          >
            {isUp ? (
              <HiArrowTrendingUp style={{ width: '0.95rem', height: '0.95rem' }} />
            ) : isDown ? (
              <HiArrowTrendingDown style={{ width: '0.95rem', height: '0.95rem' }} />
            ) : (
              <HiMinus style={{ width: '0.95rem', height: '0.95rem' }} />
            )}
            {isFlat
              ? hasTrend
                ? '۰٪'
                : 'نرخ فعلی'
              : `${isUp ? '+' : ''}${changePercent.toLocaleString('fa-IR', { maximumFractionDigits: 2 })}٪`}
          </span>

          {/* Sparkline */}
          {sparkline.length >= 2 && <Sparkline points={sparkline} trend={changePercent} />}
        </div>
      </div>

      <div
        className="flex items-center"
        style={{
          gap: '0.4rem',
          fontSize: 'var(--ds-text-xs)',
          color: 'var(--ds-text-muted)',
          marginTop: 'auto',
        }}
      >
        <HiOutlineClock style={{ width: '0.85rem', height: '0.85rem' }} />
        <span>بروزرسانی: {formatRelative(updatedAt)}</span>
      </div>
    </article>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Sparkline — small SVG line chart, no axis, smooth
   ────────────────────────────────────────────────────────────────────── */

function Sparkline({ points, trend }: { points: number[]; trend: number }) {
  const width = 120;
  const height = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const lastY = height - ((points[points.length - 1] - min) / range) * height;
  const stroke = trend >= 0 ? 'var(--ds-accent-emerald)' : 'var(--ds-accent-rose)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="روند ۲۴ ساعته"
      style={{ display: 'block' }}
    >
      {/* Gradient fill area */}
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill="url(#sparkline-fill)" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r="2.5" fill={stroke} />
    </svg>
  );
}
