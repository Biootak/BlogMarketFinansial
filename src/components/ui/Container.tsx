import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const containerSizes = {
  sm: 'max-w-screen-sm', // 640px
  md: 'max-w-screen-md', // 768px
  lg: 'max-w-screen-lg', // 1024px
  xl: 'max-w-screen-xl', // 1280px
  full: 'max-w-full',
} as const;

/**
 * Container component with responsive padding
 * Mobile: px-4 (16px)
 * Tablet: px-6 (24px)
 * Desktop: px-8 (32px)
 */
export function Container({ children, size = 'lg', className }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-4 md:px-6 lg:px-8', containerSizes[size], className)}>
      {children}
    </div>
  );
}
