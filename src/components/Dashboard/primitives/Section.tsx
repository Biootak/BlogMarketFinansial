'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import React, { type ReactNode } from 'react';

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
  // Handle both LucideIcon component reference and ReactNode element
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return <div className="size-5 text-muted-foreground/70">{icon}</div>;
    }
    const Icon = icon as LucideIcon;
    return <Icon className="size-5 text-muted-foreground/70" aria-hidden="true" />;
  };

  const sub = subtitle ?? description;
  return (
    <section
      className={cn('dash2-section', padding === 'none' && 'dash2-section--flush', className)}
    >
      {(title || sub || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            {renderIcon()}
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-base font-semibold leading-tight tracking-tight text-foreground">
                  {title}
                </h2>
              )}
              {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padding === 'none' ? undefined : 'mt-3'}>{children}</div>
    </section>
  );
}
