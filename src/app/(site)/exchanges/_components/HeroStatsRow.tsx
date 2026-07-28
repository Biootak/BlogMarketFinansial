'use client';

/**
 * HeroStatsRow — 4-stat row inside the dark hero.
 *
 *   • Pure CSS, no JS.
 *   • Tabular numerals + accent rules.
 *   • Server-rendered props.
 */

import s from './HeroStatsRow.module.css';

export type HeroStat = {
  label: string;
  value: string;
  hint?: string;
  /** highlight tone */
  tone?: 'default' | 'accent';
};

type Props = {
  stats: HeroStat[];
};

export default function HeroStatsRow({ stats }: Props) {
  return (
    <dl className={s.row} role="list">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`${s.cell} ${stat.tone === 'accent' ? s.cellAccent : ''}`}
          style={{ ['--i' as string]: i } as React.CSSProperties}
        >
          <dt className={s.label}>{stat.label}</dt>
          <dd className={s.value}>
            {stat.value}
            {stat.hint && <span className={s.hint}>{stat.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
