'use client';

/**
 * PulseBoard — بازطراحی «آخرین مقالات» (نسخه ۲۰۲۶ — Production)
 *
 * ساختار grid با 3 آگهی inline که به‌صورت ریتمیک بین پست‌ها قرار می‌گیرن.
 * فوتر ترکیبی (split + reveal) با load more و archive CTA.
 * بدون repetition؛ همه چیز از رویدادها و state مشتق می‌شه.
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
  Loader2,
  Library,
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
import { AdSlot, AdBanner } from './AdSlot';

type ViewMode = 'bento' | 'rail';

interface CategoryItem {
  name: string;
  slug: string;
}

interface PulseBoardProps {
  posts: PostWithRelations[];
  categories: CategoryItem[];
  initialAds: Advertisement[];
  initialTickerData?: MarketTickerItem[];
  totalCount: number;
}

const MAX_VISIBLE_FILTERS = 6;
/** تعداد ثابت پست در هر «بارگذاری بیشتر» — هر بار دقیقاً همین تعداد. */
const PAGE_SIZE = 10;
/** تعداد پست‌های اولیه که server-side در home page می‌فرسته. */
const INITIAL_POSTS = 24;
/** تعداد visible اولیه برای رندر. */
const INITIAL_VISIBLE = 9;

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

/* ============================================================================
   بافت‌بندی ریتمیک پست‌ها و آگهی‌ها
   - hero (پست شماره ۱، ۷/۱۲)
   - 2 پست stack (شماره ۲-۳، ۵/۱۲)
   - ریل ۲ ستونه (شماره ۴+، ۱۲/۱۲)
   - آگهی ۱ (full width، بین ریل و ادامه)
   - ریل ادامه (پست‌های ۱۰+)
   - آگهی ۲ (inline banner کوچک)
   - ریل پایانی
   - آگهی ۳ (banner پایانی)
   ============================================================================ */
type RailChunk = { type: 'rail'; posts: PostWithRelations[]; key: string };
type AdChunk = { type: 'ad'; ad: Advertisement; key: string; variant: 'inline' | 'banner' };
type Chunk = RailChunk | AdChunk;

function buildBentoChunks(
  allPosts: PostWithRelations[],
  ads: Advertisement[],
): { hero?: PostWithRelations; stack: PostWithRelations[]; chunks: Chunk[] } {
  const hero = allPosts[0];
  const stack = allPosts.slice(1, 3);
  const rest = allPosts.slice(3);
  const chunks: Chunk[] = [];
  const ad1 = ads[0];
  const ad2 = ads[1];
  const ad3 = ads[2];

  // ۶ پست اول ریل
  const first = rest.slice(0, 6);
  if (first.length > 0) chunks.push({ type: 'rail', posts: first, key: 'rail-1' });

  // آگهی inline ۱
  if (ad1) chunks.push({ type: 'ad', ad: ad1, key: 'ad-1', variant: 'inline' });

  // ۶ پست دوم
  const second = rest.slice(6, 12);
  if (second.length > 0) chunks.push({ type: 'rail', posts: second, key: 'rail-2' });

  // آگهی بنر ۲
  if (ad2) chunks.push({ type: 'ad', ad: ad2, key: 'ad-2', variant: 'banner' });

  // ۶ پست سوم
  const third = rest.slice(12, 18);
  if (third.length > 0) chunks.push({ type: 'rail', posts: third, key: 'rail-3' });

  // آگهی بنر ۳
  if (ad3) chunks.push({ type: 'ad', ad: ad3, key: 'ad-3', variant: 'banner' });

  // باقی
  const tail = rest.slice(18);
  if (tail.length > 0) chunks.push({ type: 'rail', posts: tail, key: 'rail-tail' });

  return { hero, stack, chunks };
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

  const categoriesList = useMemo(() => dedupeCategories(categories), [categories]);

  const [activeCategory, setActiveCategory] = useState<string>('همه');
  const [viewMode, setViewMode] = useState<ViewMode>('bento');

  const [categoryPosts, setCategoryPosts] = useState<Record<string, PostWithRelations[]>>(() => ({
    'همه': posts,
  }));
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    'همه': INITIAL_VISIBLE,
  });
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({
    'همه': true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCategoryPosts((prev) => ({ ...prev, 'همه': posts }));
    setVisibleCounts((prev) => ({ ...prev, 'همه': INITIAL_VISIBLE }));
    setHasMoreMap((prev) => ({ ...prev, 'همه': true }));
  }, [posts]);

  useEffect(() => {
    if (activeCategory !== 'همه' && !categoryPosts[activeCategory]) {
      const inMemory = posts.filter((p) =>
        p.categories?.some((c) => normFa(c.name) === normFa(activeCategory)),
      );
      setCategoryPosts((prev) => ({ ...prev, [activeCategory]: inMemory }));
      setVisibleCounts((prev) => ({ ...prev, [activeCategory]: INITIAL_VISIBLE }));
      setHasMoreMap((prev) => ({ ...prev, [activeCategory]: true }));
    }
  }, [activeCategory, categoryPosts, posts]);

  const handleLoadMore = async () => {
    if (loading) return;
    const currentList = categoryPosts[activeCategory] || [];
    const currentLimit = visibleCounts[activeCategory] ?? INITIAL_VISIBLE;

    // اگه هنوز visible بیشتری داخل همون لیست فعلی هست، فقط پنجره رو جلو ببر
    // — هیچ لود شبکه‌ای، هیچ رفتار غیرقابل پیش‌بینی.
    if (currentList.length > currentLimit) {
      setVisibleCounts((prev) => ({ ...prev, [activeCategory]: currentLimit + PAGE_SIZE }));
      return;
    }

    // اگه به ته لیست فعلی رسیدیم و سرور چیزی برنمی‌گردونه، دکمه غیرفعال
    if (hasMoreMap[activeCategory] === false) return;

    setLoading(true);
    try {
      const nextPosts = await getLatestPosts({
        count: PAGE_SIZE,
        skip: currentList.length,
        category: activeCategory === 'همه' ? undefined : activeCategory,
      });

      // حذف duplicate (در حالت race بین دو کلیک پشت سر هم)
      const uniqueNext = nextPosts.filter((np) => !currentList.some((cl) => cl.id === np.id));
      const newList = [...currentList, ...uniqueNext];

      setCategoryPosts((prev) => ({ ...prev, [activeCategory]: newList }));

      // visible رو به اندازه‌ی دقیق تعداد واقعی جدید بالا ببر
      // (نه PAGE_SIZE، چون سرور ممکنه کمتر برگردونه)
      const added = uniqueNext.length;
      setVisibleCounts((prev) => ({
        ...prev,
        [activeCategory]: currentLimit + Math.max(added, PAGE_SIZE),
      }));
      // اگه سرور کمتر از PAGE_SIZE برگردوند، یعنی به انتها رسیدیم
      setHasMoreMap((prev) => ({
        ...prev,
        [activeCategory]: nextPosts.length >= PAGE_SIZE,
      }));
    } catch (err) {
      console.error('[PulseBoard] loadMore error:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentCategoryPosts = useMemo(() => {
    if (categoryPosts[activeCategory]) return categoryPosts[activeCategory];
    return posts.filter((p) =>
      p.categories?.some((c) => normFa(c.name) === normFa(activeCategory)),
    );
  }, [categoryPosts, activeCategory, posts]);

  const activeCategoryObj = useMemo(
    () => categoriesList.find((c) => c.name === activeCategory),
    [categoriesList, activeCategory],
  );

  const categorySlug = activeCategoryObj?.slug || '';
  const accent = getCategoryAccent(activeCategory);
  const currentLimit = visibleCounts[activeCategory] ?? 9;
  const currentList = currentCategoryPosts.slice(0, currentLimit);

  const { hero, stack, chunks } = useMemo(
    () => buildBentoChunks(currentList, initialAds),
    [currentList, initialAds],
  );

  const visibleFilters = categoriesList.slice(0, MAX_VISIBLE_FILTERS);

  const supportsViewTransition = useMemo(() => {
    if (typeof document === 'undefined') return false;
    return 'startViewTransition' in document;
  }, []);

  const handleCategoryChange = (next: string) => {
    if (next === activeCategory) return;
    if (supportsViewTransition) {
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => setActiveCategory(next));
        return;
      }
    }
    setActiveCategory(next);
  };

  const hasMorePosts = currentCategoryPosts.length > currentLimit || hasMoreMap[activeCategory] !== false;
  const archiveHref = activeCategory === 'همه' ? '/archive' : `/archive/category/${categorySlug}`;

  return (
    <section
      ref={containerRef}
      dir="rtl"
      className="relative isolate marquee-pause"
      aria-label="آخرین مقالات"
    >
      {/* Live Market Ticker */}
      {initialTickerData.length > 0 && (
        <MarketTicker
          initialData={initialTickerData}
          refetchAction={getMarketTickerData}
          pollInterval={60_000}
          className="mb-3 sm:mb-5"
        />
      )}

      {/* Main panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={headerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: STRIPE_EASE }}
        className={cn(
          'relative overflow-hidden rounded-3xl',
          'border border-neutral-200/70 dark:border-neutral-800/80',
          'bg-white/75 dark:bg-neutral-900/70 backdrop-blur-xl',
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
        {/*  Header                                                              */}
        {/* ================================================================== */}
        <header className="relative px-4 sm:px-7 lg:px-10 pt-5 sm:pt-7 pb-4 sm:pb-5">
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Top row */}
            <div className="flex items-center gap-3 sm:gap-4">
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

              {/* View mode toggle */}
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

              {/* Live clocks — desktop (تهران + کابل) */}
              <div
                className={cn(
                  'hidden lg:inline-flex items-center gap-1.5 shrink-0',
                  'h-9 px-1 rounded-full',
                  'border border-neutral-200/80 dark:border-neutral-700/60',
                  'bg-white/70 dark:bg-neutral-800/60 backdrop-blur-md',
                  'font-vazirmatn',
                )}
                aria-label="ساعت بازارهای منطقه"
              >
                <div
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    'h-7 px-2.5 rounded-full',
                    'bg-neutral-100/70 dark:bg-neutral-900/50',
                    'text-[11px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-300',
                  )}
                  title="ساعت تهران"
                >
                  <LiveClock showIcon={false} showSeconds timeZone="Asia/Tehran" />
                  <span className="text-neutral-400 dark:text-neutral-500">·</span>
                  <span className="text-neutral-500 dark:text-neutral-400">تهران</span>
                </div>
                <div
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    'h-7 px-2.5 rounded-full',
                    'text-[11px] sm:text-xs font-medium',
                    'transition-colors duration-300',
                  )}
                  style={{
                    backgroundColor: `${accent.color}1a`,
                    color: accent.color,
                  }}
                  title="ساعت کابل"
                >
                  <LiveClock showIcon={false} showSeconds timeZone="Asia/Kabul" />
                  <span className="opacity-60" style={{ color: accent.color }}>·</span>
                  <span className="font-semibold" style={{ color: accent.color }}>کابل</span>
                </div>
              </div>
            </div>

            {/* Filter row */}
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

              {/* Counter */}
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
        {/*  Content                                                             */}
        {/* ================================================================== */}
        <div className="relative px-4 sm:px-7 lg:px-10 pb-6 sm:pb-9 pt-2 sm:pt-3">
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
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-7"
              >
                {/* Hero */}
                {hero && (
                  <div className="lg:col-span-7 xl:col-span-8 min-w-0">
                    <PulseCard post={hero} size="lg" accentColor={accent.color} />
                  </div>
                )}

                {/* Stack */}
                <div className="lg:col-span-5 xl:col-span-4 min-w-0 flex flex-col gap-5 sm:gap-6 lg:gap-7">
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

                {/* Rythm chunks (rails + ads interspersed) */}
                {chunks.map((chunk) => {
                  if (chunk.type === 'rail') {
                    const half = Math.ceil(chunk.posts.length / 2);
                    const left = chunk.posts.slice(0, half);
                    const right = chunk.posts.slice(half);
                    return (
                      <div key={chunk.key} className="lg:col-span-12 min-w-0">
                        <div
                          className={cn(
                            'grid grid-cols-1 md:grid-cols-2',
                            'gap-x-8 gap-y-0',
                            'rounded-2xl sm:rounded-3xl',
                            'border border-neutral-200/60 dark:border-neutral-800/70',
                            'bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md',
                            'p-3 sm:p-5 lg:p-6',
                          )}
                        >
                          <PulseRail posts={left} />
                          <PulseRail posts={right} className="hidden md:block" />
                        </div>
                      </div>
                    );
                  }
                  // ad
                  if (chunk.variant === 'inline') {
                    return (
                      <div key={chunk.key} className="lg:col-span-12 min-w-0">
                        <AdSlot ad={chunk.ad} accentColor={accent.color} />
                      </div>
                    );
                  }
                  return (
                    <div key={chunk.key} className="lg:col-span-12 min-w-0">
                      <AdBanner ad={chunk.ad} accentColor={accent.color} />
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key={`rail-${activeCategory}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.35, ease: STRIPE_EASE_SOFT } }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0"
              >
                {(() => {
                  const half = Math.ceil(currentList.length / 2);
                  return (
                    <>
                      <PulseRail posts={currentList.slice(0, half)} />
                      <PulseRail posts={currentList.slice(half)} className="hidden md:block" />
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================================================================== */}
          {/*  Footer: Reveal Card (Load More + Archive)                         */}
          {/* ================================================================== */}
          <div className="mt-8 sm:mt-10">
            <FooterActions
              hasMore={hasMorePosts}
              loading={loading}
              accent={accent.color}
              archiveHref={archiveHref}
              onLoadMore={handleLoadMore}
              totalCount={currentCategoryPosts.length}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ============================================================================
   FooterActions — کارت کف با دو عمل اصلی
   - «بارگذاری بیشتر»: دکمه‌ی primary با progress
   - «مشاهده آرشیو کامل»: لینک ثانویه با chevron و meta
   ============================================================================ */
function FooterActions({
  hasMore,
  loading,
  accent,
  archiveHref,
  onLoadMore,
  totalCount,
}: {
  hasMore: boolean;
  loading: boolean;
  accent: string;
  archiveHref: string;
  onLoadMore: () => void;
  totalCount: number;
}) {
  if (!hasMore) {
    // حالت پایان — فقط لینک آرشیو نمایش داده می‌شود
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl sm:rounded-3xl',
          'border border-neutral-200/60 dark:border-neutral-800/60',
          'bg-gradient-to-br from-white/60 to-neutral-100/40 dark:from-neutral-900/60 dark:to-neutral-900/30',
          'backdrop-blur-md',
          'px-5 sm:px-7 py-5 sm:py-6',
          'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accent}1a`, color: accent }}
          >
            <Library className="h-4 w-4" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="text-[13px] sm:text-sm font-bold text-neutral-900 dark:text-white">
              به انتهای فهرست رسیدید
            </p>
            <p className="text-[11px] sm:text-[12px] text-neutral-500 dark:text-neutral-400 tabular-nums">
              {toPersianNumber(formatNumber(totalCount))} مقاله نمایش داده شد
            </p>
          </div>
        </div>
        <Link
          href={archiveHref}
          className={cn(
            'group/all inline-flex items-center gap-2',
            'px-5 py-2.5 rounded-full',
            'text-[12.5px] sm:text-[13px] font-semibold',
            'border border-neutral-200/80 dark:border-neutral-700/60',
            'bg-white/70 dark:bg-neutral-800/50 backdrop-blur-md',
            'text-neutral-900 dark:text-white',
            'hover:bg-white dark:hover:bg-neutral-800',
            'transition-all duration-300 hover:gap-2.5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          )}
          style={{ ['--accent' as string]: accent } as React.CSSProperties}
        >
          <span>مشاهده آرشیو کامل</span>
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover/all:-translate-x-1"
            strokeWidth={2.5}
            style={{ color: accent }}
            aria-hidden
          />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl sm:rounded-3xl',
        'border border-neutral-200/60 dark:border-neutral-800/60',
        'bg-gradient-to-br from-white/60 to-neutral-100/40 dark:from-neutral-900/60 dark:to-neutral-900/30',
        'backdrop-blur-md',
        'px-5 sm:px-7 py-5 sm:py-6',
        'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4',
      )}
    >
      {/* Decorative grid در پس‌زمینه */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--hairline) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at center, black 35%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 60% at center, black 35%, transparent 75%)',
        }}
      />

      {/* محتوای اصلی */}
      <div className="relative flex items-center gap-3 min-w-0">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] sm:text-sm font-bold text-neutral-900 dark:text-white">
            هنوز مطالب بیشتری هست
          </p>
          <p className="text-[11px] sm:text-[12px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            مقالات بیشتر را در همین بخش یا در آرشیو ببینید
          </p>
        </div>
      </div>

      {/* اکشن‌ها */}
      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={onLoadMore}
          className={cn(
            'ad-load-shine group/load relative inline-flex items-center justify-center gap-2',
            'px-5 sm:px-6 py-2.5 sm:py-3 rounded-full',
            'text-[12.5px] sm:text-[13.5px] font-bold text-white',
            'transition-all duration-300',
            'cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'active:scale-[0.97]',
          )}
          style={{
            backgroundColor: accent,
            boxShadow: `0 8px 20px -8px ${accent}80, 0 2px 6px -2px ${accent}40`,
          }}
        >
          <span className="ad-load-shine__beam" aria-hidden />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin relative z-10" strokeWidth={2.5} aria-hidden />
          ) : (
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <Newspaper className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              <span>بارگذاری بیشتر</span>
            </span>
          )}
        </button>

        <Link
          href={archiveHref}
          className={cn(
            'group/all inline-flex items-center justify-center gap-2',
            'px-5 py-2.5 sm:py-3 rounded-full',
            'text-[12.5px] sm:text-[13.5px] font-semibold',
            'border border-neutral-200/80 dark:border-neutral-700/60',
            'bg-white/70 dark:bg-neutral-800/50 backdrop-blur-md',
            'text-neutral-800 dark:text-neutral-100',
            'hover:bg-white dark:hover:bg-neutral-800',
            'transition-all duration-300 hover:gap-2.5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          )}
        >
          <Library className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" strokeWidth={2.25} aria-hidden />
          <span>آرشیو کامل</span>
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover/all:-translate-x-1"
            strokeWidth={2.5}
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}

export default PulseBoard;
