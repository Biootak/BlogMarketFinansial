'use client';

import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import s from './PlatformHub.module.css';
import { LiveDot } from './LiveDot';
import { PillTabs, type PillTabItem } from './PillTabs';
import type { LiveDotTone } from './LiveDot';

export type HubShellBreadcrumb = { href?: string; label: string };

export type HubShellStat = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  /** رنگ oklch (اختیاری) — اگر داده نشود از accent استفاده می‌شود */
  color?: string;
};

export type HubShellMeta = {
  /** small label above the title */
  eyebrow?: string;
  /** main title */
  title: string;
  /** supporting line */
  subtitle?: string;
  /** inline pills (live indicator, dates, …) */
  badges?: Array<{ label: string; tone?: LiveDotTone; live?: boolean }>;
  /** right-side actions */
  actions?: React.ReactNode;
  /** breadcrumb above the title */
  breadcrumb?: HubShellBreadcrumb[];
  /** headline stats — رکورد افقی نوار بالای صفحه (نه ۶ کارت تکراری) */
  stats?: HubShellStat[];
  /** رنگ accent برای stats (oklch) */
  statsAccent?: string;
};

export type HubShellProps = {
  meta: HubShellMeta;
  /** primary tab set shown right under the header */
  tabs?: PillTabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** children rendered below the header */
  children: React.ReactNode;
  className?: string;
};

/**
 * HubShell — shared header shell for the four platform-tier hubs.
 * Provides: breadcrumb + eyebrow + title + subtitle + badges + headline stats + actions, then tabs,
 * then the page body. Avoids re-implementing the same chrome in 4 pages.
 *
 *  ┌────────────────────────────────────────────┐
 *  │ breadcrumb (small, top)                    │
 *  │ eyebrow · live           actions →         │
 *  │ Title  (large, multi-line)                 │
 *  │ subtitle  (muted)                          │
 *  │ ──── headline stats row (inline) ────      │
 *  │ ──── pill tabs row ────                    │
 *  │                                            │
 *  │ <children>                                 │
 *  └────────────────────────────────────────────┘
 */
export function HubShell({
  meta,
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: HubShellProps) {
  return (
    <div className={cn(s.hubShell, className)}>
      <div className={s.hubHeader}>
        {meta.breadcrumb && meta.breadcrumb.length > 0 ? (
          <nav aria-label="مسیر" className={s.hubBreadcrumb}>
            {meta.breadcrumb.map((b, i) => {
              const isLast = i === meta.breadcrumb!.length - 1;
              return (
                <span key={`${b.label}-${i}`} className={s.hubBreadcrumbItem}>
                  {b.href && !isLast ? (
                    <a href={b.href} className={s.hubBreadcrumbLink}>
                      {b.label}
                    </a>
                  ) : (
                    <span aria-current={isLast ? 'page' : undefined} className={isLast ? s.hubBreadcrumbCurrent : undefined}>
                      {b.label}
                    </span>
                  )}
                  {!isLast ? <ChevronLeft size={12} aria-hidden className={s.hubBreadcrumbSep} /> : null}
                </span>
              );
            })}
          </nav>
        ) : null}
        <div className={s.hubHeaderRow}>
          <div className={s.hubHeaderMain}>
            {meta.eyebrow ? (
              <div className={s.hubEyebrow}>
                {meta.badges?.some((b) => b.live)
                  ? <LiveDot tone={meta.badges.find((b) => b.live)?.tone ?? 'emerald'} size="sm" />
                  : null}
                <span>{meta.eyebrow}</span>
              </div>
            ) : null}
            <h1 className={s.hubTitle}>{meta.title}</h1>
            {meta.subtitle ? <p className={s.hubSubtitle}>{meta.subtitle}</p> : null}
            {meta.badges && meta.badges.length > 0 ? (
              <div className={s.hubBadges}>
                {meta.badges.map((b, i) => (
                  <span key={i} className={s.hubBadge} data-tone={b.tone ?? 'neutral'}>
                    {b.live ? <LiveDot tone={b.tone ?? 'emerald'} size="xs" /> : null}
                    {b.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {meta.actions ? <div className={s.hubActions}>{meta.actions}</div> : null}
        </div>
        {meta.stats && meta.stats.length > 0 ? (
          <div
            className={s.hubStats}
            style={{ ['--stats-accent' as string]: meta.statsAccent ?? 'var(--ds-accent-emerald)' }}
          >
            {meta.stats.map((stat) => (
              <div key={stat.id} className={s.hubStat}>
                <span
                  className={s.hubStatIcon}
                  style={{ color: stat.color ?? meta.statsAccent }}
                >
                  {stat.icon}
                </span>
                <div className={s.hubStatBody}>
                  <div className={s.hubStatLabel}>{stat.label}</div>
                  <div className={s.hubStatValue}>{stat.value}</div>
                  {stat.hint ? <div className={s.hubStatHint}>{stat.hint}</div> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {tabs && tabs.length > 0 ? (
          <div className={s.hubTabs}>
            <PillTabs tabs={tabs} active={activeTab ?? tabs[0].id} onChange={(id) => onTabChange?.(id)} ariaLabel="بخش‌های مرکز" />
          </div>
        ) : null}
      </div>
      <div className={s.hubBody}>{children}</div>
    </div>
  );
}
