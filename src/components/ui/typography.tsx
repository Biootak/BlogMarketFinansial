import { heading, space, text } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import * as React from 'react';

/**
 * SectionTitle — the single source of truth for a section heading.
 * Replaces every <h2 className="text-xl sm:text-2xl font-bold ..."> across
 * the project. Use everywhere a section needs a title.
 *
 * Variants match the heading tokens:
 *   h1 — page title (one per page)
 *   h2 — section title (most common)
 *   h3 — sub-section
 *   h4 — card group title
 */
type Variant = 'h1' | 'h2' | 'h3' | 'h4';

interface SectionTitleProps {
  as?: Variant;
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<Variant, string> = {
  h1: heading.h1,
  h2: heading.h2,
  h3: heading.h3,
  h4: heading.h4,
};

export function SectionTitle({ as, variant = 'h2', children, className }: SectionTitleProps) {
  const tag = (as ?? variant) as 'h1' | 'h2' | 'h3' | 'h4';
  return React.createElement(tag, { className: cn(variantMap[variant], className) }, children);
}

/**
 * SectionBlock — wrapper for the entire section header block:
 * optional eyebrow, title, and description. Used in every home section.
 */
interface SectionBlockProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
  align?: 'start' | 'center';
}

export function SectionBlock({
  title,
  description,
  eyebrow,
  className,
  align = 'start',
}: SectionBlockProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 sm:gap-2',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className,
      )}
    >
      {eyebrow && <span className={heading.h5}>{eyebrow}</span>}
      <SectionTitle>{title}</SectionTitle>
      {description && <p className={cn(text.bodySm, 'max-w-2xl')}>{description}</p>}
    </div>
  );
}

/**
 * PageTitle — used in dashboard page headers and top-of-page hero blocks.
 */
export function PageTitle({
  children,
  description,
  className,
}: {
  children: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <h1 className={heading.h1}>{children}</h1>
      {description && <p className={text.bodySm}>{description}</p>}
    </div>
  );
}

export { space };
