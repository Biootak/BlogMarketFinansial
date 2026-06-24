'use client';

import { Skeleton as UiSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type SkeletonVariant = 'text' | 'card' | 'avatar' | 'row';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  lines?: number;
  className?: string;
}

const variantClass: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full',
  card: 'h-32 w-full rounded-xl',
  avatar: 'size-10 rounded-full',
  row: 'h-9 w-full rounded-md',
};

export function Skeleton({ variant = 'text', lines = 1, className }: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton lines are order-stable
          <UiSkeleton key={`line-${i}`} className={variantClass.text} />
        ))}
      </div>
    );
  }
  return <UiSkeleton className={cn(variantClass[variant], className)} />;
}
