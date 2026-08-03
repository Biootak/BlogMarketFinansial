import { heading, radius, text } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type * as React from 'react';

/**
 * CardTitle — single source of truth for a card heading.
 *   - title — main title (h4 token)
 *   - subtitle — small line below (bodySm token)
 *   - meta — tiny line above (meta token, e.g. author / date)
 *   - trailing — slot on the right (e.g. badge, action button)
 */
interface CardTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  /** Number of lines to clamp the title to. */
  clamp?: 1 | 2 | 3;
  /** Render the title as an anchor (Link href required). */
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  id?: string;
}

export function CardTitle({
  title,
  subtitle,
  meta,
  trailing,
  className,
  clamp = 2,
  as = 'h3',
  id: _id,
}: CardTitleProps) {
  const Tag = as as 'h3';
  const clampClass = clamp === 1 ? 'line-clamp-1' : clamp === 2 ? 'line-clamp-2' : 'line-clamp-3';
  return (
    <div className={cn('flex items-start justify-between gap-2', className)}>
      <div className="min-w-0 flex-1">
        {meta && <p className={cn(text.meta, 'mb-1')}>{meta}</p>}
        <Tag className={cn(heading.h4, clampClass, 'break-words text-balance')}>{title}</Tag>
        {subtitle && <p className={cn(text.bodySm, 'mt-1 line-clamp-2')}>{subtitle}</p>}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </div>
  );
}

/**
 * CardSubtitle — used as a stand-alone line of muted text under a
 * CardTitle or anywhere on a card.
 */
export function CardSubtitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn(text.bodySm, 'line-clamp-2', className)}>{children}</p>;
}

/**
 * CardMeta — tiny row of metadata (author, date, read time).
 */
export function CardMeta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('flex items-center gap-2', text.meta, className)}>{children}</div>;
}

/**
 * CardSurface — the one true card surface wrapper. Use this for every
 * elevated card so shadow / border / background / radius all match.
 */
export function CardSurface({
  children,
  className,
  padding = 'default',
  as: As = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'compact' | 'default' | 'feature' | 'hero' | 'none';
  as?: 'div' | 'article' | 'section';
}) {
  const padClass =
    padding === 'compact'
      ? 'p-3 sm:p-4'
      : padding === 'feature'
        ? 'p-5 sm:p-6'
        : padding === 'hero'
          ? 'p-6 sm:p-8'
          : padding === 'none'
            ? ''
            : 'p-4 sm:p-5';
  return (
    <As
      className={cn(
        'bg-white/70 dark:bg-neutral-900/70',
        'border border-neutral-200/60 dark:border-neutral-800/60',
        'backdrop-blur-sm',
        'shadow-sm shadow-neutral-900/[0.04] dark:shadow-neutral-950/40',
        'transition-all duration-200',
        radius.md,
        padClass,
        className,
      )}
    >
      {children}
    </As>
  );
}
