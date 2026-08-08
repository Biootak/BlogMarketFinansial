'use client';

import { Button } from '@/components/ui/button';
import { ChevronDown, Loader2 } from 'lucide-react';

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

export default function LoadMoreButton({ onLoadMore, isLoading, hasMore }: LoadMoreButtonProps) {
  if (!hasMore && !isLoading) return null;

  return (
    <div className="flex items-center justify-center pt-6">
      <Button
        type="button"
        onClick={onLoadMore}
        disabled={isLoading}
        className={cn(
          'relative px-6 py-2.5',
          'bg-gradient-to-r from-primary-500 to-primary-600',
          'hover:from-primary-600 hover:to-primary-700',
          'text-white font-medium rounded-xl',
          'shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40',
          'transition-all duration-300 hover:-translate-y-0.5',
          'disabled:opacity-70 disabled:hover:translate-y-0',
        )}
        aria-label="بارگذاری بیشتر"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            در حال بارگذاری…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <ChevronDown className="w-4 h-4" aria-hidden />
            بارگذاری بیشتر
          </span>
        )}
      </Button>
    </div>
  );
}

/* cn helper — local copy to avoid extra import churn */
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
