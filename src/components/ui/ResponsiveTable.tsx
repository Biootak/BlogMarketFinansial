'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  mobileLayout?: 'card' | 'scroll';
}

/**
 * Responsive Table Component
 * - Card layout on mobile
 * - Horizontal scroll with indicators on tablet/desktop
 */
export function ResponsiveTable({
  children,
  className,
  mobileLayout = 'scroll',
}: ResponsiveTableProps) {
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(true);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollLeft = target.scrollLeft;
    const scrollWidth = target.scrollWidth;
    const clientWidth = target.clientWidth;

    setShowLeftIndicator(scrollLeft > 0);
    setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 10);
  };

  if (mobileLayout === 'card') {
    return (
      <div className={cn('responsive-table-card', className)}>
        {/* Mobile: Card layout */}
        <div className="md:hidden">{children}</div>

        {/* Desktop: Normal table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">{children}</table>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Scroll indicators */}
      {showLeftIndicator && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-neutral-900 to-transparent z-10 flex items-center">
          <ChevronRight className="w-5 h-5 text-neutral-400" />
        </div>
      )}

      {showRightIndicator && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent z-10 flex items-center justify-end">
          <ChevronLeft className="w-5 h-5 text-neutral-400" />
        </div>
      )}

      {/* Scrollable table */}
      <div className="overflow-x-auto" onScroll={handleScroll}>
        <table className="w-full min-w-[600px]">{children}</table>
      </div>
    </div>
  );
}

/**
 * Responsive Table Cell with truncation
 */
export function ResponsiveTableCell({
  children,
  className,
  truncate = false,
}: {
  children: React.ReactNode;
  className?: string;
  truncate?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!truncate) {
    return <td className={className}>{children}</td>;
  }

  return (
    <td className={className}>
      <div
        className={cn(
          'cursor-pointer',
          !isExpanded && 'truncate max-w-[200px]'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        title={typeof children === 'string' ? children : undefined}
      >
        {children}
      </div>
    </td>
  );
}
