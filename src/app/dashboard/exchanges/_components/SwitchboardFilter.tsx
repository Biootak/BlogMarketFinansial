'use client';

/**
 * SwitchboardFilter — Atelier 2026
 *
 * Vertical list of 5 "nodes" — each one a clickable filter with
 * pulsing active dot, monotone count, and a left rail that lights
 * up when the node is the active filter.
 */

import type { ReactNode } from 'react';
import s from './ExchangesWorkspace.module.css';

export type SwitchboardId = 'all' | 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED';

export interface SwitchboardItem {
  id: SwitchboardId;
  label: string;
  count: number;
  tone: 'emerald' | 'amber' | 'rose' | 'slate' | 'mixed';
  icon?: ReactNode;
}

interface Props {
  items: SwitchboardItem[];
  active: SwitchboardId;
  onChange: (id: SwitchboardId) => void;
}

const TONE_CLASS: Record<SwitchboardItem['tone'], string> = {
  emerald: s.swNodeEmerald!,
  amber:   s.swNodeAmber!,
  rose:    s.swNodeRose!,
  slate:   s.swNodeSlate!,
  mixed:   s.swNodeMixed!,
};

export default function SwitchboardFilter({ items, active, onChange }: Props) {
  const total = items.reduce((acc, it) => acc + it.count, 0);
  return (
    <>
      {items.map((it) => {
        const isActive = it.id === active;
        const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
        return (
          <button
            key={it.id}
            type="button"
            className={[
              s.swNode,
              TONE_CLASS[it.tone],
              isActive ? s.isActive : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onChange(it.id)}
            aria-pressed={isActive}
            aria-label={`${it.label} — ${it.count} مورد`}
          >
            <span className={s.swNode__dot} aria-hidden>
              <span className={s.swNode__core} />
              <span className={s.swNode__pulse} />
            </span>
            <span className={s.swNode__body}>
              <span className={s.swNode__label}>
                {it.icon}
                <span>{it.label}</span>
              </span>
              <span className={s.swNode__pct}>{pct}٪ از شبکه</span>
            </span>
            <span className={s.swNode__count}>{it.count}</span>
          </button>
        );
      })}
    </>
  );
}
