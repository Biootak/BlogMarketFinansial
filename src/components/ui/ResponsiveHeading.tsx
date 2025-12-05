import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { getResponsiveFontSize, getLineHeight, getFontWeight } from '@/lib/responsive/typography';

export interface ResponsiveHeadingProps {
  level: 1 | 2 | 3 | 4;
  children: ReactNode;
  className?: string;
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
}

/**
 * Responsive Heading Component
 * Automatically scales font size based on viewport
 */
export function ResponsiveHeading({
  level,
  children,
  className,
  weight = 'bold',
}: ResponsiveHeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const levelKey = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';

  return (
    <Tag
      className={cn(
        getResponsiveFontSize(levelKey),
        getLineHeight(levelKey),
        getFontWeight(weight),
        className
      )}
    >
      {children}
    </Tag>
  );
}
