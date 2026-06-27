'use client';

/**
 * ClientSidePosts — نسخه ۲۰۲۶ (v3 — داینامیک، تمیز، بدون CTA اضافی)
 *
 * تکنیک‌ها (نگه‌داشته شده):
 *  1.  MarketTicker — نوار متحرک قیمت
 *  2.  LiveClock — ساعت تهران
 *  3.  AnimatedNumber
 *  4.  Bento layout
 *  5.  Aurora background
 *  6.  Tabs با layoutId indicator
 *  7.  Category-Specific Accent
 *  8.  3D Tilt + Spotlight
 *  9.  AnimatePresence
 * 10.  Tabular-nums + PersianDigits
 * 11.  prefers-reduced-motion + pointer: coarse
 *
 * تغییرات v3:
 *  - Tabs به صورت داینامیک از دیتابیس (همیشه «همه» اول، بعد بر اساس تعداد مقاله)
 *  - اگه تعداد دسته‌ها > MAX_VISIBLE_TABS، بقیه توی DropdownMenu
 *  - حذف «مشاهده آرشیو کامل» (CTA اضافی)
 *  - `hasMore` اولیه درست: فقط اگه POSTS_PER_PAGE تا پست اومده باشه true
 *  - محافظت در برابر تکراری بودن نام دسته (dedupe در entry)
 *  - محافظت در برابر کلیک همزمان روی «بارگذاری بیشتر» چند دسته (isLoading)
 *  - Slug-aware category filter (نه name-based)
 */

import { getLatestPosts } from '@/actions/getLatestPosts';
import { type MarketTickerItem, getCryptoTickerData } from '@/actions/marketTickerActions';
import { AuroraBackground } from '@/components/ModernTrending/effects/AuroraBackground';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { STRIPE_EASE, STRIPE_EASE_SOFT } from '@/lib/motion';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { cn, toPersianNumber } from '@/lib/utils';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { AlertCircle, Check, ChevronDown, MoreHorizontal, Newspaper, Sparkles } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Empty from '../Empty';
import PostGrid from './PostGrid';
import AnimatedNumber from './effects/AnimatedNumber';
import LiveClock from './effects/LiveClock';
import MarketTicker from './effects/MarketTicker';
import { getCategoryAccent } from './effects/categoryAccent';

interface ClientSidePostsProps {
  initialPosts: Record<string, PostWithRelations[]>;
  initialAds: Advertisement[];
  /** لیست نام دسته‌ها به ترتیب دلخواه (همیشه «همه» اول) */
  categoryNames: string[];
  initialTickerData?: MarketTickerItem[];
  /** اندازه‌ی صفحه‌ی اولیه (که برای تشخیص hasMore اولیه لازمه) */
  initialPageSize?: number;
}

const DEFAULT_INITIAL_PAGE_SIZE = 12;
const MAX_VISIBLE_TABS = 6; // بیشتر از این → dropdown

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
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function normFa(s: string): string {
  return s.replace(/\s+/g, '').replace(/[‌]/g, '').toLowerCase();
}

function dedupeCategoryNames(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of input) {
    const trimmed = name?.trim();
    if (!trimmed) continue;
    // «همه» فقط یک‌بار (اگه چند بار اومده باشه، فقط اولی)
    const key = normFa(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

const ClientSidePosts: React.FC<ClientSidePostsProps> = ({
  initialPosts,
  initialAds,
  categoryNames,
  initialTickerData = [],
  initialPageSize = DEFAULT_INITIAL_PAGE_SIZE,
}) => {
  /* ---------- Dedupe + clean category list ---------- */
  const categories = useMemo(() => {
    // اگه «همه» نبود، اضافه‌اش کن
    const hasAll = categoryNames.some((c) => normFa(c) === normFa('همه'));
    const list = hasAll ? categoryNames : ['همه', ...categoryNames];
    return dedupeCategoryNames(list);
  }, [categoryNames]);

  const [posts, setPosts] = useState<Record<string, PostWithRelations[]>>(initialPosts);
  const [ads] = useState<Advertisement[]>(initialAds);
  const [isLoading, setIsLoading] = useState(false);
  /* hasMore اولیه: فقط وقتی true که دقیقاً initialPageSize تا پست اومده باشه
   * (یعنی احتمالاً صفحه‌ی بعدی هم وجود داره).
   * در غیر این صورت (۰ تا یا کمتر از یک صفحه‌ی کامل) یعنی به انتها رسیدیم. */
  const [hasMore, setHasMore] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const cat of categories) {
      const len = initialPosts[cat]?.length ?? 0;
      // اگه حتی یک پست اومده، فرض می‌کنیم صفحه‌ی بعدی هم هست
      // (PostGrid اگه آخر باشه خودش false می‌فرسته)
      map[cat] = len > 0;
    }
    return map;
  });
  const [error, setError] = useState<Error | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('همه');
  const isLoadingRef = useRef(false); // برای race condition

  const accent = useMemo(() => getCategoryAccent(activeCategory), [activeCategory]);

  /* ---------- Counts (de-duped) ----------
   * یک پست می‌تونه چند دسته داشته باشه. اگه فقط طول آرایه‌ها رو جمع بزنیم،
   * پست‌های مشترک چندبار شمرده می‌شن (باگ قبلی). الان:
   *  - totalCount: تعداد یکتای پست‌ها در همه‌ی دسته‌ها
   *  - activeCount: تعداد یکتای پست‌ها در دسته‌ی فعال
   *  - perCategoryCount[cat]: تعداد یکتا برای badge تب‌ها
   */
  const perCategoryCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of categories) {
      const list = posts[cat] ?? [];
      const ids = new Set<string>();
      for (const p of list) ids.add(p.id);
      map[cat] = ids.size;
    }
    return map;
  }, [posts, categories]);

  const totalCount = useMemo(() => {
    const ids = new Set<string>();
    for (const list of Object.values(posts)) {
      for (const p of list) ids.add(p.id);
    }
    return ids.size;
  }, [posts]);

  const activeCount = perCategoryCount[activeCategory] ?? 0;

  /* ---------- Split visible + overflow tabs ---------- */
  const { visibleTabs, overflowTabs } = useMemo(() => {
    // اگه «همه» هست، اول می‌مونه
    const allIdx = categories.findIndex((c) => normFa(c) === normFa('همه'));
    const allName = allIdx >= 0 ? categories[allIdx] : 'همه';
    const rest = categories.filter((c) => c !== allName);
    const visible = [allName, ...rest.slice(0, MAX_VISIBLE_TABS - 1)];
    const overflow = rest.slice(MAX_VISIBLE_TABS - 1);
    return { visibleTabs: visible, overflowTabs: overflow };
  }, [categories]);

  const loadMorePosts = useCallback(async () => {
    if (isLoadingRef.current || isLoading) return;
    if (!hasMore[activeCategory]) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const currentPosts = posts[activeCategory] || [];
      const newPosts = await getLatestPosts({
        count: initialPageSize,
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
          [activeCategory]: newPosts.length === initialPageSize,
        }));
      }
    } catch (err) {
      console.error('Error loading more posts:', err);
      setError(err as Error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [posts, isLoading, hasMore, activeCategory, initialPageSize]);

  /* ---------- Switch category → scroll to top of panel ---------- */
  useEffect(() => {
    // اگه دسته‌ی فعال توی visible نیست و توی overflow هست، دوباره tabs رو می‌بندیم
  }, [activeCategory]);

  return (
    // marquee-pause: hover روی هر نقطه‌ی section باعث توقف MarketTicker می‌شه
    <section className="relative isolate space-y-3 sm:space-y-4 marquee-pause">
      {/* Market Ticker */}
      <MarketTicker
        initialData={initialTickerData}
        refetchAction={getCryptoTickerData}
        pollInterval={120_000}
      />

      {/* Main panel */}
      <div className="relative">
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
            'transition-all duration-500',
          )}
          style={{
            boxShadow: `0 1px 0 0 rgba(255,255,255,0.6) inset, 0 24px 48px -24px ${accent.color}15`,
          }}
        >
          {/* Hairline top border */}
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
          <header className="relative px-3.5 sm:px-6 md:px-7 @md/csp:px-8 lg:px-10 pt-5 sm:pt-9 pb-3 sm:pb-6">
            <div className="relative flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3">
              {/* Top row on mobile: icon + title + clock */}
              <div className="flex items-center gap-3 sm:gap-0 sm:flex-1 sm:min-w-0">
                <motion.div
                  className="relative shrink-0"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{
                    duration: 2.4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }}
                >
                  <div
                    className="absolute inset-0 -m-1 rounded-2xl blur-xl transition-colors duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${accent.color}25, ${accent.color}10)`,
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
                      'transition-colors duration-500',
                    )}
                  >
                    <Newspaper
                      className="h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-500"
                      style={{ color: accent.color }}
                      strokeWidth={1.75}
                    />
                    <span
                      className="pointer-events-none absolute -end-1 -top-1 inline-flex h-3 w-3 items-center justify-center overflow-hidden rounded-full"
                      aria-hidden
                    >
                      <span
                        className="absolute inset-0 inline-flex h-3 w-3 animate-ping rounded-full opacity-60"
                        style={{ backgroundColor: accent.color }}
                      />
                      <span
                        className="relative inline-flex h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: accent.color }}
                      />
                    </span>
                  </div>
                </motion.div>

                <div className="min-w-0 flex-1 sm:flex-none sm:ml-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-xl @md/csp:text-2xl @xl/csp:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white break-words text-balance">
                      آخرین مقالات
                    </h2>
                    <Sparkles
                      className="hidden sm:block h-4 w-4 text-amber-500/80"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </div>
                </div>

                {/* Live clock pill — mobile: in top row, desktop: separate */}
                <div
                  className={cn(
                    'sm:hidden inline-flex items-center gap-1 shrink-0',
                    'h-7 px-2 rounded-full',
                    'border border-neutral-200/80 dark:border-neutral-700/60',
                    'bg-white/70 dark:bg-neutral-800/60 backdrop-blur-md',
                    'text-[10px] font-medium text-neutral-600 dark:text-neutral-300',
                    'tabular-nums',
                  )}
                >
                  <LiveClock showIcon={false} showSeconds={false} />
                  <span className="text-neutral-400 dark:text-neutral-500" aria-hidden>
                    ·
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">تهران</span>
                </div>
              </div>

              {/* Subtitle row */}
              <p className="text-[11.5px] sm:text-sm text-neutral-500 dark:text-neutral-400 font-vazirmatn flex flex-wrap items-center gap-x-2 gap-y-0.5 sm:flex-1 sm:min-w-0 sm:-mt-1">
                <span>تازه‌ترین تحلیل‌ها و گزارش‌های بازارهای مالی</span>
                {totalCount > 0 && (
                  <>
                    <span className="text-neutral-300 dark:text-neutral-700" aria-hidden>
                      ·
                    </span>
                    <span className="tabular-nums text-neutral-700 dark:text-neutral-300">
                      <AnimatedNumber value={totalCount} suffix=" مطلب" />
                    </span>
                  </>
                )}
              </p>

              {/* Live clock pill — desktop: separate end item */}
              <div
                className={cn(
                  'hidden sm:inline-flex items-center gap-1.5 shrink-0',
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
            value={activeCategory}
            onValueChange={setActiveCategory}
            dir="rtl"
            className="w-full"
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={tabsListVariants}
              className="px-3.5 sm:px-7 lg:px-10 pt-2 pb-1 flex flex-wrap items-center gap-2.5 sm:gap-4"
            >
              <TabsList
                className={cn(
                  'relative inline-flex items-center gap-1 p-1 min-h-[44px] @md/csp:min-h-0',
                  'w-full max-w-full overflow-x-auto overflow-y-hidden scrollbar-none',
                  '@md/csp:w-auto @md/csp:max-w-none @md/csp:flex-wrap @md/csp:overflow-visible @md/csp:scrollbar-custom',
                  'rounded-2xl',
                  'bg-neutral-100/80 dark:bg-neutral-800/60',
                  'border border-neutral-200/60 dark:border-neutral-700/40',
                  'backdrop-blur-md',
                )}
              >
                {visibleTabs.map((category) => {
                  const count = perCategoryCount[category] ?? 0;
                  const isActive = activeCategory === category;
                  const tabAccent = getCategoryAccent(category);
                  return (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className={cn(
                        'relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2',
                        'text-[12.5px] sm:text-sm font-medium rounded-xl whitespace-nowrap',
                        'transition-colors duration-200',
                        'text-neutral-600 dark:text-neutral-400',
                        'hover:text-neutral-900 dark:hover:text-neutral-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                        'cursor-pointer',
                      )}
                      style={isActive ? { color: tabAccent.color } : undefined}
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

                {/* Overflow dropdown — اگه دسته‌های بیشتری مونده */}
                {overflowTabs.length > 0 && (
                  <DropdownMenu dir="rtl">
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'relative flex items-center gap-1.5 px-3 sm:px-4 py-2',
                          'text-[12.5px] sm:text-sm font-medium rounded-xl whitespace-nowrap',
                          'transition-colors duration-200',
                          'text-neutral-600 dark:text-neutral-400',
                          'hover:text-neutral-900 dark:hover:text-neutral-200',
                          'hover:bg-white/60 dark:hover:bg-neutral-700/60',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                          'cursor-pointer',
                        )}
                        aria-label={`${toPersianNumber(overflowTabs.length)} دسته‌ی بیشتر`}
                      >
                        <MoreHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
                        <span>بیشتر</span>
                        <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={2} aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      className={cn(
                        'min-w-[220px] p-1.5',
                        'rounded-2xl',
                        'border border-neutral-200/80 dark:border-neutral-700/80',
                        'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl',
                        'shadow-[0_8px_32px_-8px_rgba(20,23,32,0.18)]',
                        'dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]',
                      )}
                    >
                      <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 font-semibold px-2 py-1.5">
                        دسته‌های بیشتر
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-neutral-200/60 dark:bg-neutral-700/60" />
                      <div className="max-h-[280px] overflow-y-auto">
                        {overflowTabs.map((category) => {
                          const isActive = activeCategory === category;
                          const count = perCategoryCount[category] ?? 0;
                          return (
                            <DropdownMenuItem
                              key={category}
                              onSelect={() => setActiveCategory(category)}
                              className={cn(
                                'flex items-center justify-between gap-3 px-2.5 py-2',
                                'rounded-lg cursor-pointer',
                                'text-[13px]',
                                isActive &&
                                  'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
                              )}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {isActive && (
                                  <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                                )}
                                <span className="truncate">{category}</span>
                              </span>
                              {count > 0 && (
                                <span
                                  className={cn(
                                    'inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full',
                                    'text-[10px] font-semibold tabular-nums',
                                    'bg-neutral-100 dark:bg-neutral-800',
                                    'text-neutral-600 dark:text-neutral-300',
                                  )}
                                >
                                  {toPersianNumber(count)}
                                </span>
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TabsList>

              {/* Active category hint */}
              <div className="flex items-center gap-2 text-xs sm:text-[11px] @md/csp:text-xs text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums">
                <span>نمایش</span>
                <span
                  className="inline-flex items-center justify-center min-w-[1.5rem] h-5 sm:h-6 px-1.5 sm:px-2 rounded-md font-semibold"
                  style={{
                    backgroundColor: `${accent.color}15`,
                    color: accent.color,
                  }}
                >
                  <AnimatedNumber value={activeCount} />
                </span>
                <span>مقاله از {toPersianNumber(totalCount)}</span>
              </div>
            </motion.div>

            {/* ================================================================== */}
            {/*  Tab contents                                                     */}
            {/* ================================================================== */}
            {categories.map((category) => (
              <TabsContent
                key={category}
                value={category}
                className="mt-0 px-3.5 sm:px-6 @md/csp:px-8 lg:px-10 py-5 sm:py-8 focus-visible:outline-none focus-visible:ring-0"
              >
                {category === activeCategory ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={category}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={panelVariants}
                    >
                      {posts[category] && posts[category].length > 0 ? (
                        <PostGrid
                          posts={posts[category]}
                          ads={ads}
                          onLoadMore={loadMorePosts}
                          isLoading={isLoading}
                          hasMore={hasMore[category] ?? false}
                          accentColor={accent.color}
                        />
                      ) : (
                        <Empty />
                      )}
                    </motion.div>
                  </AnimatePresence>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </div>
    </section>
  );
};

export default ClientSidePosts;
