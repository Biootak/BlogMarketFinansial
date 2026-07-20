'use client';

import { cn } from '@/lib/utils';

interface LoadingMoreProps {
  message?: string;
  className?: string;
}

export default function LoadingMore({
  message = 'در حال بارگذاری موارد بیشتر...',
  className,
}: LoadingMoreProps) {
  return (
    <div
      className={cn(
        'col-span-full flex items-center justify-center gap-3 py-6',
        'bg-gradient-to-r from-transparent via-gray-50/50 to-transparent',
        'dark:via-gray-800/30',
        className,
      )}
    >
      {/* Animated Spinner */}
      <div className="relative h-5 w-5">
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'border-2 border-gray-200/60 dark:border-gray-700/40',
          )}
        />
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'border-2 border-transparent',
            'border-t-[rgb(var(--c-primary-500))] border-r-[rgb(var(--c-primary-400))]',
            'animate-spin',
          )}
          style={{ animationDuration: '0.7s' }}
        />
      </div>

      {/* Message */}
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{message}</span>

      {/* Animated Dots */}
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 w-1 rounded-full',
              'bg-[rgb(var(--c-primary-500))]',
              'animate-bounce',
            )}
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
          />
        ))}
      </div>
    </div>
  );
}
