'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface InfiniteScrollProps<T extends { id: string | number }> {
  children: (
    data: T[],
    hasMore: boolean,
    isLoading: boolean,
    loadMore: () => void,
  ) => React.ReactNode;
  fetchMore: (page: number) => Promise<{ data: T[]; hasMore: boolean }>;
  initialData: T[];
  initialHasMore: boolean;
  threshold?: number;
  className?: string;
}

export function InfiniteScroll<T extends { id: string | number }>({
  children,
  fetchMore,
  initialData,
  initialHasMore,
  threshold = 100,
  className,
}: InfiniteScrollProps<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(1);
  const loadedIdsRef = useRef<Set<string | number>>(new Set(initialData.map((item) => item.id)));
  // state همیشه از ref خوانده می‌شود تا loadMore identity ثابت بماند —
  // در غیر این صورت هر تغییر isLoading/hasMore، observer را دوباره می‌سازد
  // و اگر sentinel هنوز در viewport باشد، صفحهٔ بعدی آبشاری لود می‌شود.
  const isLoadingRef = useRef(isLoading);
  const hasMoreRef = useRef(hasMore);
  const errorRef = useRef(error);
  isLoadingRef.current = isLoading;
  hasMoreRef.current = hasMore;
  errorRef.current = error;

  const observerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current || errorRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchMore(pageRef.current + 1);

      // Filter out duplicates by ID
      const newItems = result.data.filter((item) => !loadedIdsRef.current.has(item.id));

      // Add new IDs to the set
      for (const item of newItems) {
        loadedIdsRef.current.add(item.id);
      }

      setData((prev) => [...prev, ...newItems]);
      setHasMore(result.hasMore);
      pageRef.current += 1;
    } catch {
      setError('خطا در بارگذاری بیشتر');
    } finally {
      setIsLoading(false);
    }
  }, [fetchMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          loadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0.1,
      },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [threshold, loadMore]);

  const handleRetry = () => {
    setError(null);
    loadMore();
  };

  return (
    <div className={className} ref={observerRef}>
      {children(data, hasMore, isLoading, loadMore)}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>در حال بارگذاری...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Sentinel for intersection observer */}
      {hasMore && !error && <div ref={loadMoreRef} className="h-4" aria-hidden="true" />}

      {/* End of list indicator */}
      {!hasMore && data.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>به انتهای لیست رسیدید</p>
        </div>
      )}
    </div>
  );
}
