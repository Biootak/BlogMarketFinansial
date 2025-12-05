import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  className?: string;
}

/**
 * Responsive Grid Component
 * Automatically adjusts columns based on viewport
 * Default: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
 */
export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: 4, tablet: 6, desktop: 6 },
  className,
}: ResponsiveGridProps) {
  const gridCols = {
    mobile: `grid-cols-${cols.mobile || 1}`,
    tablet: `md:grid-cols-${cols.tablet || 2}`,
    desktop: `lg:grid-cols-${cols.desktop || 3}`,
  };

  const gridGap = {
    mobile: `gap-${gap.mobile || 4}`,
    tablet: `md:gap-${gap.tablet || 6}`,
    desktop: `lg:gap-${gap.desktop || 6}`,
  };

  return (
    <div
      className={cn(
        'grid',
        gridCols.mobile,
        gridCols.tablet,
        gridCols.desktop,
        gridGap.mobile,
        gridGap.tablet,
        gridGap.desktop,
        className
      )}
    >
      {children}
    </div>
  );
}
