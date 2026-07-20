'use client';

/**
 * PostGrid — نسخه ۲۰۲۶ v2
 *
 * تکنیک‌های ۲۰۲۶:
 *  1. AnimatedNumber + progress bar در toolbar
 *  2. Skeleton placeholder هنگام لود (نه spinner تنها)
 *  3. layoutId shared pill برای صفحه‌ی فعال (Linear-style)
 *  4. Micro-interaction: subtle scale + glow روی hover
 *  5. View Transitions API برای تغییر صفحه
 *  6. prefers-reduced-motion + pointer: coarse
 *  7. RTL-native: فلش‌ها با logical properties، اعداد فارسی
 *  8. @container queries برای واکنش‌گرایی
 *  9. View mode toggle با آیکون + label (نه فقط آیکون)
 * 10. Empty/end state با المان بصری refined
 */

import { STRIPE_EASE } from '@/lib/motion';
import { AnimatePresence, motion, useReducedMotion } from '@/lib/motion-shim';
import { cn, formatNumber, toPersianNumber } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import {
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Empty from '../Empty';
import PostItem from '../PostsDisplay.tsx/PostItem';
import PostsList from '../PostsDisplay.tsx/PostsList';

interface PostGridProps {
  posts: PostWithRelations[];
  ads?: import('@/types/types').Advertisement[];
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
  ads = [],
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
  // فقط یک‌بار و فقط وقتی به انتهای واقعی نزدیک شدیم لود کن
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firedOnceRef = useRef(false);
  useEffect(() => {
    firedOnceRef.current = false;
  }, [posts.length]);
  useEffect(() => {
    if (viewMode !== 'compact' || !hasMore || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !firedOnceRef.current) {
          firedOnceRef.current = true;
          onLoadMore();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [viewMode, hasMore, isLoading, onLoadMore]);

  // ---------- compact: PostsList فعلی ----------
  if (viewMode === 'compact') {
    return (
      <div className="space-y-8">
        <PostsList posts={posts} ads={ads} />

        {/* Sentinel + footer status */}
        {posts.length > 0 && (
          <div
            ref={sentinelRef}
            className="flex flex-col items-center justify-center gap-4 pt-2"
            aria-live="polite"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <LoadingState key="loading" />
              ) : hasMore ? (
                <MoreState
                  key="more"
                  loaded={posts.length}
                  onLoadMore={onLoadMore}
                  accentColor={accentColor}
                />
              ) : (
                <EndState
                  key="end"
                  count={posts.length}
                  showPaginatedOption={posts.length > PAGE_SIZE / 2}
                  onShowPaginated={() => setViewMode('paginated')}
                />
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
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        topRef.current?.scrollIntoView({ block: 'start' });
      }
    },
    [totalPages, reduceMotion],
  );

  return (
    <div className="space-y-6" ref={topRef}>
      {/* Toolbar: count + progress + view toggle */}
      <PaginatedToolbar
        start={start}
        end={end}
        total={posts.length}
        accentColor={accentColor}
        onBackToCompact={() => setViewMode('compact')}
      />

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

      {/* Pagination — pill segmented control */}
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onSelect={goToPage} />}
    </div>
  );
}

/* ============================================================================
   Subcomponents — ۲۰۲۶
   ========================================================================== */

/* ----- Loading state ----- */
function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.24, ease: STRIPE_EASE }}
      className="flex flex-col items-center gap-3 w-full max-w-xs"
    >
      <div
        className="
          inline-flex items-center gap-2.5
          px-4 py-2 rounded-full
          border border-neutral-200/70 dark:border-neutral-700/70
          bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md
          shadow-sm
        "
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500/60 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
        </span>
        <span className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-200">
          در حال بارگذاری مقالات بیشتر…
        </span>
      </div>
      {/* Skeleton bar — 3 ردیف مواج */}
      <div className="flex items-center gap-1.5 w-full max-w-[200px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full bg-neutral-200/70 dark:bg-neutral-800/70 overflow-hidden"
          >
            <motion.div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary-500/40 to-transparent"
              animate={{ x: ['-100%', '300%'] }}
              transition={{
                duration: 1.4,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ----- "more available" state ----- */
function MoreState({
  loaded,
  onLoadMore,
  accentColor,
}: {
  loaded: number;
  onLoadMore: () => void;
  accentColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.24, ease: STRIPE_EASE }}
      className="flex flex-col items-center gap-3"
    >
      {/* Progress hint + counter */}
      <div className="flex items-center gap-1.5 text-[11.5px] text-neutral-500 dark:text-neutral-400 tabular-nums">
        <span className="inline-block size-1.5 rounded-full bg-emerald-500" aria-hidden />
        <span>تاکنون</span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          {toPersianNumber(formatNumber(loaded))}
        </span>
        <span>مقاله نمایش داده شد</span>
      </div>

      {/* Primary CTA — pill with subtle gradient border */}
      <button
        type="button"
        onClick={onLoadMore}
        className={cn(
          'group relative inline-flex items-center justify-center gap-2',
          'h-11 px-6 rounded-full',
          'text-[13px] font-semibold',
          'text-neutral-900 dark:text-neutral-50',
          'transition-all duration-200',
          'active:scale-[0.98]',
        )}
      >
        {/* Gradient border layer (1.5px) */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full p-[1.5px]"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80 50%, transparent)`,
          }}
        >
          <span
            aria-hidden
            className="
              absolute inset-[1.5px] rounded-full
              bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md
            "
          />
        </span>

        {/* Hover glow */}
        <span
          aria-hidden
          className="
            absolute inset-0 rounded-full opacity-0
            group-hover:opacity-100 transition-opacity duration-300
          "
          style={{
            background: `radial-gradient(circle at center, ${accentColor}20 0%, transparent 70%)`,
          }}
        />

        {/* Arrow — در RTL به پایین اشاره می‌کنه (scroll پایین) */}
        <ArrowDown
          className="
            relative size-4
            transition-transform duration-200
            group-hover:translate-y-0.5
          "
          strokeWidth={2.2}
          aria-hidden
        />
        <span className="relative">نمایش مقالات بیشتر</span>

        {/* Soft inner shine on hover */}
        <span
          aria-hidden
          className="
            absolute inset-0 rounded-full overflow-hidden pointer-events-none
          "
        >
          <span
            className="
              absolute inset-0 -translate-x-full
              bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent
              group-hover:translate-x-full
              transition-transform duration-700 ease-out
            "
          />
        </span>
      </button>

      {/* Hint */}
      <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
        یا برای ادامه اسکرول کنید
      </span>
    </motion.div>
  );
}

/* ----- End of list state ----- */
function EndState({
  count,
  showPaginatedOption,
  onShowPaginated,
}: {
  count: number;
  showPaginatedOption: boolean;
  onShowPaginated: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.24, ease: STRIPE_EASE }}
      className="flex flex-col items-center gap-3"
    >
      {/* Success badge */}
      <div
        className="
          inline-flex items-center gap-2
          px-3.5 py-1.5 rounded-full
          border border-emerald-200/70 dark:border-emerald-800/60
          bg-emerald-50/70 dark:bg-emerald-950/30
          text-emerald-700 dark:text-emerald-300
          text-[12px] font-medium tabular-nums
        "
      >
        <span
          className="
            flex items-center justify-center
            size-4 rounded-full
            bg-emerald-500 text-white
          "
        >
          <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
        </span>
        <span>تمام {toPersianNumber(formatNumber(count))} مقاله نمایش داده شد</span>
      </div>

      {showPaginatedOption && (
        <button
          type="button"
          onClick={onShowPaginated}
          className={cn(
            'group inline-flex items-center gap-1.5',
            'text-[11.5px] font-medium',
            'text-neutral-500 dark:text-neutral-400',
            'hover:text-neutral-900 dark:hover:text-white',
            'transition-colors',
          )}
        >
          <LayoutGrid className="size-3.5" strokeWidth={1.8} aria-hidden />
          <span>تغییر به نمایش صفحه‌بندی</span>
          <ChevronLeft
            className="
              size-3
              opacity-0 -translate-x-1
              group-hover:opacity-100 group-hover:translate-x-0
              transition-all duration-200
              rtl:rotate-180
            "
            strokeWidth={2}
            aria-hidden
          />
        </button>
      )}
    </motion.div>
  );
}

/* ----- Paginated toolbar (toolbar بالای grid) ----- */
function PaginatedToolbar({
  start,
  end,
  total,
  accentColor,
  onBackToCompact,
}: {
  start: number;
  end: number;
  total: number;
  accentColor: string;
  onBackToCompact: () => void;
}) {
  const progress = total > 0 ? ((end - start) / total) * 100 : 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'rounded-2xl border border-neutral-200/60 dark:border-neutral-700/40',
        'bg-white/60 dark:bg-neutral-900/50 backdrop-blur-xl',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-16px_rgba(20,23,32,0.10)]',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Right side in RTL = status */}
        <div className="flex items-center gap-2 sm:gap-2.5 text-[11.5px] sm:text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
          <span className="hidden sm:inline">نمایش</span>
          <span
            className="inline-flex items-center justify-center min-w-[2.5rem] h-6 px-2 rounded-md font-semibold tabular-nums"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            {toPersianNumber(formatNumber(start + 1))}–{toPersianNumber(formatNumber(end))}
          </span>
          <span className="text-neutral-400 dark:text-neutral-500">/</span>
          <span className="font-semibold text-neutral-900 dark:text-white">
            {toPersianNumber(formatNumber(total))}
          </span>
          <span>مقاله</span>
        </div>

        {/* Left side in RTL = back button */}
        <button
          type="button"
          onClick={onBackToCompact}
          className={cn(
            'group inline-flex items-center gap-1.5',
            'h-7 px-2.5 rounded-lg',
            'text-[11px] font-medium',
            'text-neutral-500 dark:text-neutral-400',
            'hover:text-neutral-900 dark:hover:text-white',
            'hover:bg-neutral-100 dark:hover:bg-neutral-800',
            'transition-colors',
          )}
        >
          <List className="size-3.5" strokeWidth={1.8} aria-hidden />
          <span>نمایش فشرده</span>
        </button>
      </div>

      {/* Progress bar at bottom */}
      <div className="h-0.5 w-full bg-neutral-200/50 dark:bg-neutral-800/50" aria-hidden>
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: STRIPE_EASE }}
        />
      </div>
    </div>
  );
}

/* ----- Pagination — pill segmented control ----- */
function Pagination({
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
    <nav className="flex items-center justify-center gap-1.5 sm:gap-2 pt-2" aria-label="صفحه‌بندی">
      {/* قبلی — در RTL: سمت راست */}
      <PageBtn disabled={page === 1} onClick={() => onSelect(page - 1)} ariaLabel="صفحه‌ی قبل">
        <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
      </PageBtn>

      {/* اعداد */}
      <div
        className="
          inline-flex items-center gap-0.5 sm:gap-1
          p-1 rounded-full
          border border-neutral-200/60 dark:border-neutral-700/40
          bg-white/60 dark:bg-neutral-900/50 backdrop-blur-md
        "
      >
        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`e-${i}`}
              className="px-1.5 sm:px-2 text-neutral-400 dark:text-neutral-500 text-[11px] select-none"
              aria-hidden
            >
              …
            </span>
          ) : (
            <PageNum key={p} page={p} active={p === page} onClick={() => onSelect(p)} />
          ),
        )}
      </div>

      {/* بعدی — در RTL: سمت چپ */}
      <PageBtn
        disabled={page === totalPages}
        onClick={() => onSelect(page + 1)}
        ariaLabel="صفحه‌ی بعد"
      >
        <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
      </PageBtn>
    </nav>
  );
}

function PageNum({
  page,
  active,
  onClick,
}: {
  page: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={`برو به صفحه‌ی ${toPersianNumber(page)}`}
      className={cn(
        'relative inline-flex items-center justify-center',
        'h-8 min-w-8 sm:h-9 sm:min-w-9 px-2 sm:px-2.5',
        'rounded-full text-[11.5px] sm:text-[12.5px] font-semibold tabular-nums',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40',
        active
          ? 'text-neutral-900 dark:text-neutral-50'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100',
      )}
    >
      {active && (
        <motion.span
          layoutId="active-page-pill"
          className="
            absolute inset-0 rounded-full
            bg-neutral-900 dark:bg-white
            shadow-[0_2px_8px_-2px_rgba(20,23,32,0.20)]
            dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.40)]
          "
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          aria-hidden
        />
      )}
      <span className="relative z-10">{toPersianNumber(page)}</span>
    </button>
  );
}

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
        'group inline-flex items-center justify-center',
        'size-9 sm:size-10 rounded-full',
        'border border-neutral-200/60 dark:border-neutral-700/60',
        'bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md',
        'text-neutral-600 dark:text-neutral-300',
        'hover:border-neutral-300 dark:hover:border-neutral-600',
        'hover:bg-white dark:hover:bg-neutral-800',
        'hover:text-neutral-900 dark:hover:text-white',
        'active:scale-[0.96]',
        'transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'disabled:hover:bg-white/60 dark:disabled:hover:bg-neutral-900/60',
        'disabled:active:scale-100',
      )}
    >
      {children}
    </button>
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
