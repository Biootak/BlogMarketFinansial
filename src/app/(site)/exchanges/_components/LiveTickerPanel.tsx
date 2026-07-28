'use client';

/**
 * LiveTickerPanel — Real-time "best rates" panel inside the hero.
 *
 *   • Shows: best buy / best sell per top currency (USD, EUR, AED, GBP).
 *   • Tabular numerals + monospace alignment.
 *   • Animated live dot to telegraph freshness.
 *   • Server-rendered props (no client fetch).
 */

import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import s from './LiveTickerPanel.module.css';

export type TickerStat = {
  code: string;
  name: string;
  bestBuy: number;
  bestSell: number;
  bestBuyExchange: string;
  bestSellExchange: string;
  unit: string;
};

type Props = {
  stats: TickerStat[];
};

const formatFa = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return '—';
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
};

export default function LiveTickerPanel({ stats }: Props) {
  return (
    <div className={s.panel} role="group" aria-label="بهترین نرخ لحظه‌ای ارزها">
      <div className={s.panelHeader}>
        <span className={s.live}>
          <span className={s.liveDot} aria-hidden />
          <Activity size={12} strokeWidth={2.5} aria-hidden />
          <span>بهترین نرخ‌های لحظه‌ای</span>
        </span>
        <span className={s.updating}>به‌روز هر ۳۰ ثانیه</span>
      </div>
      <div className={s.grid}>
        {stats.length === 0 ? (
          <div className={s.empty}>نرخ فعالی برای نمایش موجود نیست</div>
        ) : (
          stats.map((stat) => (
            <article key={stat.code} className={s.tile}>
              <header className={s.tileHeader}>
                <span className={s.code}>{stat.code}</span>
                <span className={s.name}>{stat.name}</span>
              </header>
              <div className={s.rows}>
                <div className={s.row}>
                  <span className={s.rowLabel}>
                    <TrendingDown size={10} strokeWidth={2.5} className={s.rowIcon} aria-hidden />
                    بهترین خرید
                  </span>
                  <span className={s.rowVal} dir="ltr">
                    {formatFa(stat.bestBuy)}
                    <span className={s.rowUnit}>{stat.unit}</span>
                  </span>
                  <span className={s.rowSource}>{stat.bestBuyExchange}</span>
                </div>
                <div className={s.rowDivider} aria-hidden />
                <div className={s.row}>
                  <span className={s.rowLabel}>
                    <TrendingUp size={10} strokeWidth={2.5} className={s.rowIcon} aria-hidden />
                    بهترین فروش
                  </span>
                  <span className={s.rowVal} dir="ltr">
                    {formatFa(stat.bestSell)}
                    <span className={s.rowUnit}>{stat.unit}</span>
                  </span>
                  <span className={s.rowSource}>{stat.bestSellExchange}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
