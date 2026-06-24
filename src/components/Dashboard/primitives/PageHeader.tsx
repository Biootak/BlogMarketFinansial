'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  breadcrumb?: Array<{ href?: string; label: string }>;
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  transition?: 'default' | 'none';
  className?: string;
}

export function PageHeader({
  breadcrumb,
  title,
  description,
  eyebrow,
  actions,
  transition = 'none',
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn('dash2-pageheader', className)}
      style={transition === 'default' ? { viewTransitionName: 'dash-page' } : undefined}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="مسیر"
            className="dash2-pageheader__crumbs flex items-center gap-1 text-xs text-muted-foreground"
          >
            {breadcrumb.map((item, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <span key={`${item.label}-${i}`} className="flex items-center gap-1">
                  {item.href && !isLast ? (
                    <Link href={item.href} className="hover:text-foreground transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={cn(isLast && 'text-foreground font-medium')}
                    >
                      {item.label}
                    </span>
                  )}
                  {!isLast && (
                    <ChevronLeft className="size-3 opacity-50 rtl:rotate-180" aria-hidden="true" />
                  )}
                </span>
              );
            })}
          </nav>
        )}
        <div>
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h1 className="dash2-pageheader__title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="dash2-pageheader__sub mt-1 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="dash2-pageheader__actions flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
