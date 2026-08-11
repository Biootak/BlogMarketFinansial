'use client';

/**
 * DataCard — unified card component for all 3 dashboards.
 *
 * Replaces ad-hoc card styles across Admin/Exchange/Customer panels.
 * Uses --nova-* tokens. Supports header, body, footer, actions, and accent border.
 *
 * Usage:
 *   <DataCard title="نرخ ارز" accent="emerald" actions={<Button>...</Button>}>
 *     <p>content</p>
 *   </DataCard>
 */

import type { ReactNode } from 'react';
import s from './DataCard.module.css';

export type DataCardTone = 'default' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'blue';
export type DataCardRadius = 'sm' | 'md' | 'lg' | 'xl';

export interface DataCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  /** Accent border color on the top */
  accent?: DataCardTone;
  /** Card border radius */
  radius?: DataCardRadius;
  /** Extra class for the body content area */
  bodyClassName?: string;
  /** Make card clickable (wraps in <a>) */
  href?: string;
  /** Show subtle hover effect */
  interactive?: boolean;
}

export function DataCard({
  title,
  description,
  children,
  footer,
  actions,
  accent,
  radius = 'lg',
  bodyClassName,
  href,
  interactive = false,
}: DataCardProps) {
  const wrapper = (content: ReactNode) => {
    if (href) {
      return (
        <a
          href={href}
          className={`${s.root} ${interactive ? s.interactive : ''} ${s[`radius_${radius}`] ?? ''} ${accent ? s[`accent_${accent}`] : ''}`}
          style={{ textDecoration: 'none' }}
        >
          {content}
        </a>
      );
    }
    return (
      <div
        className={`${s.root} ${interactive ? s.interactive : ''} ${s[`radius_${radius}`] ?? ''} ${accent ? s[`accent_${accent}`] : ''}`}
      >
        {content}
      </div>
    );
  };

  return wrapper(
    <>
      {(title || description || actions) && (
        <header className={s.header}>
          <div className={s.headerText}>
            {title && <h3 className={s.title}>{title}</h3>}
            {description && <p className={s.description}>{description}</p>}
          </div>
          {actions && <div className={s.actions}>{actions}</div>}
        </header>
      )}

      <div className={`${s.body} ${bodyClassName ?? ''}`}>{children}</div>

      {footer && <footer className={s.footer}>{footer}</footer>}
    </>,
  );
}
