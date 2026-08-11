'use client';

/**
 * QuickAction — unified action chip/button for all dashboards.
 *
 * Compact clickable chip with icon, label, and optional badge/count.
 * Uses --nova-* tokens. RTL-safe.
 *
 * Usage:
 *   <QuickAction href="/dashboard/posts" icon={<Plus size={14} />} label="نوشتار جدید" />
 *   <QuickAction href="/dashboard/rates" icon={<TrendingUp size={14} />} label="نرخ ارز" badge="۳" />
 */

import type { ReactNode } from 'react';
import s from './QuickAction.module.css';

export type QuickActionTone = 'default' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';

export interface QuickActionProps {
  /** Navigation target */
  href: string;
  /** Icon (lucide-react component) */
  icon: ReactNode;
  /** Action label */
  label: string;
  /** Optional count/badge */
  badge?: string | number;
  /** Color tone */
  tone?: QuickActionTone;
  /** Target for link */
  target?: string;
  /** Rel for link */
  rel?: string;
}

export function QuickAction({
  href,
  icon,
  label,
  badge,
  tone = 'default',
  target,
  rel,
}: QuickActionProps) {
  return (
    <a href={href} className={`${s.root} ${s[`tone_${tone}`] ?? ''}`} target={target} rel={rel}>
      <span className={s.icon} aria-hidden>
        {icon}
      </span>
      <span className={s.label}>{label}</span>
      {badge != null && (
        <span className={s.badge} aria-label={`${typeof badge === 'number' ? badge : badge} مورد`}>
          {badge}
        </span>
      )}
    </a>
  );
}

/**
 * QuickActionRow — horizontal scrollable row of QuickAction chips.
 */

interface QuickActionRowProps {
  items: Array<{
    href: string;
    icon: ReactNode;
    label: string;
    badge?: string | number;
    tone?: QuickActionTone;
    target?: string;
    rel?: string;
  }>;
  /** Max items to show — rest hidden */
  maxItems?: number;
}

export function QuickActionRow({ items, maxItems }: QuickActionRowProps) {
  const display = maxItems ? items.slice(0, maxItems) : items;

  return (
    <nav className={s.row} aria-label="دسترسی سریع">
      {display.map((item, i) => (
        <QuickAction key={item.href + i} {...item} />
      ))}
    </nav>
  );
}
