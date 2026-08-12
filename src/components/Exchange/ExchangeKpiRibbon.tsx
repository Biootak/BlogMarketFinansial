'use client';

/**
 * ExchangeKpiRibbon — روبان KPI فشردهٔ مشترک صفحات پنل صرافی.
 *
 * الهام‌گرفته از ExchangeKpiRow (داشبورد صرافی): تایل‌های متراکم ۹۲px،
 * نه کارت‌های بزرگ. hero خودش بزرگ‌ترین عدد است؛ این‌ها «نشانه»اند.
 *   - ۲ ستون از ابتدا، ۴ ستون در ≥۶۴۰px
 *   - آیکون در باکس رنگی + trend با فلش + زیرنویس
 */

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import s from './ExchangeKpiRibbon.module.css';

export type ExchangeKpiTone = 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate';

export interface ExchangeKpiTile {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: ExchangeKpiTone;
  trend?: { dir: 'up' | 'down' | 'flat'; label: string };
  sub?: string;
}

export function ExchangeKpiRibbon({ tiles }: { tiles: ExchangeKpiTile[] }) {
  return (
    <div className={s.ribbon} role="list" aria-label="شاخص‌های کلیدی">
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        return (
          <div key={`${tile.label}-${i}`} className={s.tile} role="listitem">
            <div className={s.tileHead}>
              <span>{tile.label}</span>
              <span className={s.tileIcon} data-tone={tile.tone} aria-hidden>
                <Icon size={14} strokeWidth={1.75} />
              </span>
            </div>
            <div className={s.tileValue} dir="ltr">
              {tile.value}
            </div>
            <div className={s.tileFoot}>
              {tile.trend ? (
                <span className={s.trend} data-trend={tile.trend.dir}>
                  {tile.trend.dir === 'up' && <ArrowUpRight size={12} aria-hidden />}
                  {tile.trend.dir === 'down' && <ArrowDownRight size={12} aria-hidden />}
                  {tile.trend.dir === 'flat' && <Minus size={12} aria-hidden />}
                  <span>{tile.trend.label}</span>
                </span>
              ) : (
                <span aria-hidden />
              )}
              {tile.sub && <span className={s.sub}>{tile.sub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
