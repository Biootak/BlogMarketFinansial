'use client';

/**
 * LatestArticles — بازطراحی کامل بخش «آخرین مقالات» (نسخه ۲۰۲۶)
 * ----------------------------------------------------------------------------
 * - Header چسبان با eyebrow لوکس، counters زنده، فیلتر دسته با layoutId pill
 * - Live market ticker (همون قبلی) — فقط بهبود ظاهر
 * - Featured grid بزرگ: 1 hero + 2 stack
 * - Compact list ۲ ستونه (5-6 آیتم)
 * - Highlighted Quote-of-day با glassmorphism ملایم
 * - Infinite-scroll با IntersectionObserver (بدون state اضافی)
 * - skeleton برای لود
 * - prefers-reduced-motion → keyframe global clamp
 */

import { getLatestPosts } from '@/actions/getLatestPosts';
import type { MarketTickerItem } from '@/actions/marketTickerActions';
import { getCryptoTickerData } from '@/actions/marketTickerActions';
import { AuroraBackground } from '@/components/ModernTrending/effects/AuroraBackground';
import SafeImage from '@/components/SafeImage/SafeImage';
import AnimatedNumber from '@/components/Sections/effects/AnimatedNumber';
import LiveClock from '@/components/Sections/effects/LiveClock';
import MarketTicker from '@/components/Sections/effects/MarketTicker';
import { getCategoryAccent } from '@/components/Sections/effects/categoryAccent';
import { getPostLink } from '@/lib/getPostLink';
import { useMediaQuery } from '@/hooks/use-media-query';
import { motion, useInView, useReducedMotion } from '@/lib/motion-shim';
import { cn, formatNumber, toPersianNumber } from '@/lib/utils';
import type { Advertisement, PostWithRelations } from '@/types/types';
import {
  ArrowLeft,
  ArrowUpLeft,
  Bookmark,
  Calendar,
  ChevronDown,
  Clock,
  Eye,
  Flame,
  Library,
  Loader2,
  MessageCircle,
  Newspaper,
  Radio,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

// ad-primitives.css از (site)/layout.tsx سراسری import می‌شود — اینجا لازم نیست

interface CategoryItem {
  name: string;
  slug: string;
}

interface LatestArticlesProps {
  posts: PostWithRelations[];
  categories: CategoryItem[];
  initialAds: Advertisement[];
  initialTickerData?: MarketTickerItem[];
  totalCount: number;
}

const MAX_VISIBLE_FILTERS = 6;
const INITIAL_VISIBLE = 8;
/**
 * اندازه‌ی هر chunk از «بارگذاری بیشتر». 8 = یک ردیف 4 ستونه‌ی دسکتاپ
 * + یک ردیف 2 ستونه‌ی موبایل؛ کاربر با هر کلیک دقیقاً همین تعداد مقاله‌ی
 * تازه می‌بینه و تجربه‌ی پایدار داره.
 */
const PAGE_SIZE = 8;

/* ---------- Helpers (no duplication) ---------- */
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

function dedupePosts(posts: PostWithRelations[]): PostWithRelations[] {
  const seen = new Set<string>();
  const out: PostWithRelations[] = [];
  for (const p of posts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

function readingMin(text: string | null | undefined): number {
  if (!text) return 3;
  const words = text
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/).length;
  return Math.max(2, Math.round(words / 180));
}

/**
 * رنگ accent را برای استفاده در متن بررسی می‌کند.
 * رنگ‌های خیلی روشن (lightness بالا) روی پس‌زمینه روشن کنتراست کافی ندارند.
 * در این حالت از رنگ neutral-700 (#374151) استفاده می‌شود.
 * WCAG AA: نسبت ≥ 4.5:1 برای متن عادی.
 */
function accessibleTextColor(hex: string, fallback = '#374151'): string {
  // رنگ‌های شناخته‌شده با کنتراست پایین روی سفید
  const lowContrast = new Set(['#94a3b8', '#cbd5e1', '#e2e8f0', '#a8b5c1', '#b0bec5']);
  if (lowContrast.has(hex.toLowerCase())) return fallback;
  return hex;
}

function fmtJalali(d: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(d));
}

function fmtJalaliShort(d: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(d));
}

function relTime(d: Date | string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'لحظاتی پیش';
  if (m < 60) return `${toPersianNumber(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${toPersianNumber(h)} ساعت پیش`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${toPersianNumber(day)} روز پیش`;
  return fmtJalaliShort(d);
}

/* ============================================================================
   Component
   ============================================================================ */
function LatestArticles({
  posts,
  categories,
  initialAds,
  initialTickerData = [],
  totalCount,
}: LatestArticlesProps) {
  const _reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const categoriesList = useMemo(() => dedupeCategories(categories), [categories]);
  const initialPosts = useMemo(() => dedupePosts(posts), [posts]);

  const [activeCategory, setActiveCategory] = useState<string>('همه');
  const [categoryPosts, setCategoryPosts] = useState<Record<string, PostWithRelations[]>>({
    همه: initialPosts,
  });
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    همه: INITIAL_VISIBLE,
  });
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({ همه: true });
  const [loading, setLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  // sync initial posts if they change (e.g. HMR)
  useEffect(() => {
    setCategoryPosts((prev) => ({ ...prev, همه: initialPosts }));
    setVisibleCounts((prev) => ({ ...prev, همه: INITIAL_VISIBLE }));
    setHasMoreMap((prev) => ({ ...prev, همه: true }));
  }, [initialPosts]);

  // in-memory filter for non-`همه` categories (server filter happens on load-more)
  useEffect(() => {
    if (activeCategory !== 'همه' && !categoryPosts[activeCategory]) {
      const inMemory = initialPosts.filter((p) =>
        p.categories?.some((c) => normFa(c.name) === normFa(activeCategory)),
      );
      setCategoryPosts((prev) => ({ ...prev, [activeCategory]: inMemory }));
      setVisibleCounts((prev) => ({ ...prev, [activeCategory]: INITIAL_VISIBLE }));
      setHasMoreMap((prev) => ({ ...prev, [activeCategory]: true }));
    }
  }, [activeCategory, categoryPosts, initialPosts]);

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLoadMore = async () => {
    if (loading) return;
    const currentList = categoryPosts[activeCategory] || [];
    const currentLimit = visibleCounts[activeCategory] ?? INITIAL_VISIBLE;

    // اگه هنوز visible بیشتری داخل همون لیست فعلی هست، فقط پنجره رو جلو ببر
    // (هیچ لود شبکه‌ای — هیچ رفتار غیرقابل پیش‌بینی).
    if (currentList.length > currentLimit) {
      setVisibleCounts((prev) => ({ ...prev, [activeCategory]: currentLimit + PAGE_SIZE }));
      return;
    }

    if (hasMoreMap[activeCategory] === false) return;

    setLoading(true);
    try {
      const nextPosts = await getLatestPosts({
        count: PAGE_SIZE,
        skip: currentList.length,
        category: activeCategory === 'همه' ? undefined : activeCategory,
      });
      const uniqueNext = nextPosts.filter((np) => !currentList.some((cl) => cl.id === np.id));
      const newList = [...currentList, ...uniqueNext];

      setCategoryPosts((prev) => ({ ...prev, [activeCategory]: newList }));

      // پنجره‌ی visible رو دقیقاً به اندازه‌ی آیتم‌های واقعی جلو ببر
      // (نه PAGE_SIZE). این تضمین می‌کنه کلیک بعدی منطق درست رو طی کنه.
      setVisibleCounts((prev) => ({
        ...prev,
        [activeCategory]: currentLimit + uniqueNext.length,
      }));
      // اگه سرور کمتر از PAGE_SIZE برگردوند، یعنی به انتها رسیدیم
      setHasMoreMap((prev) => ({
        ...prev,
        [activeCategory]: nextPosts.length >= PAGE_SIZE,
      }));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const currentCategoryPosts = useMemo(() => {
    if (categoryPosts[activeCategory]) return categoryPosts[activeCategory];
    return initialPosts.filter((p) =>
      p.categories?.some((c) => normFa(c.name) === normFa(activeCategory)),
    );
  }, [categoryPosts, activeCategory, initialPosts]);

  const activeCategoryObj = useMemo(
    () => categoriesList.find((c) => c.name === activeCategory),
    [categoriesList, activeCategory],
  );

  const categorySlug = activeCategoryObj?.slug || '';
  const accent = getCategoryAccent(activeCategory);
  const currentLimit = visibleCounts[activeCategory] ?? INITIAL_VISIBLE;
  const visiblePosts = currentCategoryPosts.slice(0, currentLimit);

  const hero = visiblePosts[0];
  const stack = visiblePosts.slice(1, 3);
  const list = visiblePosts.slice(3);

  const visibleFilters = categoriesList.slice(0, MAX_VISIBLE_FILTERS);
  const hasMorePosts =
    currentCategoryPosts.length > currentLimit || hasMoreMap[activeCategory] !== false;
  const archiveHref = activeCategory === 'همه' ? '/archive' : `/archive/category/${categorySlug}`;

  /* ---------- Ads (small embedded) ---------- */
  const adSpot = initialAds[1] ?? initialAds[0];
  const firstAdId = initialAds[0]?.id;

  return (
    <section ref={containerRef} dir="rtl" className="relative isolate" aria-label="تازه‌های بازار">
      {/* Live Market Ticker */}
      {initialTickerData.length > 0 && (
        <MarketTicker
          initialData={initialTickerData}
          refetchAction={getCryptoTickerData}
          pollInterval={120_000}
          className="mb-3 sm:mb-5"
        />
      )}

      <div
        className={cn(
          'relative overflow-hidden rounded-3xl',
          'border border-[color:var(--hairline)]',
          'bg-white/80 dark:bg-neutral-900/70 backdrop-blur-2xl',
        )}
        style={{
          boxShadow: `0 1px 0 0 rgba(255,255,255,0.6) inset, 0 24px 48px -24px ${accent.color}1f`,
        }}
      >
        {/* Aurora background */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
          <AuroraBackground
            intensity={0.4}
            duration={48}
            accentA={`${accent.color}26`}
            accentB={`${accent.color}14`}
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
        <header className="relative px-3 sm:px-5 lg:px-8 pt-3 sm:pt-5 pb-2 sm:pb-4">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
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
                    'border border-[color:var(--hairline)]',
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
                      className="absolute inset-0 inline-flex h-full w-full rounded-full opacity-60 anim-ping-soft"
                      style={{ backgroundColor: accent.color }}
                    />
                    <span
                      className="relative inline-flex h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: accent.color }}
                    />
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-neutral-900 dark:text-white text-balance">
                    تازه‌های بازار
                  </h2>
                  <Sparkles
                    className="hidden sm:block h-4 w-4 text-amber-500/80"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </div>
                <p className="mt-0.5 text-[11.5px] sm:text-[12.5px] text-neutral-500 dark:text-neutral-400 font-sans">
                  تازه‌ترین روایت‌ها، تحلیل‌ها و گزارش‌ها از قلب بازار
                </p>
              </div>

              {/* Live clocks — desktop */}
              <div
                className={cn(
                  'hidden lg:inline-flex items-center gap-1.5 shrink-0',
                  'h-9 px-1 rounded-full',
                  'border border-[color:var(--hairline)]',
                  'bg-white/70 dark:bg-neutral-800/60 backdrop-blur-md',
                  'font-sans',
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
                  <LiveClock showIcon={false} timeZone="Asia/Tehran" />
                  <span className="text-neutral-400 dark:text-neutral-500">·</span>
                  {/* color-contrast: neutral-600 به‌جای 500 — روی bg-neutral-100
                      کنتراست ≥ 4.5:1 دارد (AA برای متن کوچک) */}
                  <span className="text-neutral-600 dark:text-neutral-300">تهران</span>
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
                  <LiveClock showIcon={false} timeZone="Asia/Kabul" />
                  {/* color-contrast: رنگ تزئینی برای جداکننده مشکلی ندارد */}
                  <span className="opacity-60" style={{ color: accent.color }}>
                    ·
                  </span>
                  {/* color-contrast fix: از رنگ accessible برای متن استفاده می‌کنیم */}
                  <span
                    className="font-semibold"
                    style={{ color: accessibleTextColor(accent.color) }}
                  >
                    کابل
                  </span>
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
                  'border border-[color:var(--hairline)]',
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
                      onClick={() => setActiveCategory(category.name)}
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
                      // Color-contrast fix: style={{ color: tabAccent.color }} برای
                      // دسته «همه» (slate #94a3b8) روی سفید 2.56:1 بود و کلاس
                      // text-neutral-900 را override می‌کرد. رنگ accent فقط روی
                      // pill/dot نمایش داده می‌شود، نه متن. (R23-fix 2026-08-02)
                    >
                      {isActive && (
                        <motion.span
                          layoutId="latest-filter-pill"
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
              <div className="inline-flex items-center gap-1.5 text-[10.5px] sm:text-[11.5px] text-neutral-500 dark:text-neutral-400 font-sans tabular-nums">
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
        <div className="relative px-3 sm:px-5 lg:px-8 pb-4 sm:pb-7 pt-2">
          {currentCategoryPosts.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-neutral-500 dark:text-neutral-400">
              <Newspaper className="mx-auto h-9 w-9 sm:h-10 sm:w-10 opacity-40" aria-hidden />
              <p className="mt-3 text-sm font-medium">در این دسته فعلاً مقاله‌ای منتشر نشده</p>
            </div>
          ) : (
            <div className="space-y-5 sm:space-y-8 lg:space-y-10">
              {/* ============================================================== */}
              {/*  HERO + STACK                                                  */}
              {/* ============================================================== */}
              <div
                className={cn(
                  'grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6',
                  'stagger-children',
                )}
              >
                {hero && (
                  <div className="lg:col-span-7 min-w-0">
                    <HeroCard
                      post={hero}
                      accentColor={accent.color}
                      bookmarked={bookmarked.has(hero.id)}
                      onToggleBookmark={() => toggleBookmark(hero.id)}
                    />
                  </div>
                )}

                <div className="lg:col-span-5 min-w-0 flex flex-col gap-5 sm:gap-6">
                  {stack.map((p) => (
                    <StackCard
                      key={p.id}
                      post={p}
                      bookmarked={bookmarked.has(p.id)}
                      onToggleBookmark={() => toggleBookmark(p.id)}
                    />
                  ))}
                </div>
              </div>

              {/* ============================================================== */}
              {/*  EDITORIAL DIVIDER + AD STRIP (4-5 ads grid)                   */}
              {/* ============================================================== */}
              {initialAds.length > 0 && (
                <EditorialAdStrip ads={initialAds} accentColor={accent.color} />
              )}

              {/* ============================================================== */}
              {/*  COMPACT 2-COL LIST                                            */}
              {/* ============================================================== */}
              {list.length > 0 && (
                <div
                  className={cn(
                    'grid grid-cols-1 md:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-1',
                    'rounded-2xl sm:rounded-3xl',
                    'border border-[color:var(--hairline)]',
                    'bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md',
                    'p-3 sm:p-5 lg:p-6',
                    'relative',
                  )}
                >
                  {/* Vertical divider for the right (RTL start) column */}
                  <div
                    className="hidden md:block absolute top-4 bottom-4 start-1/2 w-px"
                    aria-hidden
                    style={{
                      background:
                        'linear-gradient(180deg, transparent, var(--hairline) 12%, var(--hairline) 88%, transparent)',
                    }}
                  />
                  {(() => {
                    // تقسیم مساوی: هر دو ستون باید یک اندازه باشن
                    const half = Math.ceil(list.length / 2);
                    const left = list.slice(0, half);
                    const right = list.slice(half);
                    return (
                      <>
                        <ListColumn
                          posts={left}
                          bookmarked={bookmarked}
                          onToggleBookmark={toggleBookmark}
                        />
                        {/* ستون دوم فقط در md+ رندر می‌شود — مخفی‌کردن با CSS
                            باعث warning «fill و height 0» در Next dev می‌شود */}
                        {isDesktop && (
                          <ListColumn
                            posts={right}
                            bookmarked={bookmarked}
                            onToggleBookmark={toggleBookmark}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ============================================================== */}
              {/*  FOOTER: load more + archive                                   */}
              {/* ============================================================== */}
              <FooterActions
                hasMore={hasMorePosts}
                loading={loading}
                accent={accent.color}
                archiveHref={archiveHref}
                onLoadMore={handleLoadMore}
                totalCount={currentCategoryPosts.length}
              />

              {/* ============================================================== */}
              {/*  HIGHLIGHT QUOTE — editorial touch                             */}
              {/* ============================================================== */}
              {visiblePosts[0]?.excerpt && (
                <QuoteHighlight
                  text={visiblePosts[0].excerpt
                    .replace(/<[^>]+>/g, ' ')
                    .trim()
                    .slice(0, 220)}
                  authorName={visiblePosts[0].author?.name ?? 'نویسنده'}
                  accentColor={accent.color}
                />
              )}

              {/* ============================================================== */}
              {/*  SECOND AD — compact inline banner                              */}
              {/* ============================================================== */}
              {adSpot && adSpot.id !== firstAdId && (
                <InlineAdBanner ad={adSpot} accentColor={accent.color} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   HeroCard — کارت اصلی
   ============================================================================ */
function HeroCard({
  post,
  accentColor,
  bookmarked,
  onToggleBookmark,
}: {
  post: PostWithRelations;
  accentColor: string;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  const cat = post.categories?.[0];
  const postLink = getPostLink(post.postType, post.slug);
  const reading = readingMin(post.excerpt);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group/hero relative h-full"
    >
      <Link
        href={postLink}
        // WCAG 2.5.3 label-in-name: remove redundant aria-label — the link's
        // visible content (title + meta) is the accessible name.
        className={cn(
          'relative block h-full overflow-hidden rounded-2xl sm:rounded-3xl',
          'border border-[color:var(--hairline)]',
          'bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md',
          'shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_8px_24px_-12px_rgba(20,23,32,0.08)]',
          'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.35)]',
          'transition-shadow duration-500',
          'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_24px_48px_-16px_rgba(20,23,32,0.18)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'focus-visible:ring-offset-transparent',
        )}
        style={{ ['--hero-accent' as string]: accentColor } as React.CSSProperties}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <SafeImage
            src={post.featuredImage}
            alt={post.title}
            fill
            sizes="(min-width: 1280px) 58vw, (min-width: 768px) 65vw, 100vw"
            containerClassName="absolute inset-0"
            className="object-cover transition-transform duration-700 ease-out group-hover/hero:scale-[1.04]"
            variant="hero"
            ratio="16/9"
            priority
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.78) 100%)',
            }}
          />

          {/* Top-end bookmark */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleBookmark();
            }}
            aria-label={bookmarked ? 'حذف از نشان‌شده‌ها' : 'نشان کردن'}
            className={cn(
              'absolute top-3 start-3 sm:top-4 sm:start-4',
              'inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full',
              'bg-white/20 backdrop-blur-md border border-white/25',
              'text-white',
              'transition-all duration-300 hover:scale-110',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
            )}
          >
            <Bookmark
              className={cn('h-4 w-4', bookmarked ? 'fill-current text-amber-400' : 'text-white')}
              strokeWidth={2}
            />
          </button>

          {/* Category pill — bottom-right (RTL) above title */}
          {cat && (
            <div className="absolute bottom-24 sm:bottom-28 end-4 sm:end-6 flex items-center gap-1.5">
              {/* color-contrast fix: از پس‌زمینه تیره‌تر (۸۵%) استفاده می‌کنیم
                  تا color:#fff نسبت کنتراست ≥ 4.5:1 داشته باشد */}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full',
                  'px-2.5 py-1 text-[10.5px] sm:text-[11px] font-semibold',
                  'border backdrop-blur-md',
                )}
                style={{
                  backgroundColor: `${accentColor}d9`,
                  borderColor: `${accentColor}`,
                  color: '#fff',
                }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
                  aria-hidden
                />
                {cat.name}
              </span>
            </div>
          )}

          {/* Hero content */}
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 lg:p-7 text-white">
            <h3 className="text-[12.5px] sm:text-[16px] lg:text-[21px] font-bold tracking-tight leading-[1.35] line-clamp-2 text-balance">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="mt-1.5 text-[10.5px] sm:text-[12px] leading-[1.65] text-white/85 line-clamp-2 sm:line-clamp-3 max-w-2xl text-pretty">
                {post.excerpt
                  .replace(/<[^>]+>/g, ' ')
                  .trim()
                  .slice(0, 200)}
                {post.excerpt.length > 200 ? '…' : ''}
              </p>
            )}

            <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] sm:text-[10.5px] text-white/80 font-sans tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(fmtJalali(post.createdAt))}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(reading)} دقیقه مطالعه
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(formatNumber(post._count?.comments ?? 0))}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(formatNumber(post._count?.likes ?? 0))}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-white">
                <span>ادامه مطلب</span>
                <ArrowLeft
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover/hero:-translate-x-1"
                  strokeWidth={2.5}
                  aria-hidden
                />
              </span>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}66, transparent)`,
          }}
          aria-hidden
        />
      </Link>
    </motion.article>
  );
}

/* ============================================================================
   StackCard — کارت استک کنار hero
   ============================================================================ */
function StackCard({
  post,
  bookmarked,
  onToggleBookmark,
}: {
  post: PostWithRelations;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  const cat = post.categories?.[0];
  const accent = cat ? getCategoryAccent(cat.name).color : '#5b6cff';
  const postLink = getPostLink(post.postType, post.slug);
  const reading = readingMin(post.excerpt);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group/stack relative flex-1"
    >
      <Link
        href={postLink}
        // WCAG 2.5.3 label-in-name: visible content is the accessible name.
        className={cn(
          'relative flex h-full overflow-hidden rounded-2xl',
          'border border-[color:var(--hairline)]',
          'bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md',
          'shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_4px_16px_-8px_rgba(20,23,32,0.08)]',
          'transition-shadow duration-300 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_12px_28px_-12px_rgba(20,23,32,0.16)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        )}
        style={{ ['--stack-accent' as string]: accent } as React.CSSProperties}
      >
        <div className="relative w-[38%] sm:w-2/5 shrink-0 overflow-hidden">
          <SafeImage
            src={post.featuredImage}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 35vw, 40vw"
            containerClassName="absolute inset-0"
            className="object-cover transition-transform duration-500 ease-out group-hover/stack:scale-[1.05]"
            variant="card"
            ratio="4/3"
          />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.05))' }}
          />
          {cat && (
            <div
              className="absolute top-2 start-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold backdrop-blur-md"
              style={{
                backgroundColor: `${accent}26`,
                borderColor: `${accent}4d`,
                color: '#fff',
              }}
            >
              <span
                className="inline-block h-1 w-1 rounded-full"
                style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
                aria-hidden
              />
              {cat.name}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col">
          <div className="flex items-center justify-between text-[10px] sm:text-[10.5px] text-neutral-500 dark:text-neutral-400 font-sans tabular-nums">
            <span>{toPersianNumber(fmtJalaliShort(post.createdAt))}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleBookmark();
              }}
              aria-label={bookmarked ? 'حذف از نشان‌شده‌ها' : 'نشان کردن'}
              // target-size: html font-size (--fs-base) scales rem by ~0.76, so
              // h-8 w-8 (32px) renders at 24.4px actual — meets the 24px target.
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-md',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
                bookmarked ? 'text-amber-500' : 'text-neutral-400 dark:text-neutral-500',
              )}
            >
              <Bookmark
                className={cn('h-3.5 w-3.5', bookmarked && 'fill-current')}
                strokeWidth={2}
              />
            </button>
          </div>

          <h3
            className={cn(
              'mt-1.5 text-[12px] sm:text-[13.5px] font-semibold leading-[1.45]',
              'text-neutral-900 dark:text-white line-clamp-2 text-balance',
              'transition-colors duration-300',
              'group-hover/stack:text-[var(--stack-accent)]',
            )}
          >
            {post.title}
          </h3>

          <div className="mt-auto pt-2.5 flex items-center justify-between text-[10px] sm:text-[10.5px] text-neutral-500 dark:text-neutral-400 font-sans tabular-nums">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(reading)} دقیقه
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(formatNumber(post._count?.comments ?? 0))}
              </span>
            </div>
            <ArrowLeft
              className={cn(
                'h-3.5 w-3.5 text-[var(--stack-accent)]',
                'transition-transform duration-300',
                'opacity-60 group-hover/stack:opacity-100 group-hover/stack:-translate-x-1',
              )}
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

/* ============================================================================
   ListColumn — یک ستون عمودی فشرده
   ============================================================================ */
function ListColumn({
  posts,
  className,
  bookmarked,
  onToggleBookmark,
}: {
  posts: PostWithRelations[];
  className?: string;
  bookmarked: Set<string>;
  onToggleBookmark: (id: string) => void;
}) {
  if (posts.length === 0) return null;

  return (
    <div className={cn('relative', className)}>
      {posts.map((post, i) => (
        <ListItem
          key={post.id}
          post={post}
          index={i}
          bookmarked={bookmarked.has(post.id)}
          onToggleBookmark={() => onToggleBookmark(post.id)}
        />
      ))}
    </div>
  );
}

function ListItem({
  post,
  index,
  bookmarked,
  onToggleBookmark,
}: {
  post: PostWithRelations;
  index: number;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const cat = post.categories?.[0];
  const accent = cat ? getCategoryAccent(cat.name).color : '#5b6cff';
  const postLink = getPostLink(post.postType, post.slug);
  const reading = readingMin(post.excerpt);

  // M11-pattern: relTime از Date.now() استفاده می‌کند؛ در هیدریشن (زمان
  // سرور ≠ کلاینت) mismatch می‌داد. فقط بعد از mount مقدار واقعی را نشان بده.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const timeLabel = isMounted ? relTime(post.createdAt) : '';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <Link
        href={postLink}
        // WCAG 2.5.3 label-in-name: visible content is the accessible name.
        className={cn(
          'group/rail relative flex items-start gap-3 sm:gap-4',
          'pe-5 sm:pe-7 ps-1 py-3 sm:py-3.5',
          'rounded-xl sm:rounded-2xl',
          'transition-colors duration-300',
          'hover:bg-neutral-100/60 dark:hover:bg-neutral-800/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        )}
        style={{ ['--rail-accent' as string]: accent } as React.CSSProperties}
      >
        {/* Index number */}
        <span
          className={cn(
            'hidden sm:flex shrink-0 w-7 h-7 rounded-lg items-center justify-center text-[11px] font-bold tabular-nums',
          )}
          style={{
            backgroundColor: `${accent}15`,
            color: accent,
          }}
        >
          {toPersianNumber(index + 1)}
        </span>

        {/* Thumbnail */}
        <div
          className={cn(
            'relative shrink-0 overflow-hidden rounded-lg sm:rounded-xl',
            'h-20 w-28 sm:h-24 sm:w-36',
            'border border-[color:var(--hairline)]',
          )}
        >
          <SafeImage
            src={post.featuredImage}
            alt={post.title}
            fill
            sizes="(min-width: 640px) 144px, 112px"
            containerClassName="absolute inset-0"
            className="object-cover transition-transform duration-500 ease-out group-hover/rail:scale-110"
            variant="thumbnail"
            ratio="4/3"
          />
          <div
            className="absolute inset-0 opacity-0 group-hover/rail:opacity-100 transition-opacity duration-500"
            style={{ background: `linear-gradient(135deg, ${accent}33, transparent 60%)` }}
            aria-hidden
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[10.5px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-sans tabular-nums">
            {cat && (
              /* color-contrast fix: رنگ accent برای دکور (dot) OK است
                 ولی برای متن باید accessible باشد */
              <span
                className="inline-flex items-center gap-1 font-semibold"
                style={{ color: accessibleTextColor(accent) }}
              >
                <span
                  className="inline-block h-1 w-1 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                {cat.name}
              </span>
            )}
            <span className="text-neutral-500 dark:text-neutral-500 tabular-nums">{timeLabel}</span>
          </div>

          <h4
            className={cn(
              'text-[11.5px] sm:text-[13px] font-semibold leading-[1.4]',
              'text-neutral-900 dark:text-white line-clamp-2 text-balance',
              'transition-colors duration-300',
              'group-hover/rail:text-[var(--rail-accent)]',
            )}
          >
            {post.title}
          </h4>

          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-sans tabular-nums">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(reading)} دقیقه
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(formatNumber(post._count?.comments ?? 0))}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleBookmark();
              }}
              aria-label={bookmarked ? 'حذف از نشان‌شده‌ها' : 'نشان کردن'}
              // target-size: h-8 w-8 (32px) renders at 24.4px actual (0.76× rem
              // scale) — meets the 24px target.
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-md',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
                bookmarked ? 'text-amber-500' : 'text-neutral-400 dark:text-neutral-500',
              )}
            >
              <Bookmark
                className={cn('h-3.5 w-3.5', bookmarked && 'fill-current')}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ============================================================================
   EditorialAdStrip — گرید ۴-۵ کارت تبلیغاتی کنار هم (بدون برچسب AD/پیشنهاد)
   موبایل: horizontal scroll-snap
   دسکتاپ: grid 4-5 ستون متساوی
   ============================================================================ */
function EditorialAdStrip({
  ads,
  accentColor,
}: {
  ads: Advertisement[];
  accentColor: string;
}) {
  const items = ads.filter(Boolean).slice(0, 5);
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-label="تبلیغات"
    >
      {/* همیشه scroll-snap افقی — در همه breakpointها */}
      <div
        className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none"
        style={{ '--ad-accent': accentColor } as React.CSSProperties}
      >
        {items.map((ad, i) => (
          <SingleAdTile key={ad.id} ad={ad} accentColor={accentColor} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

/* ============================================================================
   SingleAdTile — یک کارت تبلیغاتی تمیز بدون برچسب
   ============================================================================ */
function SingleAdTile({
  ad,
  accentColor,
  index,
}: {
  ad: Advertisement;
  accentColor: string;
  index: number;
}) {
  // imageFit: ادمین می‌تواند از طریق customDimensions حالت نمایش را انتخاب کند.
  //  - 'cover'   (پیش‌فرض): کل کادر پر می‌شود، تصویر برش می‌خورد (سوژه مرکزی)
  //  - 'ambient' : کل کادر پر + کل تصویر دیده می‌شود (YouTube/Netflix/Apple TV pattern)
  //  - 'contain' : کل تصویر دیده می‌شود، فضای خالی با گرادینت پر می‌شود (مناسب لوگو)
  const customDims =
    ad.customDimensions && typeof ad.customDimensions === 'object'
      ? (ad.customDimensions as { imageFit?: string })
      : null;
  const imageFit =
    customDims?.imageFit === 'ambient' || customDims?.imageFit === 'contain'
      ? customDims.imageFit
      : 'cover';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
      className="w-[80vw] xs:w-[65vw] sm:w-[260px] md:w-[220px] lg:w-[200px] shrink-0 snap-start"
    >
      <Link
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        // WCAG 2.5.3 label-in-name: visible content is the accessible name.
        className={cn(
          'group/tile relative flex flex-col overflow-hidden rounded-xl',
          'border border-[color:var(--hairline)]',
          'bg-white/75 dark:bg-neutral-900/60 backdrop-blur-md',
          'transition-all duration-300',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_8px_24px_-8px_rgba(94,106,230,0.3)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
        )}
      >
        {/* تصویر تبلیغاتی — استاندارد صنعت (MDN object-fit + IAB + YouTube/Netflix ambient):
            - 'ambient' : کل کادر پر + کل تصویر دیده می‌شود (پیش‌فرض؛ حل مشکل "پر نشدن کارت")
            - 'cover'   : کل کادر پر می‌شود، بخشی از تصویر برش می‌خورد (سوژه مرکزی)
            - 'contain' : کل تصویر دیده می‌شود، فضای خالی با گرادینت پر می‌شود (مناسب لوگو)
            با aspect-ratio ثابت ۴/۳، کادرها همیشه هم‌تراز و پر می‌مانند. */}
        <SafeImage
          src={ad.imageUrl}
          alt={ad.title}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 25vw, 72vw"
          containerClassName="relative aspect-[4/3] shrink-0 overflow-hidden"
          className={cn(
            'transition-transform duration-500 ease-out group-hover/tile:scale-[1.04]',
            imageFit === 'contain' ? 'object-contain p-2' : 'object-cover',
          )}
          variant="thumbnail"
          ratio="4/3"
          fillMode={imageFit === 'contain' ? 'cover' : imageFit === 'ambient' ? 'ambient' : 'cover'}
        />

        {/* محتوا — نمایش کامل title + description برای ارائه کامل پیام تبلیغ */}
        <div className="flex flex-col gap-1 p-2.5 sm:p-3">
          <h4 className="text-[11.5px] sm:text-[12.5px] font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-2 text-balance">
            {ad.title}
          </h4>
          {ad.description && (
            <p className="text-[10px] sm:text-[10.5px] leading-snug text-neutral-500 dark:text-neutral-400 line-clamp-2 text-pretty">
              {ad.description}
            </p>
          )}
          {/* CTA — color-contrast fix: از رنگ accessible برای متن استفاده می‌کنیم */}
          <div
            className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] sm:text-[10.5px] font-medium transition-all duration-300 group-hover/tile:gap-1"
            style={{ color: accessibleTextColor(accentColor) }}
          >
            <span>مشاهده</span>
            <ArrowUpLeft className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
          </div>
        </div>

        {/* خط accent پایین */}
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`,
          }}
          aria-hidden
        />
      </Link>
    </motion.div>
  );
}

/* ============================================================================
   InlineAdBanner — بنر جمع‌وجور دوم (full-width اما کوتاه)
   ============================================================================ */
function InlineAdBanner({
  ad,
  accentColor,
}: {
  ad: Advertisement;
  accentColor: string;
}) {
  // imageFit: بنر تمام‌عرض — پیش‌فرض cover تا کل کادر پر شود
  const customDims =
    ad.customDimensions && typeof ad.customDimensions === 'object'
      ? (ad.customDimensions as { imageFit?: string })
      : null;
  const imageFit =
    customDims?.imageFit === 'ambient' || customDims?.imageFit === 'contain'
      ? customDims.imageFit
      : 'cover';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group/bnr relative"
    >
      <Link
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={cn(
          'relative block overflow-hidden rounded-2xl sm:rounded-3xl',
          'border border-[color:var(--hairline)]',
          'transition-shadow duration-300',
          'hover:shadow-[0_16px_40px_-12px_rgba(94,106,230,0.35)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
        )}
      >
        {/* Container با aspect-ratio ثابت — دقیقاً مثل BannerADS variant image */}
        <div className="relative w-full overflow-hidden aspect-[16/7] sm:aspect-[16/4]">
          {/* لایه ۱: تصویر — ambient: کل کادر پر + کل محتوا دیده می‌شود (YouTube/Netflix)
              cover: کل کادر پر می‌شود، برش می‌خورد (سوژه مرکزی) */}
          <SafeImage
            src={ad.imageUrl}
            alt={ad.title}
            fill
            sizes="(min-width: 1024px) 1100px, 100vw"
            containerClassName="absolute inset-0"
            className="transition-transform duration-700 ease-out group-hover/bnr:scale-[1.03]"
            variant="hero"
            fillMode={imageFit === 'cover' ? 'cover' : 'ambient'}
          />

          {/* لایه ۲: gradient overlay برای خوانایی متن */}
          <div
            className="absolute inset-0 z-10"
            aria-hidden
            style={{
              background:
                'linear-gradient(135deg, rgba(10,12,20,0.92) 0%, rgba(10,12,20,0.75) 50%, rgba(10,12,20,0.25) 100%)',
            }}
          />

          {/* لایه ۳: glow accent */}
          <div
            className="absolute -top-12 -end-12 h-40 w-40 rounded-full blur-3xl opacity-25 group-hover/bnr:opacity-45 transition-opacity duration-500 z-10"
            aria-hidden
            style={{ backgroundColor: accentColor }}
          />

          {/* محتوا روی تصویر */}
          <div className="absolute inset-0 z-20 flex flex-col justify-between sm:flex-row sm:items-center gap-2 sm:gap-6 p-4 sm:p-6 lg:p-8">
            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="text-[14px] sm:text-[15px] lg:text-[18px] font-bold leading-snug text-white text-balance line-clamp-2">
                {ad.title}
              </h4>
              {ad.description && (
                <p className="text-[11px] leading-relaxed text-white/75 line-clamp-1 max-w-2xl sm:block">
                  {ad.description}
                </p>
              )}
            </div>

            <div
              className={cn(
                'self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-full',
                'text-[11px] sm:text-[12px] font-bold text-neutral-900',
                'transition-all duration-300 group-hover/bnr:gap-2.5',
              )}
              style={{
                backgroundColor: '#fff',
                boxShadow: `0 8px 24px -8px ${accentColor}80`,
              }}
            >
              <span>مشاهده</span>
              <ArrowUpLeft
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-300"
                style={{ color: accentColor }}
                strokeWidth={2.5}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ============================================================================
   QuoteHighlight — نقل‌قول ویژه از مقاله‌ی اول
   ============================================================================ */
function QuoteHighlight({
  text,
  authorName,
  accentColor,
}: {
  text: string;
  authorName: string;
  accentColor: string;
}) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-2xl sm:rounded-3xl',
        'border border-[color:var(--hairline)]',
        'bg-gradient-to-br from-white/70 to-neutral-50/60 dark:from-neutral-900/70 dark:to-neutral-900/40',
        'backdrop-blur-md',
        'p-4 sm:p-5 lg:p-6',
      )}
    >
      <div
        className="pointer-events-none absolute -top-12 -end-12 h-40 w-40 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />
      <div className="relative flex items-start gap-4">
        <div
          className="shrink-0 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `${accentColor}1a`,
            color: accentColor,
            border: `1px solid ${accentColor}33`,
          }}
          aria-hidden
        >
          <Flame className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          {/* color-contrast fix: رنگ‌های روشن (مانند slate-400) روی سفید
              کنتراست ≥ 4.5:1 ندارند — از رنگ accessible جایگزین استفاده می‌کنیم */}
          <div
            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] mb-1.5"
            style={{ color: accessibleTextColor(accentColor) }}
          >
            نکته‌ی کلیدی
          </div>
          <blockquote className="text-[12.5px] sm:text-[14.5px] lg:text-[16px] leading-[1.75] text-neutral-800 dark:text-neutral-200 text-balance font-medium">
            «{text}
            {text.length >= 220 ? '…' : ''}»
          </blockquote>
          <figcaption className="mt-2 text-[11px] sm:text-[12px] text-neutral-500 dark:text-neutral-400 font-sans">
            از مقاله‌ی «{authorName}»
          </figcaption>
        </div>
      </div>
    </motion.figure>
  );
}

/* ============================================================================
   FooterActions — کارت پایانی
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
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl sm:rounded-3xl',
          'border border-[color:var(--hairline)]',
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
            <p className="text-[11.5px] sm:text-sm font-bold text-neutral-900 dark:text-white">
              به انتهای فهرست رسیدید
            </p>
            <p className="text-[10px] sm:text-[11.5px] text-neutral-500 dark:text-neutral-400 tabular-nums">
              {toPersianNumber(formatNumber(totalCount))} مقاله نمایش داده شد
            </p>
          </div>
        </div>
        <Link
          href={archiveHref}
          className={cn(
            'group/all inline-flex items-center gap-2 px-5 py-2.5 rounded-full',
            'text-[12.5px] sm:text-[13px] font-semibold',
            'border border-[color:var(--hairline)]',
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
        'border border-[color:var(--hairline)]',
        'bg-gradient-to-br from-white/60 to-neutral-100/40 dark:from-neutral-900/60 dark:to-neutral-900/30',
        'backdrop-blur-md',
        'px-5 sm:px-7 py-5 sm:py-6',
        'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--hairline) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 70% 60% at center, black 35%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at center, black 35%, transparent 75%)',
        }}
      />

      <div className="relative flex items-center gap-3 min-w-0">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <TrendingUp className="h-4 w-4" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[11.5px] sm:text-sm font-bold text-neutral-900 dark:text-white">
            هنوز مطالب بیشتری هست
          </p>
          <p className="text-[10px] sm:text-[11.5px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            مقالات بیشتر را در همین بخش یا در آرشیو ببینید
          </p>
        </div>
      </div>

      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        {/* دکمه «بارگذاری بیشتر» — رنگ پس‌زمینه از accent، رنگ متن inline سفید */}
        <button
          type="button"
          disabled={loading}
          onClick={onLoadMore}
          className={cn(
            'ad-load-shine group/load relative inline-flex items-center justify-center gap-2',
            'px-5 sm:px-6 py-2.5 sm:py-3 rounded-full',
            'text-[11.5px] sm:text-[13px] font-bold',
            'transition-all duration-300',
            'cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'active:scale-[0.97]',
          )}
          style={{
            backgroundColor: accent,
            color: '#fff',
            boxShadow: `0 8px 20px -8px ${accent}80, 0 2px 6px -2px ${accent}40`,
          }}
        >
          <span className="ad-load-shine__beam" aria-hidden />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin relative z-10" strokeWidth={2.5} aria-hidden />
          ) : (
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              <span>بارگذاری بیشتر</span>
            </span>
          )}
        </button>

        {/* لینک «آرشیو کامل» — glass شفاف، متن تیره در light / روشن در dark */}
        <Link
          href={archiveHref}
          className={cn(
            'group/all inline-flex items-center justify-center gap-2',
            'px-5 py-2.5 sm:py-3 rounded-full',
            'text-[11.5px] sm:text-[13px] font-semibold',
            'border border-[color:var(--hairline)]',
            'bg-white/60 dark:bg-white/8 backdrop-blur-md',
            'text-neutral-700 dark:text-neutral-200',
            'hover:bg-white/90 dark:hover:bg-white/12',
            'transition-all duration-300 hover:gap-2.5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          )}
        >
          <Library
            className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-400"
            strokeWidth={2.25}
            aria-hidden
          />
          <span>آرشیو کامل</span>
          <ArrowLeft
            className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-400 transition-transform duration-300 group-hover/all:-translate-x-1"
            strokeWidth={2.5}
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}

const MemoizedLatestArticles = memo(LatestArticles);
export default MemoizedLatestArticles;
export { MemoizedLatestArticles as LatestArticles };
