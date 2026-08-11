'use client';

/**
 * UpcomingDeadlines — slim bar showing time-sensitive items.
 *
 * Sits between KpiStrip and QuickActionsRow. Shows:
 *   - Subscription expiry
 *   - KYC reviews overdue
 *   - Pending approvals aging
 *
 * Each item is clickable → destination page.
 */

import { AlertTriangle, Clock, type LucideIcon, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import s from './UpcomingDeadlines.module.css';

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * iconName — string key, NOT a component: this component receives props
 * across the server→client boundary, and functions cannot be serialized.
 * Map to the icon component here (client side) instead.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  'shield-alert': ShieldAlert,
  'alert-triangle': AlertTriangle,
  clock: Clock,
};

interface DeadlineItem {
  label: string;
  detail: string;
  href: string;
  daysLeft: number; // negative = overdue
  iconName: string;
}

interface UpcomingDeadlinesProps {
  items: DeadlineItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

function daysLabel(days: number): { text: string; tone: 'ok' | 'warn' | 'critical' } {
  if (days < 0) return { text: `${Math.abs(days)} روز معوق`, tone: 'critical' };
  if (days === 0) return { text: 'امروز', tone: 'critical' };
  if (days <= 3) return { text: `${days} روز دیگر`, tone: 'warn' };
  return { text: `${days} روز دیگر`, tone: 'ok' };
}

// ─── Component ─────────────────────────────────────────────────────────

export function UpcomingDeadlines({ items }: UpcomingDeadlinesProps) {
  if (items.length === 0) return null;

  // Show only the 3 most urgent (lowest daysLeft)
  const topItems = [...items].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3);

  return (
    <section className={s.root} aria-label="مهلت‌های نزدیک">
      {topItems.map((item) => {
        const { text, tone } = daysLabel(item.daysLeft);
        const Icon = ICON_MAP[item.iconName] ?? AlertTriangle;

        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`${s.chip} ${s[`chip_${tone}`]}`}
          >
            <Icon size={12} aria-hidden />
            <span className={s.chipLabel}>{item.label}</span>
            <span className={s.chipDetail}>{item.detail}</span>
            <span className={`${s.chipDays} ${s[`chipDays_${tone}`]}`}>{text}</span>
          </Link>
        );
      })}
    </section>
  );
}
