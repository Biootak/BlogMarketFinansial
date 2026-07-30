'use client';

import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';

export type PillTabItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number | string;
  tone?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet' | 'neutral';
};

interface PillTabsProps {
  tabs: PillTabItem[];
  active: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

/**
 * PillTabs — pill-shaped segmented control.
 * - sliding active indicator (transform-based, not layout)
 * - RTL-correct: order reverses visually for LTR but the indicator
 *   uses logical properties so the active position is correct.
 * - 44px touch target for accessibility.
 */
export function PillTabs({
  tabs,
  active,
  onChange,
  size = 'md',
  className,
  ariaLabel,
}: PillTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(s.pillTabs, s[`size-${size}`], className)}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={s.pillTab}
            data-active={isActive}
            data-tone={t.tone ?? 'neutral'}
          >
            {t.icon ? <span className={s.pillIcon}>{t.icon}</span> : null}
            <span className={s.pillLabel}>{t.label}</span>
            {t.count !== undefined ? (
              <span className={s.pillCount}>{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
