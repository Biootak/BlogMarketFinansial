'use client';

/**
 * TimelineSpine — ستون فقرات زمانی صفحه.
 * ─────────────────────────────────────────────────────────────
 *  همان شبکهٔ ۲۴ ستونی EventRibbon، این بار به‌صورت ردیفی: هر سرویس یا هر
 *  منبع لاگ یک نوار ۲۴ خانه‌ای دارد که دقیقاً زیر همان محور بالا می‌نشیند.
 *  نتیجه: چشم می‌تواند یک ساعت شلوغ را از نمودار بالا تا منبع مقصرش عمودی
 *  دنبال کند. این «منطق چیدمان» است، نه تزئین.
 *
 *  داده‌ها: services.sparkline / heat.cells — هر دو مستقیم از SystemLog.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cssVars, toneVar, type Tone } from './format';
import s from './TimelineSpine.module.css';

export interface SpineCell {
  key: string;
  intensity: number;
  alert: boolean;
  title: string;
}

export interface SpineStat {
  key: string;
  label: string;
  value: string;
  unit?: string;
}

export interface SpineRowModel {
  key: string;
  label: string;
  caption: string;
  /** برچسب لاتین است و باید در جزیرهٔ ltr رندر شود. */
  latin?: boolean;
  href?: string;
  icon?: ReactNode;
  tone: Tone;
  badge?: string;
  cells: SpineCell[];
  stats: SpineStat[];
}

export interface SpineGroupModel {
  key: string;
  title: string;
  caption: string;
  emptyLabel: string;
  rows: SpineRowModel[];
}

interface Props {
  title: string;
  caption: string;
  groups: SpineGroupModel[];
}

interface RulerTick {
  key: string;
  column: number;
  label: string;
}

const RULER: RulerTick[] = [
  { key: 'spine-24', column: 1, label: '۲۴س' },
  { key: 'spine-18', column: 7, label: '۱۸س' },
  { key: 'spine-12', column: 13, label: '۱۲س' },
  { key: 'spine-06', column: 19, label: '۶س' },
  { key: 'spine-00', column: 24, label: 'اکنون' },
];

function RowBody({ row }: { row: SpineRowModel }) {
  return (
    <>
      <span className={s.mark} aria-hidden>
        {row.icon}
      </span>
      <span className={s.identity}>
        <span className={s.label} dir={row.latin ? 'ltr' : undefined}>
          {row.label}
        </span>
        <span className={s.rowCaption}>{row.caption}</span>
      </span>
      <span className={s.strip} aria-hidden>
        {row.cells.map((cell) => (
          <span
            key={cell.key}
            className={s.cell}
            data-alert={cell.alert}
            title={cell.title}
            style={cssVars({ '--i': cell.intensity })}
          />
        ))}
      </span>
      <span className={s.stats}>
        {row.stats.map((stat) => (
          <span key={stat.key} className={s.stat}>
            <span className={s.statValue}>
              {stat.value}
              {stat.unit ? (
                <span className={s.unit} dir="ltr">
                  {stat.unit}
                </span>
              ) : null}
            </span>
            <span className={s.statLabel}>{stat.label}</span>
          </span>
        ))}
        {row.badge ? <span className={s.badge}>{row.badge}</span> : null}
      </span>
    </>
  );
}

export function TimelineSpine({ title, caption, groups }: Props) {
  return (
    <section className={s.spine} aria-label={title}>
      <header className={s.head}>
        <h2 className={s.title}>{title}</h2>
        <p className={s.caption}>{caption}</p>
      </header>

      <div className={s.rulerRow} aria-hidden>
        <span />
        <span />
        <span className={s.ruler}>
          {RULER.map((tick) => (
            <span key={tick.key} className={s.tick} style={cssVars({ gridColumnStart: tick.column })}>
              {tick.label}
            </span>
          ))}
        </span>
        <span />
      </div>

      {groups.map((group) => (
        <div key={group.key} className={s.group}>
          <div className={s.groupHead}>
            <h3 className={s.groupTitle}>{group.title}</h3>
            <p className={s.groupCaption}>{group.caption}</p>
          </div>

          {group.rows.length === 0 ? (
            <p className={s.empty}>{group.emptyLabel}</p>
          ) : (
            <ul className={s.rows}>
              {group.rows.map((row) => (
                <li key={row.key} className={s.row} style={cssVars({ '--tone': toneVar(row.tone) })}>
                  {row.href ? (
                    <Link href={row.href} className={s.rowInner} data-link="true">
                      <RowBody row={row} />
                    </Link>
                  ) : (
                    <div className={s.rowInner}>
                      <RowBody row={row} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
