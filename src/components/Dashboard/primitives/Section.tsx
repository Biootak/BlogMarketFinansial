'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface SectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, description, actions, children, className }: SectionProps) {
  return (
    <section className={cn('dash2-section', className)}>
      {(title || description || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-base font-semibold leading-tight tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}
