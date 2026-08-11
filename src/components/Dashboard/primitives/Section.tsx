'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import React, { type ReactNode } from 'react';
import s from './Section.module.css';

export interface SectionProps {
  title?: string;
  description?: string;
  /** alias for `description` — some pages pass it as the secondary line */
  subtitle?: string;
  icon?: LucideIcon | ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 'none' removes the default inner spacing (for full-bleed content) */
  padding?: 'none' | 'default';
}

export function Section({
  title,
  description,
  subtitle,
  icon,
  actions,
  children,
  className,
  padding = 'default',
}: SectionProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return <div className={s.iconWrap}>{icon}</div>;
    }
    const Icon = icon as LucideIcon;
    return (
      <div className={s.iconWrap}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
    );
  };

  const sub = subtitle ?? description;
  return (
    <section
      className={cn(
        s.root,
        'dash2-section',
        padding === 'none' && 'dash2-section--flush',
        className,
      )}
    >
      {(title || sub || actions) && (
        <header className={s.header}>
          <div className={s.titleGroup}>
            {renderIcon()}
            <div className={s.titleContent}>
              {title && <h2 className={s.title}>{title}</h2>}
              {sub && <p className={s.subtitle}>{sub}</p>}
            </div>
          </div>
          {actions && <div className={s.actions}>{actions}</div>}
        </header>
      )}
      <div className={padding === 'none' ? s.contentFlush : s.content}>{children}</div>
    </section>
  );
}
