'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import React, { type ReactNode } from 'react';

export interface SectionProps {
  title?: string;
  description?: string;
  icon?: LucideIcon | ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, description, icon, actions, children, className }: SectionProps) {
  // Handle both LucideIcon component reference and ReactNode element
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return <div className="size-5 text-muted-foreground/70">{icon}</div>;
    }
    const Icon = icon as any;
    return <Icon className="size-5 text-muted-foreground/70" aria-hidden="true" />;
  };

  return (
    <section className={cn('dash2-section', className)}>
      {(title || description || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            {renderIcon()}
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-base font-semibold leading-tight tracking-tight text-foreground">
                  {title}
                </h2>
              )}
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}
