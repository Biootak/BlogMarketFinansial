'use client';

/**
 * ExchangePageHero — hero شیشه‌ای مشترک برای صفحات پنل صرافی.
 *
 * ساختار: پنل glass با aurora، خط گرادیانی بالا،
 *   [ headline + آمار بزرگ + trend + live pill ]  [ visual امضایی صفحه ]
 *
 * visual یک slot است — هر صفحه (deals/ledger/requests/fraud/audit) شناسهٔ
 * بصری خودش را می‌گذارد. در موبایل visual زیر headline می‌رود.
 */

import type { ReactNode } from 'react';
import s from './ExchangePageHero.module.css';

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  /** عدد بزرگ سمت راست hero */
  statValue: string;
  statLabel: string;
  trend?: { label: string; tone?: 'up' | 'down' | 'neutral' };
  /** پیل «رصد زنده» — پیش‌فرض فعال */
  liveLabel?: string;
  visual: ReactNode;
  action?: ReactNode;
}

export function ExchangePageHero({
  eyebrow,
  title,
  description,
  statValue,
  statLabel,
  trend,
  liveLabel,
  visual,
  action,
}: Props) {
  return (
    <section className={s.hero}>
      <div className={s.aurora} aria-hidden />
      <div className={s.accentLine} aria-hidden />
      <div className={s.body}>
        <div className={s.main}>
          <span className={s.eyebrow}>{eyebrow}</span>
          <h2 className={s.title}>{title}</h2>
          <p className={s.desc}>{description}</p>
          <div className={s.statRow}>
            <div className={s.statValue}>{statValue}</div>
            <div className={s.statMeta}>
              <span className={s.statLabel}>{statLabel}</span>
              {trend && (
                <span className={`${s.trend} ${trend.tone ? s[`trend_${trend.tone}`] : ''}`}>
                  {trend.label}
                </span>
              )}
            </div>
          </div>
          {(liveLabel || action) && (
            <div className={s.foot}>
              {liveLabel && (
                <span className={s.live}>
                  <span className={s.liveDot} aria-hidden />
                  {liveLabel}
                </span>
              )}
              {action}
            </div>
          )}
        </div>
        <div className={s.visual}>{visual}</div>
      </div>
    </section>
  );
}
