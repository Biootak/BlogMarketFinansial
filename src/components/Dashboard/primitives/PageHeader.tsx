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
      className={cn(
        // atelier-aligned: hairline border + rounded card
        'flex items-start justify-between gap-4 flex-wrap',
        'px-5 py-4 sm:px-6 sm:py-5',
        'bg-[color:var(--at-surface)]',
        'border border-[color:var(--at-line)]',
        'rounded-[14px]',
        'shadow-[var(--at-shadow-sm)]',
        'mb-5',
        className,
      )}
      style={transition === 'default' ? { viewTransitionName: 'dash-page' } : undefined}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="مسیر"
            className="flex items-center gap-1 text-xs text-[color:var(--at-fg-subtle)]"
          >
            {breadcrumb.map((item, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <span key={`${item.label}-${i}`} className="flex items-center gap-1">
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="hover:text-[color:var(--at-fg)] transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={cn(isLast && 'text-[color:var(--at-fg)] font-medium')}
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
            <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--at-fg-subtle)] mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--at-fg)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-[color:var(--at-fg-muted)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
