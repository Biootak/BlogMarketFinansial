'use client';
import Empty from '@/components/Empty';
import LoadMoreButton from '@/components/LoadMoreButton';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { useCallback, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import AtelierGrid from '../../_components/AtelierGrid';

interface ArchiveClientProps {
  initialPosts: PostWithRelations[];
  initialTotal: number;
  initialPages: number;
  initialHasMore: boolean;
  filter: string;
  type?: string;
  category?: string;
  subcategory?: string;
  tag?: string;
  searchQuery: string;
  ads: Advertisement[];
  showFeatured: boolean;
  featuredPost: PostWithRelations | null;
}

/** شکل پاسخ API مسیر /api/archive */
interface ArchivePageResponse {
  data: PostWithRelations[];
  hasMore: boolean;
  total: number;
  pages: number;
}
const fetcher = async (url: string): Promise<ArchivePageResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`archive fetch failed: ${res.status}`);
  return res.json();
};

export function ArchiveClient({
  initialPosts,
  initialTotal,
  initialPages,
  initialHasMore,
  filter,
  type,
  category,
  subcategory,
  tag,
  searchQuery,
  ads,
  showFeatured,
  featuredPost,
}: ArchiveClientProps) {
  // getKey: pageIndex شروع از 0 → page=1, pageIndex=1 → page=2, ...
  // null key یعنی بیشتر لود نشه (به انتها رسیدیم)
  const getKey = useCallback(
    (pageIndex: number, previousPageData: ArchivePageResponse | null) => {
      // اگر صفحه قبلی hasMore=false بود، دیگر لود نکن
      if (previousPageData && previousPageData.hasMore === false) return null;

      const params = new URLSearchParams({
        page: String(pageIndex + 1), // pageIndex=0 → page=1
        filter,
        q: searchQuery,
      });

      if (type) params.set('type', type);
      if (category) params.set('category', category);
      if (subcategory) params.set('subcategory', subcategory);
      if (tag) params.set('tag', tag);

      return `/api/archive?${params.toString()}`;
    },
    [filter, searchQuery, type, category, subcategory, tag],
  );

  const { data, size, setSize } = useSWRInfinite(getKey, fetcher, {
    initialSize: 1,
    // 2026-08-08: fallbackData (SSR) کافی است — fetch مجدد page=1 در mount
    // یک درخواست ۳+ ثانیه‌ای اضافه به ازای هر بازدید بود (DB کویری کند).
    revalidateOnMount: false,
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 60 seconds - prevent duplicate requests
    // fallbackData برای page=1 (pageIndex=0) — از SSR می‌آید
    fallbackData: [
      {
        data: initialPosts,
        hasMore: initialHasMore,
        total: initialTotal,
        pages: initialPages,
      },
    ],
  });

  // isLoadingMore: pattern صحیح از SWR docs
  // وقتی size بزرگ‌تر از تعداد صفحات موجود در data است → داریم لود می‌کنیم
  const isLoadingMore = size > 0 && data !== undefined && typeof data[size - 1] === 'undefined';

  // آیا صفحه بیشتری وجود دارد؟
  const hasMore = data ? (data[data.length - 1]?.hasMore ?? false) : initialHasMore;

  // همه پست‌ها از همه صفحات لود شده
  const allPostsRaw = useMemo(() => (data ?? []).flatMap((page) => page?.data ?? []), [data]);

  // featured post را به اول اضافه کن (اگر لازم باشد)
  // استفاده از Set برای O(1) lookup به جای filter O(n)
  const allPosts = useMemo(() => {
    if (showFeatured && featuredPost) {
      const featuredId = featuredPost.id;
      const filtered = allPostsRaw.filter((p) => p.id !== featuredId);
      return [featuredPost, ...filtered];
    }
    return allPostsRaw;
  }, [showFeatured, featuredPost, allPostsRaw]);

  const handleLoadMore = () => {
    setSize(size + 1);
  };

  return (
    <>
      {allPosts.length > 0 ? (
        <div className="atl-result-meta">
          <span>
            نمایش <b>{allPosts.length.toLocaleString('fa-IR')}</b> از{' '}
            <b>{initialTotal.toLocaleString('fa-IR')}</b> مقاله
          </span>
          <span className="atl-result-meta__rule" aria-hidden />
        </div>
      ) : null}

      {allPosts.length > 0 ? <AtelierGrid posts={allPosts} ads={ads} /> : <Empty />}

      {/* Load More Button */}
      <LoadMoreButton onLoadMore={handleLoadMore} isLoading={isLoadingMore} hasMore={hasMore} />

      {/* پایان لیست */}
      {!hasMore && !isLoadingMore && allPosts.length > 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>همه مقالات نمایش داده شدند</p>
        </div>
      )}
    </>
  );
}
