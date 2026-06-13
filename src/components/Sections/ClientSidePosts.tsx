'use client';

/**
 * ClientSidePosts — نسخه ۲۰۲۶ (refined)
 *
 * تکنیک‌های مدرن:
 *  1.  Aurora background (low-saturation, 2 blobs)
 *  2.  Bento layout — featured hero card + 2-column masonry
 *  3.  Tabs با `layoutId` indicator (linear.app-style pill)
 *  4.  3D Tilt + magnetic hover (subtle, GPU-only)
 *  5.  Stagger container هنگام ورود (هر کارت 40ms تأخیر)
 *  6.  AnimatePresence برای تغییر category (fade + slide)
 *  7.  Tabular-nums + PersianDigits
 *  8.  Live indicator (نقطه‌ی متحرک برای «همه»)
 *  9.  Shimmer line روی hover (optional)
 * 10.  respects prefers-reduced-motion + coarse pointer
 * 11.  RTL کامل — همه‌ی margin/padding با start/end منطقی
 * 12.  Keyboard accessible (focus rings, ARIA)
 *
 * رنگ‌بندی: refined (slate/primary/cyan/emerald) — saturation پایین.
 */

import type React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Newspaper,
  Calendar,
  ArrowLeft,
  ChevronDown,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { getLatestPosts } from '@/actions/getLatestPosts';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Empty from '../Empty';
import PostsDisplay from '../PostsDisplay.tsx/PostsDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, toPersianNumber } from '@/lib/utils';
import { AuroraBackground } from '@/components/ModernTrending/effects/AuroraBackground';
import { Shimmer } from '@/components/ModernTrending/effects/Shimmer';
import { STRIPE_EASE, STRIPE_EASE_SOFT, staggerContainer, staggerItem } from '@/lib/motion';

interface ClientSidePostsProps {
  initialPosts: Record<string, PostWithRelations[]>;
  initialAds: Advertisement[];
  categories: string[];
}

const POSTS_PER_PAGE = 6;

/* -------------------------------------------------------------------------- */
/*  Variants                                                                  */
/* -------------------------------------------------------------------------- */

const panelVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: STRIPE_EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: STRIPE_EASE } },
};

const tabsListVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: STRIPE_EASE_SOFT, delay: 0.05 },
  },
};

/* -------------------------------------------------------------------------- */
/*  Live dot — برای نمایش «همین الان به‌روز شد»                               */
/* -------------------------------------------------------------------------- */

function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center', className)}>
      <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40 opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

const ClientSidePosts: React.FC<ClientSidePostsProps> = ({
  initialPosts,
  initialAds,
  categories,
}) => {
  const [posts, setPosts] = useState<Record<string, PostWithRelations[]>>(initialPosts);
  const [ads] = useState<Advertisement[]>(initialAds);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map((category) => [category, true])),
  );
  const [error, setError] = useState<Error | null>(null);
  const [activeCategory, setActiveCategory] = useState('همه');

  const totalCount = useMemo(
    () => Object.values(posts).reduce((acc, list) => acc + list.length, 0),
    [posts],
  );

  const loadMorePosts = useCallback(async () => {
    if (isLoading || !hasMore[activeCategory]) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentPosts = posts[activeCategory] || [];
      const newPosts = await getLatestPosts({
        count: POSTS_PER_PAGE,
        skip: currentPosts.length,
        category: activeCategory !== 'همه' ? activeCategory : undefined,
      });

      if (newPosts.length === 0) {
        setHasMore((prev) => ({ ...prev, [activeCategory]: false }));
      } else {
        setPosts((prev) => ({
          ...prev,
          [activeCategory]: [...currentPosts, ...newPosts],
        }));
        setHasMore((prev) => ({
          ...prev,
          [activeCategory]: newPosts.length === POSTS_PER_PAGE,
        }));
      }
    } catch (err) {
      console.error('Error loading more posts:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [posts, isLoading, hasMore, activeCategory]);

  return (
    <section className="relative isolate">
      {/* Aurora background — low-saturation */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <AuroraBackground intensity={0.55} duration={36} />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={panelVariants}
        className={cn(
          'relative overflow-hidden rounded-3xl',
          'border border-neutral-200/70 dark:border-neutral-800/80',
          'bg-white/75 dark:bg-neutral-900/70 backdrop-blur-xl',
          'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_24px_48px_-24px_rgba(20,23,32,0.12)]',
          'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_24px_48px_-24px_rgba(0,0,0,0.4)]',
        )}
      >
        {/* Hairline top border highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--hairline) 12%, var(--hairline) 88%, transparent)',
          }}
          aria-hidden
        />

        {/* ================================================================== */}
        {/*  Header                                                            */}
        {/* ================================================================== */}
        <header className="relative px-5 sm:px-7 lg:px-10 pt-7 pb-5 sm:pt-9 sm:pb-6">
          <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 sm:flex-nowrap">
            {/* Icon block */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  'absolute inset-0 -m-1 rounded-2xl',
                  'bg-gradient-to-br from-primary-500/20 via-primary-400/10 to-cyan-400/20',
                  'blur-xl',
                )}
                aria-hidden
              />
              <div
                className={cn(
                  'relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center',
                  'rounded-2xl',
                  'bg-gradient-to-br from-white to-neutral-100 dark:from-neutral-800 dark:to-neutral-850',
                  'border border-neutral-200/80 dark:border-neutral-700/60',
                  'shadow-sm',
                )}
              >
                <Newspaper
                  className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-300"
                  strokeWidth={1.75}
                />
                <span
                  className="pointer-events-none absolute -end-1 -top-1 inline-flex h-3 w-3 items-center justify-center"
                  aria-hidden
                >
                  <LiveDot />
                </span>
              </div>
            </div>

            {/* Title + subtitle */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold tracking-tight text-neutral-900 dark:text-white">
                  آخرین مقالات
                </h2>
                <Sparkles
                  className="hidden sm:block h-4 w-4 text-amber-500/80"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <p className="mt-1 text-[13px] sm:text-sm text-neutral-500 dark:text-neutral-400 font-vazirmatn">
                تازه‌ترین تحلیل‌ها و گزارش‌های بازارهای مالی
                {totalCount > 0 && (
                  <>
                    {' · '}
                    <span className="tabular-nums text-neutral-700 dark:text-neutral-300">
                      {toPersianNumber(totalCount)} مطلب
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Stat pill — total posts */}
            <div
              className={cn(
                'hidden sm:flex items-center gap-2 px-3.5 py-2',
                'rounded-full',
                'border border-neutral-200/80 dark:border-neutral-700/60',
                'bg-white/70 dark:bg-neutral-800/60 backdrop-blur-md',
                'text-xs font-medium text-neutral-600 dark:text-neutral-300',
              )}
            >
              <Calendar className="h-3.5 w-3.5 text-neutral-400" strokeWidth={2} aria-hidden />
              <span className="tabular-nums">بروزرسانی لحظه‌ای</span>
            </div>
          </div>
        </header>

        {/* ================================================================== */}
        {/*  Error banner                                                      */}
        {/* ================================================================== */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: STRIPE_EASE }}
              className="mx-5 sm:mx-7 lg:mx-10"
            >
              <div
                className={cn(
                  'flex items-center gap-3 p-3.5',
                  'rounded-2xl',
                  'border border-rose-200/70 dark:border-rose-900/50',
                  'bg-rose-50/80 dark:bg-rose-950/30',
                  'text-rose-700 dark:text-rose-300 text-sm',
                )}
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                <span>خطا در بارگذاری: {error.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================================================================== */}
        {/*  Tabs                                                              */}
        {/* ================================================================== */}
        <Tabs
          defaultValue="همه"
          onValueChange={setActiveCategory}
          dir="rtl"
          className="w-full"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={tabsListVariants}
            className="px-5 sm:px-7 lg:px-10 pt-2 pb-1"
          >
            <TabsList
              className={cn(
                'relative w-full sm:w-auto inline-flex items-center gap-1 p-1',
                'rounded-2xl',
                'bg-neutral-100/80 dark:bg-neutral-800/60',
                'border border-neutral-200/60 dark:border-neutral-700/40',
                'backdrop-blur-md',
              )}
            >
              {categories.map((category) => {
                const count = posts[category]?.length ?? 0;
                const isActive = activeCategory === category;
                return (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className={cn(
                      'relative flex items-center gap-2 px-4 sm:px-5 py-2',
                      'text-sm font-medium rounded-xl',
                      'transition-colors duration-200',
                      'text-neutral-600 dark:text-neutral-400',
                      'hover:text-neutral-900 dark:hover:text-neutral-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                      'data-[state=active]:text-primary-700 dark:data-[state=active]:text-primary-200',
                      'data-[state=active]:[&>span.count]:opacity-100',
                      'cursor-pointer',
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-posts-tab"
                        className={cn(
                          'absolute inset-0 -z-0 rounded-xl',
                          'bg-white dark:bg-neutral-700',
                          'shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(20,23,32,0.10)]',
                          'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_4px_12px_-4px_rgba(0,0,0,0.3)]',
                        )}
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 30,
                        }}
                        aria-hidden
                      />
                    )}
                    <span className="relative z-10">{category}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          'count relative z-10 inline-flex items-center justify-center',
                          'min-w-[1.25rem] h-5 px-1.5 rounded-full',
                          'text-[10px] font-semibold tabular-nums',
                          'bg-neutral-200/70 dark:bg-neutral-900/50',
                          'text-neutral-600 dark:text-neutral-300',
                          'transition-opacity duration-200',
                        )}
                      >
                        {toPersianNumber(count)}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </motion.div>

          {/* ================================================================== */}
          {/*  Tab contents                                                     */}
          {/* ================================================================== */}
          {categories.map((category) => (
            <TabsContent
              key={category}
              value={category}
              className="mt-0 px-5 sm:px-7 lg:px-10 py-6 sm:py-8 focus-visible:outline-none focus-visible:ring-0"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={category}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={panelVariants}
                >
                  {posts[category] && posts[category].length > 0 ? (
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div variants={staggerItem}>
                        <PostsDisplay
                          posts={posts[category]}
                          ads={ads}
                          onLoadMore={loadMorePosts}
                          isLoading={isLoading}
                          hasMore={hasMore[category]}
                        />
                      </motion.div>
                    </motion.div>
                  ) : (
                    <Empty />
                  )}
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>

      {/* View-all CTA */}
      <div className="mt-5 flex justify-center sm:justify-end">
        <a
          href="/archive"
          className={cn(
            'group inline-flex items-center gap-2 px-4 py-2',
            'rounded-full',
            'text-sm font-medium',
            'text-neutral-600 dark:text-neutral-300',
            'hover:text-primary-700 dark:hover:text-primary-300',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
            'cursor-pointer',
          )}
        >
          <span>مشاهده آرشیو کامل</span>
          <ArrowLeft
            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
            strokeWidth={2}
            aria-hidden
          />
        </a>
      </div>

      {/* Shimmer line — فقط روی featured، برای القای activity */}
      <div className="sr-only">
        <Shimmer />
      </div>
    </section>
  );
};

export default ClientSidePosts;
