'use client';

/**
 * PulseBoard — بازطراحی «آخرین مقالات» (نسخه ۲۰۲۶ — immersive + scroll-driven)
 *
 * مفهوم:
 *  - Hero spotlight: ۱ پست ویژه (بزرگ) در سمت راست (RTL) با backdrop aurora
 *  - Stack راست: ۲ پست فشرده‌ی بالایی (compact، روی هم)
 *  - Side rail چپ: PulseRail از ۶ پست اخیر با timeline و connector
 *  - View modes: ۲ لایه (compact / expanded) با toggle
 *  - Filter chips با layoutId انیمیشنی (Linear.app style)
 *  - Scroll-reveal با stagger (IntersectionObserver)
 *  - درصد پیشرفت مطالعه (Progress bar) در حالت compact (اختیاری)
 *
 * تکنیک‌ها:
 *  1.  Bento Asymmetric layout (7/12 + 5/12) با responsive
 *  2.  View Transitions API برای تغییر tab (در صورت پشتیبانی)
 *  3.  Container queries برای scaling در سایزهای مختلف
 *  4.  Aurora background refined (از ModernTrending)
 *  5.  Live counter (animated) برای تعداد مقالات هر دسته
 *  6.  Reading-time pill با gradient accent
 *  7.  Sticky header با hairline border
 *  8.  RTL کامل + PersianDigits + Vazirmatn
 *  9.  prefers-reduced-motion + pointer: coarse
 * 10.  ARIA + keyboard navigation
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion, useInView } from '@/lib/motion-shim';
import {
  Sparkles,
  ArrowLeft,
  Newspaper,
  LayoutGrid,
  List as ListIcon,
  Radio,
} from 'lucide-react';
import type { PostWithRelations, Advertisement } from '@/types/types';
import type { MarketTickerItem } from '@/actions/marketTickerActions';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';
import { STRIPE_EASE, STRIPE_EASE_SOFT } from '@/lib/motion';
import { AuroraBackground } from '@/components/ModernTrending/effects/AuroraBackground';
import MarketTicker from '@/components/Sections/effects/MarketTicker';
import LiveClock from '@/components/Sections/effects/LiveClock';
import AnimatedNumber from '@/components/Sections/effects/AnimatedNumber';
import { getMarketTickerData } from '@/actions/marketTickerActions';
import { getCategoryAccent } from '@/components/Sections/effects/categoryAccent';
import { getLatestPosts } from '@/actions/getLatestPosts';
import { PulseCard } from './PulseCard';
import { PulseRail } from './PulseRail';
import { AdSlot } from './AdSlot';

type ViewMode = 'bento' | 'rail';

interface CategoryItem {
  name: string;
  slug: string;
}

interface PulseBoardProps {
  /** لیست مقالات (همه‌ی دسته‌ها) — حداقل ۸ عدد نیاز داریم برای ۱ hero + ۲ compact + ۵ rail */
  posts: PostWithRelations[];
  categories: CategoryItem[];
  initialAds: Advertisement[];
  initialTickerData?: MarketTickerItem[];
  totalCount: number;
}

const MAX_VISIBLE_FILTERS = 6;

function normFa(s: string): string {
  return s.replace(/\s+/g, '').replace(/[‌]/g, '').toLowerCase();
}

function dedupeCategories(input: CategoryItem[]): CategoryItem[] {
  const seen = new Set<string>();
  const out: CategoryItem[] = [];
  for (const item of input) {
    const name = item.name?.trim();
    if (!name) continue;
    const key = normFa(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function PulseBoard({
  posts,
  categories,
  initialAds,
  initialTickerData = [],
  totalCount,
}: PulseBoardProps) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(containerRef, { once: true, margin: '-80px' });

  // ----- Filter state -----
  const categoriesList = useMemo(() => {
    return dedupeCategories(categories);
  }, [categories]);

  const [activeCategory, setActiveCategory] = useState<string>('همه');
  const [viewMode, setViewMode] = useState<ViewMode>('bento');

  // ----- Category Posts and Pagination State -----
  const [categoryPosts, setCategoryPosts] = useState<Record<string, PostWithRelations[]>>(() => ({
    'همه': posts,
  }));
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    'همه': 9,
  });
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({
    'همه': true,
  });
  const [loading, setLoading] = useState(false);

  // Sync initial posts from props if they change
  useEffect(() => {
    setCategoryPosts((prev) => ({
      ...prev,
      'همه': posts,
    }));
    setVisibleCounts((prev) => ({
      ...prev,
      'همه': 9,
    }));
    setHasMoreMap((prev) => ({
      ...prev,
      'همه': true,
    }));
  }, [posts]);

  // Initialize category posts from local memory when category changes
  useEffect(() => {
    if (activeCategory !== 'همه' && !categoryPosts[activeCategory]) {
      const inMemory = posts.filter((p) =>
        p.categories?.some((c) => normFa(c.name) === normFa(activeCategory))
      );
      setCategoryPosts((prev) => ({
        ...prev,
        [activeCategory]: inMemory,
      }));
      setVisibleCounts((prev) => ({
        ...prev,
        [activeCategory]: 9,
      }));
      setHasMoreMap((prev) => ({
        ...prev,
        [activeCategory]: true,
      }));
    }
  }, [activeCategory, categoryPosts, posts]);

  const handleLoadMore = async () => {
    if (loading) return;

    const currentList = categoryPosts[activeCategory] || [];
    const currentLimit = visibleCounts[activeCategory] ?? 9;

    if (currentList.length > currentLimit) {
      setVisibleCounts((prev) => ({
        ...prev,
        [activeCategory]: currentLimit + 6,
      }));
      return;
    }

    setLoading(true);
    try {
      const nextPosts = await getLatestPosts({
        count: 12,
        skip: currentList.length,
        category: activeCategory === 'همه' ? undefined : activeCategory,
      });

      const uniqueNext = nextPosts.filter((np) => !currentList.some((cl) => cl.id === np.id));
      const newList = [...currentList, ...uniqueNext];

      setCategoryPosts((prev) => ({
        ...prev,
        [activeCategory]: newList,
      }));
      setVisibleCounts((prev) => ({
        ...prev,
        [activeCategory]: currentLimit + 6,
      }));
      setHasMoreMap((prev) => ({
        ...prev,
        [activeCategory]: nextPosts.length === 12,
      }));
    } catch (err) {
      console.error('[PulseBoard] loadMore error:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentCategoryPosts = useMemo(() => {
    if (categoryPosts[activeCategory]) {
      return categoryPosts[activeCategory];
    }
    return posts.filter((p) =>
      p.categories?.some((c) => normFa(c.name) === normFa(activeCategory))
    );
  }, [categoryPosts, activeCategory, posts]);

  const activeCategoryObj = useMemo(() => {
    return categoriesList.find((c) => c.name === activeCategory);
  }, [categoriesList, activeCategory]);

  const categorySlug = activeCategoryObj?.slug || '';

  const accent = getCategoryAccent(activeCategory);
  const currentLimit = visibleCounts[activeCategory] ?? 9;
  const hero = currentCategoryPosts[0];
  const stack = currentCategoryPosts.slice(1, 3);
  const rail = currentCategoryPosts.slice(3, currentLimit);

  const visibleFilters = categoriesList.slice(0, MAX_VISIBLE_FILTERS);
  const overflowFilters = categoriesList.slice(MAX_VISIBLE_FILTERS);

  // ----- View Transition (اگه مرورگر پشتیبانی کنه) -----
  const supportsViewTransition = useMemo(() => {
    if (typeof document === 'undefined') return false;
    return 'startViewTransition' in document;
  }, []);

  const handleCategoryChange = (next: string) => {
    if (next === activeCategory) return;
    if (supportsViewTransition) {
      // startViewTransition experimental — type may not be in lib.dom yet
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => unknown;
      };
      if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => {
          setActiveCategory(next);
        });
        return;
      }
    }
    setActiveCategory(next);
  };

  return (
    <section
      ref={containerRef}
      dir="rtl"
      // marquee-pause: hover روی هر نقطه‌ی section باعث توقف
      // MarketTicker (که داخلش Marquee داره) می‌شه
      className="relative isolate marquee-pause"
      aria-label="آخرین مقالات"
    >
      {/* ============================================================== */}
      {/*  Live Market Ticker (top, full width)                          */}
      {/* ============================================================== */}
      {initialTickerData.length > 0 && (
        <MarketTicker
          initialData={initialTickerData}
          refetchAction={getMarketTickerData}
          pollInterval={60_000}
          className="mb-3 sm:mb-4"
        />
      )}

      {/* ============================================================== */}
      {/*  Main panel — Aurora + Glass                                   */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={headerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: STRIPE_EASE }}
        className={cn(
          'relative overflow-hidden rounded-3xl',
          'border border-neutral-200/70 dark:border-neutral-800/80',
          'bg-white/75 dark:bg-neutral-900/70 backdrop-blur-xl',
          'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_24px_48px_-24px_rgba(20,23,32,0.12)]',
          'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_24px_48px_-24px_rgba(0,0,0,0.4)]',
        )}
        style={{
          boxShadow: `0 1px 0 0 rgba(255,255,255,0.6) inset, 0 24px 48px -24px ${accent.color}1a`,
        }}
      >
        {/* Aurora background */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
          <AuroraBackground
            intensity={0.5}
            duration={42}
            accentA={`${accent.color}26`}
            accentB={`${accent.color}1a`}
          />
        </div>

        {/* Hairline top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--hairline) 12%, var(--hairline) 88%, transparent)',
          }}
          aria-hidden
        />

        {/* ================================================================== */}
        {/*  Header — Sticky inside panel                                       */}
        {/* ================================================================== */}
        <header className="relative px-4 sm:px-7 lg:px-10 pt-4 sm:pt-5 pb-3 sm:pb-4">
          <div className="flex flex-col gap-3">
            {/* Top row: icon + title + clock + view toggle */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Animated icon */}
              <motion.div
                className="relative shrink-0"
                animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div
                  className="absolute inset-0 -m-1 rounded-2xl blur-xl transition-colors duration-700"
                  style={{
                    background: `linear-gradient(135deg, ${accent.color}33, ${accent.color}14)`,
                  }}
                  aria-hidden
                />
                <div
                  className={cn(
                    'relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center',
                    'rounded-2xl',
                    'bg-gradient-to-br from-white to-neutral-100 dark:from-neutral-800 dark:to-neutral-850',
                    'border border-neutral-200/80 dark:border-neutral-700/60',
                    'shadow-sm',
                    'transition-colors duration-700',
                  )}
                >
                  <Newspaper
                    className="h-4.5 w-4.5 sm:h-5 sm:w-5 transition-colors duration-700"
                    style={{ color: accent.color }}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span
                    className="pointer-events-none absolute -end-1 -top-1 inline-flex h-3 w-3 items-center justify-center"
                    aria-hidden
                  >
                    <span
                      className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ backgroundColor: accent.color }}
                    />
                    <span
                      className="relative inline-flex h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: accent.color }}
                    />
                  </span>
                </div>
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white text-balance">
                    آخرین مقالات
                  </h2>
                  <Sparkles
                    className="hidden sm:block h-4 w-4 text-amber-500/80"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </div>
                <p className="mt-0.5 text-[11.5px] sm:text-[12.5px] text-neutral-500 dark:text-neutral-400 font-vazirmatn">
                  تازه‌ترین تحلیل‌ها و گزارش‌های بازارهای مالی
                </p>
              </div>

              {/* View mode toggle — desktop */}
              <div
                className={cn(
                  'hidden sm:inline-flex items-center gap-0.5 p-1',
                  'rounded-xl',
                  'border border-neutral-200/70 dark:border-neutral-700/60',
                  'bg-white/70 dark:bg-neutral-800/50 backdrop-blur-md',
                )}
                role="tablist"
                aria-label="حالت نمایش"
              >
                {(
                  [
                    // «شاخصی» = چیدمان موزائیکی/کاشی‌مانند — جایگزین فارسی برای «بنتو»
                    { v: 'bento' as ViewMode, label: 'شاخصی', Icon: LayoutGrid },
                    { v: 'rail' as ViewMode, label: 'فهرست', Icon: ListIcon },
                  ] as const
                ).map(({ v, label, Icon }) => {
                  const active = viewMode === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setViewMode(v)}
                      className={cn(
                        'relative inline-flex items-center gap-1.5 px-3 py-1.5',
                        'text-[11.5px] font-medium rounded-lg',
                        'transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                        'cursor-pointer',
                        active
                          ? 'text-neutral-900 dark:text-white'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="view-mode-pill"
                          className="absolute inset-0 rounded-lg bg-white dark:bg-neutral-700 shadow-sm"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          aria-hidden
                        />
                      )}
                      <Icon className="relative h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                      <span className="relative">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Live clock — desktop */}
              <div
                className={cn(
                  'hidden lg:inline-flex items-center gap-1.5 shrink-0',
                  'h-9 px-3.5 rounded-full',
                  'border border-neutral-200/80 dark:border-neutral-700/60',
                  'bg-white/70 dark:bg-neutral-800/60 backdrop-blur-md',
                  'text-[11px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300',
                )}
              >
                <LiveClock showIcon={false} showSeconds />
                <span className="text-neutral-400 dark:text-neutral-500">·</span>
                <span className="text-neutral-500 dark:text-neutral-400">تهران</span>
              </div>
            </div>

            {/* Filter row: chips + count */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div
                className={cn(
                  'inline-flex items-center gap-1 p-1',
                  'rounded-2xl',
                  'bg-neutral-100/80 dark:bg-neutral-800/60',
                  'border border-neutral-200/60 dark:border-neutral-700/40',
                  'backdrop-blur-md',
                  'max-w-full overflow-x-auto scrollbar-none',
                )}
                role="tablist"
                aria-label="فیلتر دسته‌بندی"
              >
                {visibleFilters.map((category) => {
                  const isActive = activeCategory === category.name;
                  const tabAccent = getCategoryAccent(category.name);
                  return (
                    <button
                      key={category.name}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleCategoryChange(category.name)}
                      className={cn(
                        'relative flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2',
                        'text-[12px] sm:text-[13px] font-medium rounded-xl whitespace-nowrap',
                        'transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                        'cursor-pointer',
                        isActive
                          ? 'text-neutral-900 dark:text-white'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200',
                      )}
                      style={isActive ? { color: tabAccent.color } : undefined}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="pulse-filter-pill"
                          className={cn(
                            'absolute inset-0 -z-0 rounded-xl',
                            'bg-white dark:bg-neutral-700',
                            'shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(20,23,32,0.10)]',
                            'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_4px_12px_-4px_rgba(0,0,0,0.3)]',
                          )}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          aria-hidden
                        />
                      )}
                      {isActive && (
                        <span
                          className="relative z-10 inline-block h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: tabAccent.color,
                            boxShadow: `0 0 8px ${tabAccent.color}`,
                          }}
                          aria-hidden
                        />
                      )}
                      <span className="relative z-10">{category.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Counter + Archive CTA inline */}
              <div className="inline-flex items-center gap-1.5 text-[10.5px] sm:text-[11.5px] text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums">
                <Radio className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                <span>پخش زنده‌ی</span>
                <span
                  className="inline-flex items-center justify-center min-w-[1.5rem] h-5 sm:h-6 px-1.5 sm:px-2 rounded-md font-semibold"
                  style={{
                    backgroundColor: `${accent.color}1a`,
                    color: accent.color,
                  }}
                >
                  <AnimatedNumber value={totalCount} suffix=" مقاله" />
                </span>
                <span className="text-neutral-300 dark:text-neutral-600 mx-1">·</span>
                <span>
                  نمایش{' '}
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {toPersianNumber(formatNumber(currentCategoryPosts.length))}
                  </span>{' '}
                  مقاله
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ================================================================== */}
        {/*  Content — Bento / Rail                                            */}
        {/* ================================================================== */}
        <div className="relative px-4 sm:px-7 lg:px-10 pb-5 sm:pb-8 pt-2 sm:pt-3">
          <AnimatePresence mode="wait">
            {currentCategoryPosts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center text-neutral-500 dark:text-neutral-400"
              >
                <Newspaper className="mx-auto h-10 w-10 opacity-40" aria-hidden />
                <p className="mt-3 text-sm font-medium">در این دسته فعلاً مقاله‌ای منتشر نشده</p>
              </motion.div>
            ) : viewMode === 'bento' ? (
              <motion.div
                key={`bento-${activeCategory}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.35, ease: STRIPE_EASE_SOFT } }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6"
              >
                {/* ============ Hero (right column on RTL) ============ */}
                {hero && (
                  <div className="lg:col-span-7 xl:col-span-8 min-w-0">
                    <PulseCard post={hero} size="lg" accentColor={accent.color} />
                  </div>
                )}

                {/* ============ Stack (left column) ============ */}
                <div className="lg:col-span-5 xl:col-span-4 min-w-0 flex flex-col gap-4 sm:gap-5 lg:gap-6">
                  {stack.map((p) => (
                    <PulseCard
                      key={p.id}
                      post={p}
                      size="default"
                      accentColor={
                        p.categories?.[0]
                          ? getCategoryAccent(p.categories[0].name).color
                          : accent.color
                      }
                    />
                  ))}
                </div>

                {/* ============ Rail row (full width) ============ */}
                {rail.length > 0 && (
                  <div className="lg:col-span-12 min-w-0">
                    <div
                      className={cn(
                        'grid grid-cols-1 md:grid-cols-2',
                        'gap-x-6 gap-y-0',
                        'rounded-2xl sm:rounded-3xl',
                        'border border-neutral-200/60 dark:border-neutral-800/70',
                        'bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md',
                        'p-3 sm:p-5',
                      )}
                    >
                      <PulseRail posts={rail.slice(0, Math.ceil(rail.length / 2))} />
                      <PulseRail
                        posts={rail.slice(Math.ceil(rail.length / 2))}
                        className="hidden md:block"
                      />
                    </div>
                  </div>
                )}

                {/* ============ Ad slot (inline) ============ */}
                {initialAds[0] && (
                  <div className="lg:col-span-12 min-w-0">
                    <AdSlot ad={initialAds[0]} accentColor={accent.color} />
                  </div>
                )}
              </motion.div>
            ) : (
              // rail — full-width list
              <motion.div
                key={`rail-${activeCategory}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.35, ease: STRIPE_EASE_SOFT } }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0"
              >
                {(() => {
                  const visiblePostsForRail = currentCategoryPosts.slice(0, currentLimit);
                  return (
                    <>
                      <PulseRail posts={visiblePostsForRail.slice(0, Math.ceil(visiblePostsForRail.length / 2))} />
                      <PulseRail
                        posts={visiblePostsForRail.slice(Math.ceil(visiblePostsForRail.length / 2))}
                        className="hidden md:block"
                      />
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section Footer: Load More + View Archive */}
          <div className="mt-8 flex flex-row items-center justify-center gap-3 sm:gap-4 border-t border-neutral-200/40 dark:border-neutral-800/40 pt-6">
            {(currentCategoryPosts.length > currentLimit || hasMoreMap[activeCategory] !== false) && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleLoadMore()}
                className={cn(
                  'relative flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full',
                  'text-[12px] sm:text-[14px] font-bold text-white',
                  'transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  'active:scale-95 hover:brightness-110 active:brightness-95',
                )}
                style={{
                  backgroundColor: accent.color,
                  boxShadow: `0 4px 14px -4px ${accent.color}80`,
                }}
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                <span>بارگذاری بیشتر</span>
              </button>
            )}

            <Link
              href={
                activeCategory === 'همه'
                  ? '/archive'
                  : `/archive/category/${categorySlug}`
              }
              className={cn(
                'group/all flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5',
                'px-4 sm:px-6 py-2.5 sm:py-3 rounded-full border border-neutral-200/80 dark:border-neutral-700/60',
                'text-[12px] sm:text-[14px] font-semibold text-neutral-800 dark:text-neutral-200',
                'bg-white/50 dark:bg-neutral-800/40 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-850',
                'transition-all duration-300 hover:gap-2.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
              )}
            >
              <span>مشاهده آرشیو کامل</span>
              <ArrowLeft
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover/all:-translate-x-1 rtl:rotate-180"
                strokeWidth={2.5}
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default PulseBoard;
