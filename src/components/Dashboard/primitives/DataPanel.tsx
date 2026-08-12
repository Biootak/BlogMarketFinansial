'use client';

/**
 * DataPanel — premium framed data console (2026 redesign).
 *
 * A refined panel wrapping tables, toolbars, and footers with an identity
 * strip (accent dot + icon chip + title + count badge) on top. The toolbar
 * area inside the body gets a recessed glassy look, and the footer has a
 * subtle separator.
 *
 * Aesthetic reference: Stripe Dashboard / Linear — premium data panels.
 *
 * Structure:
 *   ┌──────────────────────────────────────────────┐
 *   │ ● [icon]  عنوان  (count)        [actions]    │  ← head strip
 *   ├──────────────────────────────────────────────┤
 *   │  toolbar (recessed glassy strip)              │  ← body
 *   │  DataTable                                    │
 *   │  ───────────────────────────────────────────  │  ← footer separator
 *   │  footer (pagination / count)                  │
 *   └──────────────────────────────────────────────┘
 */

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import s from './DataPanel.module.css';

export interface DataPanelProps {
  title: string;
  icon?: ReactNode;
  /** Live count badge shown next to the title. */
  count?: string | number;
  /** Optional head actions (inline-end of the strip). */
  actions?: ReactNode;
  /** Custom header — replaces the default head entirely when provided. */
  customHeader?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function DataPanel({
  title,
  icon,
  count,
  actions,
  customHeader,
  children,
  footer,
  className,
  bodyClassName,
}: DataPanelProps) {
  return (
    <section className={cn(s.panel, className)}>
      {/* Accent hairline — decorative top border */}
      {!customHeader && <div className={s.accentLine} aria-hidden />}

      {customHeader ? (
        customHeader
      ) : (
        <header className={s.head}>
          <div className={s.headline}>
            {/* Accent dot — always present for visual identity */}
            <span className={s.accentDot} aria-hidden />

            {icon && (
              <span className={s.headIcon} aria-hidden>
                {icon}
              </span>
            )}
            <h2 className={s.title}>{title}</h2>
            {count !== undefined && (
              <span className={s.count} aria-label={`${count} مورد`}>
                {count}
              </span>
            )}
          </div>
          {actions && <div className={s.headActions}>{actions}</div>}
        </header>
      )}
      <div className={cn(s.body, bodyClassName)}>
        {children}
        {footer && (
          <div className={s.footer}>
            <div className={s.footerSeparator} aria-hidden />
            <div className={s.footerInner}>{footer}</div>
          </div>
        )}
      </div>
    </section>
  );
}
