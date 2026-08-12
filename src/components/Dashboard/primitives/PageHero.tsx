'use client';

/**
 * PageHero — premium 2026 dashboard page header.
 *
 * Refined typography, subtle gradient wash, elegant breadcrumb rail,
 * and a decorative accent line. The hierarchy does the work: quiet crumbs,
 * one display title, a muted description, and page actions. An optional
 * icon adds a signature touch without clutter.
 *
 * Tokens: --nova-* (dashboard) with --ds-* fallbacks.
 * Layout: RTL logical properties only.
 * Motion: opacity + transform only.
 */

import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ComponentType, ElementType, ReactNode } from 'react';
import s from './PageHero.module.css';

export interface PageHeroProps {
  breadcrumb?: Array<{ href?: string; label: string }>;
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  iconAs?: ElementType;
  className?: string;
  /** Optional signature visual element (SVG, illustration, etc.) */
  signature?: ReactNode;
}

export function PageHero({
  breadcrumb,
  title,
  description,
  eyebrow,
  actions,
  icon: IconComp,
  iconAs: IconAs = 'div',
  className,
  signature,
}: PageHeroProps) {
  const crumbs = breadcrumb ?? [];
  const hasCrumbs = crumbs.length > 0 || !!eyebrow;

  return (
    <header className={cn(s.hero, className)} dir="rtl">
      {/* Gradient wash layers */}
      <span className={s.washPrimary} aria-hidden />
      <span className={s.washSecondary} aria-hidden />

      {/* Signature visual element */}
      {signature && <div className={s.signature}>{signature}</div>}

      <div className={s.inner}>
        {/* ── Breadcrumb rail ── */}
        {hasCrumbs && (
          <nav className={s.crumb} aria-label="مسیر">
            {crumbs.map((item, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={`${item.label}-${i}`} className={s.crumbItem}>
                  {item.href && !isLast ? (
                    <Link href={item.href} className={s.crumbLink}>
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={isLast ? s.crumbCurrent : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                  {!isLast && <span className={s.crumbSep} aria-hidden />}
                </span>
              );
            })}
            {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
          </nav>
        )}

        {/* ── Title row ── */}
        <div className={s.row}>
          <div className={s.main}>
            <div className={s.titleRow}>
              {IconComp && (
                <IconAs className={s.iconWrap}>
                  <IconComp className={s.icon} />
                </IconAs>
              )}
              <h1 className={s.title}>{title}</h1>
            </div>
            {/* Decorative accent line */}
            <span className={s.accentLine} aria-hidden />
            {description && <p className={s.description}>{description}</p>}
          </div>
          {actions && <div className={s.actions}>{actions}</div>}
        </div>
      </div>
    </header>
  );
}
