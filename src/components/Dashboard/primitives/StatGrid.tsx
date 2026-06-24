'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface StatGridProps {
  cols?: 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

const colsClass: Record<NonNullable<StatGridProps['cols']>, string> = {
  2: '@sm:grid-cols-2',
  3: '@sm:grid-cols-2 @lg:grid-cols-3',
  4: '@sm:grid-cols-2 @lg:grid-cols-4',
  5: '@sm:grid-cols-2 @md:grid-cols-3 @xl:grid-cols-5',
  6: '@sm:grid-cols-2 @md:grid-cols-3 @xl:grid-cols-6',
};

const gapClass: Record<NonNullable<StatGridProps['gap']>, string> = {
  sm: 'gap-2 @md:gap-3',
  md: 'gap-3 @md:gap-4',
  lg: 'gap-4 @md:gap-6',
};

export function StatGrid({ cols = 4, gap = 'md', children, className }: StatGridProps) {
  return (
    <div className={cn('@container grid grid-cols-1', colsClass[cols], gapClass[gap], className)}>
      {children}
    </div>
  );
}
