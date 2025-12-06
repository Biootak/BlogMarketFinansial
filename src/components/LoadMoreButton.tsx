'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';;;
import Link from 'next/link';

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

export default function LoadMoreButton({ onLoadMore, isLoading, hasMore }: LoadMoreButtonProps) {
  return (
    <div className="flex items-center justify-center gap-3 pt-6">
      {hasMore && (
        <Button
          onClick={onLoadMore}
          disabled={isLoading}
          className="relative px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              در حال بارگذاری...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ChevronDown className="w-4 h-4" />
              بارگذاری بیشتر
            </span>
          )}
        </Button>
      )}
      <Link href="/archive">
        <Button
          variant="outline"
          className="px-6 py-2.5 border-2 border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium rounded-xl transition-all duration-300 group"
        >
          <span className="flex items-center gap-2">
            مشاهده همه
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </span>
        </Button>
      </Link>
    </div>
  );
}
