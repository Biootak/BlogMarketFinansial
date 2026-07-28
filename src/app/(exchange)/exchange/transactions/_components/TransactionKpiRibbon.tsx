/**
 * TransactionKpiRibbon — 4 تیر KPI متراکم در بالای صفحه.
 *
 * signature moment صفحه — یک ribbon از 4 metric tile که هر کدام:
 *  - تعداد/مبلغ اصلی
 *  - trend sub-line (امروز vs دیروز)
 *  - live dot رنگی برای state
 *  - micro-sparkline (آرایه ساده، نه chart lib)
 *
 * ساختار:
 *  ┌────────────────────────────────────────────┐
 *  │ عملکرد امروز                trend ↑ +12%  │
 *  │ ۱۲۳ تراکنش                  از ۱۱۰ دیروز │
 *  └────────────────────────────────────────────┘
 */

'use client';

import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpRight,
  Clock,
  Minus,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { type CSSProperties } from 'react';
import { type TxAggregate, faNum, formatAmountShort } from '@/lib/exchange-tx-formatters';
import s from './TransactionKpiRibbon.module.css';

interface KpiTile {
  key: string;
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  tone: 'brand' | 'up' | 'down' | 'amber';
  trend?: { delta: number; direction: 'up' | 'down' | 'flat' };
}

function computeTiles(agg: TxAggregate): KpiTile[] {
  const todayDelta =
    agg.yesterdayCount > 0
      ? ((agg.todayCount - agg.yesterdayCount) / agg.yesterdayCount) * 100
      : agg.todayCount > 0
        ? 100
        : 0;
  const trendDir: 'up' | 'down' | 'flat' =
    todayDelta > 1 ? 'up' : todayDelta < -1 ? 'down' : 'flat';

  return [
    {
      key: 'volume',
      label: 'گردش دوره',
      value: formatAmountShort(agg.totalAmount, agg.primaryCurrency),
      caption: `${faNum(agg.total)} تراکنش ثبت‌شده`,
      icon: Wallet,
      tone: 'brand',
      trend: { delta: Math.round(Math.abs(todayDelta)), direction: trendDir },
    },
    {
      key: 'deposits',
      label: 'واریز',
      value: formatAmountShort(agg.depositAmount, agg.primaryCurrency),
      caption: `${faNum(agg.todayCount)} تراکنش در ۲۴ ساعت`,
      icon: ArrowDownLeft,
      tone: 'up',
    },
    {
      key: 'withdrawals',
      label: 'برداشت',
      value: formatAmountShort(agg.withdrawalAmount, agg.primaryCurrency),
      caption: `${faNum(agg.exchangeCount)} تبدیل ارز`,
      icon: ArrowUpRight,
      tone: 'down',
    },
    {
      key: 'pending',
      label: 'در انتظار اقدام',
      value: faNum(agg.pendingCount),
      caption: `${faNum(agg.failedCount)} ناموفق / برگشتی`,
      icon: Clock,
      tone: 'amber',
    },
  ];
}

function Sparkline({ values, tone }: { values: number[]; tone: KpiTile['tone'] }) {
  if (values.length < 2) return null;
  const w = 80;
  const h = 24;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ');
  const toneColor: Record<KpiTile['tone'], string> = {
    brand: 'var(--ds-brand-500)',
    up: 'var(--nova-up)',
    down: 'var(--nova-down)',
    amber: 'var(--nova-amber)',
  };
  return (
    <svg className={s.spark} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline
        fill="none"
        stroke={toneColor[tone]}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function TrendPill({ trend }: { trend: NonNullable<KpiTile['trend']> }) {
  const dir = trend.direction;
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus;
  const cls = dir === 'up' ? s.trendUp : dir === 'down' ? s.trendDown : s.trendFlat;
  const sign = dir === 'up' ? '+' : dir === 'down' ? '−' : '';
  const label = `${sign}${faNum(trend.delta)}٪`;
  return (
    <span className={`${s.trend} ${cls}`} aria-label={`تغییر ${label}`}>
      <Icon size={10} strokeWidth={2.4} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function TransactionKpiRibbon({
  aggregate,
  spark,
}: {
  aggregate: TxAggregate;
  /** مقادیر sparkline برای هر tile، به ترتیب computeTiles (اختیاری). */
  spark?: {
    volume?: number[];
    deposits?: number[];
    withdrawals?: number[];
    pending?: number[];
  };
}) {
  const tiles = computeTiles(aggregate);
  const sparkMap: Record<string, number[] | undefined> = {
    volume: spark?.volume,
    deposits: spark?.deposits,
    withdrawals: spark?.withdrawals,
    pending: spark?.pending,
  };
  return (
    <section className={s.ribbon} aria-label="شاخص‌های کلیدی">
      {tiles.map((t, i) => {
        const Icon = t.icon;
        const sparkData = sparkMap[t.key];
        return (
          <article
            key={t.key}
            className={s.tile}
            data-tone={t.tone}
            style={{ '--tile-i': i } as CSSProperties}
          >
            <div className={s.mark} aria-hidden>
              <svg viewBox="0 0 100 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`kpi-grad-${t.key}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <circle cx="84" cy="14" r="34" fill={`url(#kpi-grad-${t.key})`} />
                <circle
                  cx="84"
                  cy="14"
                  r="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.6"
                  opacity="0.25"
                />
                <circle
                  cx="84"
                  cy="14"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  opacity="0.4"
                />
              </svg>
            </div>

            <header className={s.head}>
              <span className={s.iconBox} aria-hidden>
                <Icon size={14} strokeWidth={1.75} />
              </span>
              <span className={s.label}>{t.label}</span>
              {t.trend && <TrendPill trend={t.trend} />}
            </header>

            <div className={s.valueRow}>
              <span className={s.value}>{t.value}</span>
              {sparkData && <Sparkline values={sparkData} tone={t.tone} />}
            </div>

            <p className={s.caption}>{t.caption}</p>
          </article>
        );
      })}
    </section>
  );
}
