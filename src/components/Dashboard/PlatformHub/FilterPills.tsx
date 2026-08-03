'use client';

import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type FilterPillItem = {
  id: string;
  label: string;
  count?: number | string;
  tone?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet' | 'neutral';
};

export interface FilterPillsProps {
  items: FilterPillItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
  /** layout variant */
  variant?: 'inline' | 'stacked';
}

/**
 * FilterPills — chip-style filter row.
 * Different from PillTabs: pills are independent toggles, not a single
 * active selection (though visually similar). Used in filter bars.
 */
export function FilterPills({
  items,
  active,
  onChange,
  className,
  ariaLabel,
  variant = 'inline',
}: FilterPillsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(s.filterPills, s[`variant-${variant}`], className)}
    >
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(it.id)}
            className={s.filterPill}
            data-active={isActive}
            data-tone={it.tone ?? 'neutral'}
          >
            <span>{it.label}</span>
            {it.count !== undefined ? <span className={s.filterPillCount}>{it.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
