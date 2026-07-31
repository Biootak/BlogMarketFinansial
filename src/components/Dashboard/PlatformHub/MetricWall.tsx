'use client';

import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type MetricWallTile = {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet';
  emphasis?: 'hero' | 'standard' | 'minor';
  /** optional sparkline values to render below the value */
  spark?: number[];
};

export interface MetricWallProps {
  tiles: MetricWallTile[];
  className?: string;
}

/**
 * MetricWall — asymmetric grid: 1 hero + 4 standard + N minor.
 * Breaks the "Stripe bento" monotony with hero/standard/minor tiers.
 * - mobile: 1 col
 * - tablet: hero full-width, then 2 cols
 * - desktop: 2 + 3 asymmetric layout
 */
export function MetricWall({ tiles, className }: MetricWallProps) {
  const hero = tiles.find((t) => t.emphasis === 'hero');
  const standards = tiles.filter((t) => t.emphasis === 'standard' || !t.emphasis);
  const minors = tiles.filter((t) => t.emphasis === 'minor');

  return (
    <div className={cn(s.metricWall, className)}>
      {hero ? <Tile t={hero} isHero /> : null}
      <div className={s.metricWallStandards}>
        {standards.map((t) => (
          <Tile key={t.id} t={t} />
        ))}
      </div>
      {minors.length > 0 ? (
        <div className={s.metricWallMinors}>
          {minors.map((t) => (
            <Tile key={t.id} t={t} isMinor />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Tile({ t, isHero = false, isMinor = false }: { t: MetricWallTile; isHero?: boolean; isMinor?: boolean }) {
  return (
    <div
      className={cn(s.metricTile, isHero && s.metricTileHero, isMinor && s.metricTileMinor)}
      data-tone={t.tone ?? 'neutral'}
    >
      <div className={s.metricTileHead}>
        <span className={s.metricLabel}>{t.label}</span>
        {t.icon ? <span className={s.metricIcon}>{t.icon}</span> : null}
      </div>
      <div className={s.metricValue}>{t.value}</div>
      {t.hint ? <div className={s.metricHint}>{t.hint}</div> : null}
    </div>
  );
}
