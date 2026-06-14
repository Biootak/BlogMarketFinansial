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
import { motion, AnimatePresence, useReducedMotion, useInView } from 'framer-motion';
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
import { PulseCard } from './PulseCard';
import { PulseRail } from './PulseRail';
import { AdSlot } from './AdSlot';

type ViewMode = 'bento' | 'rail';

interface PulseBoardProps {
  /** لیست مقالات (همه‌ی دسته‌ها) — حداقل ۸ عدد نیاز داریم برای ۱ hero + ۲ compact + ۵ rail */
  posts: PostWithRelations[];
  categoryNames: string[];
  initialAds: Advertisement[];
  initialTickerData?: MarketTickerItem[];
  totalCount: number;
}

const MAX_VISIBLE_FILTERS = 6;

function normFa(s: string): string {
  return s.replace(/\s+/g, '').replace(/[‌]/g, '').toLowerCase();
}

function dedupeCategories(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of input) {
    const t = n?.trim();
    if (!t) continue;
    const k = normFa(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function PulseBoard({
  posts,
  categoryNames,
  initialAds,
  initialTickerData = [],
  totalCount,
}: PulseBoardProps) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(containerRef, { once: true, margin: '-80px' });

  // ----- Filter state -----
  const categories = useMemo(() => {
    const hasAll = categoryNames.some((c) => normFa(c) === normFa('همه'));
    const list = hasAll ? categoryNames : ['همه', ...categoryNames];
    return dedupeCategories(list);
  }, [categoryNames]);

  const [activeCategory, setActiveCategory] = useState<string>('همه');
  const [viewMode, setViewMode] = useState<ViewMode>('bento');

  // ----- Split posts: hero + 2 compact + 6 rail (از بین پست‌های فعلی) -----
  // (اگه فیلتر اعمال شد، همین آرایه فیلتر می‌شه)
  const filteredPosts = useMemo(() => {
    if (activeCategory === 'همه') return posts;
    return posts.filter((p) =>
      p.categories?.some((c) => normFa(c.name) === normFa(activeCategory)),
    );
  }, [posts, activeCategory]);

  const accent = getCategoryAccent(activeCategory);
  const hero = filteredPosts[0];
  const stack = filteredPosts.slice(1, 3);
  const rail = filteredPosts.slice(3, 9);

  // ----- Filter overflow handling -----
  const visibleFilters = categories.slice(0, MAX_VISIBLE_FILTERS);
  const overflowFilters = categories.slice(MAX_VISIBLE_FILTERS);

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
      className="relative isolate"
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
        <header className="relative px-4 sm:px-7 lg:px-10 pt-5 sm:pt-7 pb-3 sm:pb-5">
          <div className="flex flex-col gap-3.5 sm:gap-4">
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
                    className="h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-700"
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
                  <h2 className="text-lg sm:text-2xl lg:text-[28px] font-bold tracking-tight text-neutral-900 dark:text-white text-balance">
                    آخرین مقالات
                  </h2>
                  <Sparkles
                    className="hidden sm:block h-4 w-4 text-amber-500/80"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </div>
                <p className="mt-0.5 text-[11.5px] sm:text-[13px] text-neutral-500 dark:text-neutral-400 font-vazirmatn">
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
                    { v: 'bento' as ViewMode, label: 'بنتو', Icon: LayoutGrid },
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
                  const isActive = activeCategory === category;
                  const tabAccent = getCategoryAccent(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleCategoryChange(category)}
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
                      <span className="relative z-10">{category}</span>
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
              </div>
            </div>
          </div>
        </header>

        {/* ================================================================== */}
        {/*  Content — Bento / Rail                                            */}
        {/* ================================================================== */}
        <div className="relative px-4 sm:px-7 lg:px-10 pb-5 sm:pb-8 pt-2 sm:pt-3">
          <AnimatePresence mode="wait">
            {filteredPosts.length === 0 ? (
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
                <PulseRail posts={filteredPosts.slice(0, Math.ceil(filteredPosts.length / 2))} />
                <PulseRail
                  posts={filteredPosts.slice(Math.ceil(filteredPosts.length / 2))}
                  className="hidden md:block"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ================================================================== */}
        {/*  Footer — View all link                                            */}
        {/* ================================================================== */}
        <div
          className={cn(
            'relative flex flex-wrap items-center justify-between gap-3',
            'px-4 sm:px-7 lg:px-10 py-3.5 sm:py-4',
            'border-t border-neutral-200/60 dark:border-neutral-800/70',
            'bg-white/30 dark:bg-neutral-900/30 backdrop-blur-sm',
          )}
        >
          <div className="text-[11px] sm:text-[12px] text-neutral-500 dark:text-neutral-400 font-vazirmatn">
            نمایش <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
              {toPersianNumber(formatNumber(filteredPosts.length))}
            </span>{' '}
            مقاله از {toPersianNumber(formatNumber(totalCount))} مقاله
          </div>
          <Link
            href={`/archive${activeCategory === 'همه' ? '' : `/${encodeURIComponent(activeCategory)}`}`}
            className={cn(
              'group/all inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full',
              'text-[11.5px] sm:text-[12.5px] font-semibold',
              'text-white',
              'transition-all duration-300',
              'hover:gap-2.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
            )}
            style={{
              backgroundColor: accent.color,
              boxShadow: `0 4px 14px -4px ${accent.color}80`,
            }}
          >
            مشاهده آرشیو کامل
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover/all:-translate-x-1"
              strokeWidth={2.5}
              aria-hidden
            />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

export default PulseBoard;
