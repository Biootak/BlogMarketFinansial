import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type React from 'react';

interface CardSkeletonProps {
  className?: string;
  ratio?: string;
  hiddenAuthor?: boolean;
  hideCategories?: boolean;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className = '',
  ratio = 'aspect-w-4 aspect-h-3',
  hiddenAuthor = false,
  hideCategories = false,
}) => {
  return (
    <div
      className={cn(
        'relative flex flex-col group rounded-3xl overflow-hidden bg-white dark:bg-neutral-800 shadow-lg',
        className,
      )}
    >
      <div
        className={cn(
          'block flex-shrink-0 relative w-full rounded-t-3xl overflow-hidden z-10',
          ratio,
        )}
      >
        <Skeleton className="h-full w-full bg-neutral-200 dark:bg-neutral-700" />
      </div>
      {!hideCategories && (
        <div className="absolute top-3 inset-x-3 z-10">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full bg-primary-100 dark:bg-primary-800" />
            <Skeleton className="h-6 w-16 rounded-full bg-secondary-100 dark:bg-secondary-800" />
          </div>
        </div>
      )}
      <div className="p-4 flex flex-col flex-grow">
        {!hiddenAuthor && (
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            <div className="flex-grow">
              <Skeleton className="h-3 w-24 mb-2 bg-neutral-200 dark:bg-neutral-700" />
              <Skeleton className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700" />
            </div>
          </div>
        )}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-5 w-full bg-neutral-200 dark:bg-neutral-700" />
          <Skeleton className="h-5 w-[85%] bg-neutral-200 dark:bg-neutral-700" />
        </div>
        <div className="space-y-2 mb-4 flex-grow">
          <Skeleton className="h-4 w-full bg-neutral-100 dark:bg-neutral-800" />
          <Skeleton className="h-4 w-[90%] bg-neutral-100 dark:bg-neutral-800" />
          <Skeleton className="h-4 w-[75%] bg-neutral-100 dark:bg-neutral-800" />
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            <Skeleton className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>
      </div>
    </div>
  );
};

export default CardSkeleton;
