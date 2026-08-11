// src/app/dashboard/exchange-rates/_components/LeadRateHero.tsx
// 2026-08-11 premium update: CSS module, lucide-react, ambient glow signature,
// count-up animation, elevation tier.

'use client';

import type { MarketRateGroup } from '@/lib/market-rates';
import { ArrowDownRight, ArrowUpRight, Clock, Minus, Sparkles } from 'lucide-react';
import s from './LeadRateHero.module.css';

interface Props {
  symbol: string;
  displayNameFa: string;
  group: MarketRateGroup;
  value: number | null;
  unitLabel: string;
  changePercent: number;
  updatedAt: Date | null;
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

/* ─── Ambient glow SVG (signature moment) ─── */

function AmbientGlow() {
  return (
    <svg className={s.ambientGlow} viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden>
      <defs>
        <radialGradient id="lrHeroA" cx="80%" cy="0%" r="65%">
          <stop offset="0%" stopColor="var(--ds-brand-500)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--ds-brand-500)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lrHeroB" cx="10%" cy="100%" r="50%">
          <stop offset="0%" stopColor="var(--ds-brand-500)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--ds-brand-500)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#lrHeroA)" />
      <rect width="400" height="300" fill="url(#lrHeroB)" />
    </svg>
  );
}

/* ─── Sparkline ─── */

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
      className={s.sparkline}
    >
      <defs>
        <linearGradient id="sparkline-fill-lr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill="url(#sparkline-fill-lr)" />
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

/* ─── Main ─── */

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
  const hasTrend = sparkline.length >= 2 || changePercent !== 0;
  const isFlat = !hasTrend || changePercent === 0;

  const trendClass = isUp ? s.trendChipUp : isDown ? s.trendChipDown : s.trendChipFlat;

  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  return (
    <article className={s.root} aria-label={`نرخ شاخص: ${displayNameFa}`}>
      <AmbientGlow />

      <span className={s.cornerSymbol} aria-hidden>
        {GROUP_GLYPH[group]} · {symbol}
      </span>

      <div className={s.eyebrow}>
        <span className={s.eyebrowIcon} aria-hidden>
          <Sparkles size={14} />
        </span>
        <span className={s.eyebrowText}>نرخ شاخص</span>
      </div>

      <h3 className={s.title}>{displayNameFa}</h3>

      <div className={s.valueArea}>
        <div className={s.valueBlock}>
          <div className={s.value} dir="ltr">
            {formatNumber(value)}
          </div>
          <div className={s.unit}>{unitLabel}</div>
        </div>

        <div className={s.trendBlock}>
          <span
            className={`${s.trendChip} ${trendClass}`}
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
            <TrendIcon size={14} />
            {isFlat
              ? hasTrend
                ? '۰٪'
                : 'نرخ فعلی'
              : `${isUp ? '+' : ''}${changePercent.toLocaleString('fa-IR', { maximumFractionDigits: 2 })}٪`}
          </span>

          {sparkline.length >= 2 && <Sparkline points={sparkline} trend={changePercent} />}
        </div>
      </div>

      <div className={s.timestamp}>
        <Clock size={12} />
        <span>بروزرسانی: {formatRelative(updatedAt)}</span>
      </div>
    </article>
  );
}
