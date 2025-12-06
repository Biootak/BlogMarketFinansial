import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface SectionProps {
  children: ReactNode;
  spacing?: 'tight' | 'normal' | 'loose';
  className?: string;
}

const spacingVariants = {
  tight: 'py-6', // 1.5rem
  normal: 'py-8', // 2rem
  loose: 'py-12', // 3rem
} as const;

/**
 * Section component with consistent vertical spacing
 */
export function Section({ children, spacing = 'normal', className }: SectionProps) {
  return <section className={cn(spacingVariants[spacing], className)}>{children}</section>;
}
