'use client';

/**
 * PostGrid — نسخه ۲۰۲۶ (مقیاس‌پذیر)
 *
 * سه استراتژی برای ۱۰۰+ پست:
 *  1. compact (پیش‌فرض) — PostsList با hero + 2 mini + masonry + infinite scroll
 *     - IntersectionObserver با rootMargin=600px: قبل از رسیدن به آخر، لود می‌کنه
 *     - وقتی همه لود شدن، دکمه‌ی «نمایش صفحه‌بندی» ظاهر می‌شه
 *  2. paginated — grid 3col با ۲۴ پست در صفحه
 *     - کاربرد: وقتی کاربر می‌خواد سریع بین صفحات جابجا بشه
 *     - scroll-to-top هوشمند هنگام تغییر صفحه
 *  3. (reserved برای بعد) virtualized — برای ۱۰۰۰+ پست
 *
 * ویژگی‌ها:
 *  - prefers-reduced-motion respected
 *  - RTL کامل (شماره‌ی صفحه با toPersianNumber)
 *  - toolbar با شمارنده‌ی زنده + دکمه‌ی «بازگشت به نمایش فعلی»
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from '@/lib/motion-shim';
import { ChevronRight, ChevronLeft, Loader2, LayoutGrid, List } from 'lucide-react';
import type { PostWithRelations } from '@/types/types';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';
import { STRIPE_EASE } from '@/lib/motion';
import PostsList from '../PostsDisplay.tsx/PostsList';
import PostItem from '../PostsDisplay.tsx/PostItem';
import Empty from '../Empty';

interface PostGridProps {
  posts: PostWithRelations[];
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  /** رنگ accent دسته‌ی فعال */
  accentColor: string;
}

const PAGE_SIZE = 24;
const VIEW_MODES = ['compact', 'paginated'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

export default function PostGrid({
  posts,
  onLoadMore,
  isLoading,
  hasMore,
  accentColor,
}: PostGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [page, setPage] = useState(1);
  const reduceMotion = useReducedMotion();

  // وقتی posts عوض می‌شن (تغییر دسته)، برگرد صفحه ۱
  useEffect(() => {
    setPage(1);
  }, [posts]);

  // ---------- Infinite scroll با IntersectionObserver ----------
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (viewMode !== 'compact' || !hasMore || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) onLoadMore();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [viewMode, hasMore, isLoading, onLoadMore]);

  // ---------- compact: PostsList فعلی ----------
  if (viewMode === 'compact') {
    return (
      <div className="space-y-8">
        <PostsList posts={posts} />

        {/* Sentinel + footer status */}
        {posts.length > 0 && (
          <div
            ref={sentinelRef}
            className="flex flex-col items-center justify-center gap-3 pt-2"
            aria-live="polite"
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400"
                >
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>در حال بارگذاری مقالات بیشتر…</span>
                </motion.div>
              ) : hasMore ? (
                <motion.div
                  key="more"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="text-[12px] text-neutral-400 dark:text-neutral-500">
                    برای دیدن ادامه اسکرول کنید
                  </span>
                  <button
                    type="button"
                    onClick={onLoadMore}
                    className={cn(
                      'text-[12px] underline underline-offset-4 decoration-dotted',
                      'text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400',
                      'transition-colors',
                    )}
                  >
                    یا همین الان بارگذاری کن
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <span className="text-[12px] text-neutral-400 dark:text-neutral-500">
                    تمام {toPersianNumber(formatNumber(posts.length))} مقاله نمایش داده شد
                  </span>
                  {posts.length > PAGE_SIZE / 2 && (
                    <button
                      type="button"
                      onClick={() => setViewMode('paginated')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full',
                        'text-[12px] font-medium',
                        'border border-neutral-200/70 dark:border-neutral-700/70',
                        'bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md',
                        'hover:border-neutral-300 dark:hover:border-neutral-600',
                        'transition-colors',
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                      نمایش صفحه‌بندی‌شده
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  // ---------- paginated: grid 3col با page size 24 ----------
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, posts.length);
  const pageItems = posts.slice(start, end);

  // Scroll to grid top هنگام تغییر صفحه
  const topRef = useRef<HTMLDivElement>(null);
  const goToPage = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setPage(newPage);
      if (!reduceMotion) {
        // Smooth scroll to grid top
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        topRef.current?.scrollIntoView({ block: 'start' });
      }
    },
    [totalPages, reduceMotion],
  );

  return (
    <div className="space-y-6" ref={topRef}>
      {/* Toolbar: count + view toggle + page indicator */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2.5 sm:gap-3',
          'rounded-2xl border border-neutral-200/60 dark:border-neutral-700/40',
          'bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md',
          'px-3 py-2 sm:px-4 sm:py-2.5',
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-neutral-600 dark:text-neutral-400 font-vazirmatn tabular-nums">
          <span>نمایش</span>
          <span
            className="inline-flex items-center justify-center min-w-[2rem] sm:min-w-[2.25rem] h-5 sm:h-6 px-1.5 sm:px-2 rounded-md font-semibold"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            {toPersianNumber(formatNumber(start + 1))}–{toPersianNumber(formatNumber(end))}
          </span>
          <span>از</span>
          <span className="font-semibold text-neutral-900 dark:text-white">
            {toPersianNumber(formatNumber(posts.length))}
          </span>
          <span>مقاله</span>
        </div>

        <button
          type="button"
          onClick={() => setViewMode('compact')}
          className={cn(
            'inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md',
            'text-[10.5px] sm:text-[11px] font-medium',
            'text-neutral-500 dark:text-neutral-400',
            'hover:text-neutral-900 dark:hover:text-white',
            'hover:bg-neutral-100 dark:hover:bg-neutral-800',
            'transition-colors',
          )}
        >
          <List className="h-3.5 w-3.5" aria-hidden />
          بازگشت به نمایش فعلی
        </button>
      </div>

      {/* Page items */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: STRIPE_EASE } }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6"
        >
          {pageItems.map((post) => (
            <PostItem key={post.id} post={post} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-2 pt-4"
          aria-label="صفحه‌بندی"
        >
          <PageBtn
            disabled={page === 1}
            onClick={() => goToPage(page - 1)}
            ariaLabel="صفحه قبل"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </PageBtn>

          <PaginationNumbers
            page={page}
            totalPages={totalPages}
            onSelect={goToPage}
          />

          <PageBtn
            disabled={page === totalPages}
            onClick={() => goToPage(page + 1)}
            ariaLabel="صفحه بعد"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </PageBtn>
        </nav>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

function PageBtn({
  children,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg',
        'border border-neutral-200/60 dark:border-neutral-700/60',
        'bg-white/60 dark:bg-neutral-900/60',
        'hover:border-neutral-300 dark:hover:border-neutral-600',
        'hover:bg-white dark:hover:bg-neutral-800',
        'transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/60',
      )}
    >
      {children}
    </button>
  );
}

function PaginationNumbers({
  page,
  totalPages,
  onSelect,
}: {
  page: number;
  totalPages: number;
  onSelect: (p: number) => void;
}) {
  const pages = useMemo(() => buildPageList(page, totalPages), [page, totalPages]);
  return (
    <div className="flex items-center gap-1">
      {pages.map((p, i) =>
        p === '…' ? (
          <span
            key={`e-${i}`}
            className="px-2 text-neutral-400 dark:text-neutral-500"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 min-w-8 sm:h-9 sm:min-w-9 px-2 sm:px-2.5 items-center justify-center rounded-lg',
            'text-[11px] sm:text-[12px] font-semibold tabular-nums',
              'transition-colors',
              p === page
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800',
            )}
          >
            {toPersianNumber(p)}
          </button>
        ),
      )}
    </div>
  );
}

/** لیست صفحات با ellipsis: [1, 2, 3, …, 10] */
function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [];
  pages.push(1);
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}
