import type React from 'react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  count?: number;
  height?: number | string;
  width?: number | string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  count = 1,
  height = '20px',
  width = '100%',
  className = '',
}) => {
  return (
    <div className="space-y-2">
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            key={index}
            className={cn(
              'relative overflow-hidden rounded-md bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700',
              'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent dark:before:via-white/10',
              className,
            )}
            style={{ height, width }}
          />
        ))}
    </div>
  );
};

export default Loading;
