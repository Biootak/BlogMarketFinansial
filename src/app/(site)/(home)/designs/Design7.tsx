'use client';

/**
 * Design7 — Editorial Spotlight
 * ----------------------------------------------------------------------------
 * نسخه ارتقا یافته اسلایدر هوم با ۷ تکنیک جدید:
 *
 *   1. Ticker Bar زنده در بالا (نرخ ارز، طلا، رمزارز)
 *   2. Dynamic Theme — رنگ‌بندی بر اساس دسته‌بندی هر پست
 *   3. Sentiment Badge (▲ صعودی / ▼ نزولی / ◆ خنثی)
 *   4. Reading Progress Bar زیر اسلاید فعال
 *   5. Quick-Read Overlay با excerpt
 *   6. Keyboard Navigation (←/→/Space)
 *   7. Pause on Hover + شماره‌گذاری (۰۱/۰۵)
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Pause,
  Play,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import type { PostWithRelations, ExchangeRate, RateListData, RateItem } from '@/types/types';
import Avatar from '@/components/Avatar/Avatar';
import { getPostLink } from '@/lib/getPostLink';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import type { MarketRateItem } from '@/actions/marketTickerRates';
import MarketRatesTickerBar from './MarketRatesTickerBar';
import SentimentBadge from './SentimentBadge';
import MagneticSpotlightCard from './MagneticSpotlightCard';
import CompactRateBridge from './CompactRateBridge';
import {
  getCategoryTheme,
  detectSentiment,
  type CategoryTheme,
  type SentimentType,
} from './categoryTheme';

type Props = {
  initialPosts: PostWithRelations[];
  rates?: ExchangeRate[];
  marketRates?: MarketRateItem[];
  rateLists?: RateListData[];
  className?: string;
};

const AUTO_PLAY_INTERVAL = 6000; // ۶ ثانیه

export default function Design7({ initialPosts, rates, marketRates, rateLists, className = '' }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide
  useEffect(() => {
    if (isPaused || initialPosts.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % initialPosts.length);
    }, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, initialPosts.length]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % initialPosts.length);
  }, [initialPosts.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + initialPosts.length) % initialPosts.length);
  }, [initialPosts.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // اگر فوکوس روی input/textarea هست، غیرفعال کن
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'ArrowLeft') {
        // در RTL: ArrowLeft = قبلی
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  if (!initialPosts?.length) return <CardLarge1Skeleton />;

  const mainPost = initialPosts[activeIndex];
  const otherPosts = initialPosts.filter((_, i) => i !== activeIndex);

  // تم و sentiment پست اصلی
  const mainTheme: CategoryTheme = useMemo(
    () => getCategoryTheme(mainPost.categories?.[0]?.slug, mainPost.categories?.[0]?.name),
    [mainPost],
  );
  const mainSentiment: SentimentType = useMemo(
    () => detectSentiment(mainPost.title, mainPost.excerpt),
    [mainPost],
  );

  // تم برای side cards
  const sideThemes = useMemo(
    () =>
      otherPosts.map((p) => getCategoryTheme(p.categories?.[0]?.slug, p.categories?.[0]?.name)),
    [otherPosts],
  );
  const sideSentiments = useMemo(
    () => otherPosts.map((p) => detectSentiment(p.title, p.excerpt)),
    [otherPosts],
  );

  // پیدا کردن نرخ‌های حواله مرتبط (از RateList های فعال)
  // به صورت flat list از RateItem برای نمایش چرخشی
  const transferRateItems: RateItem[] = useMemo(() => {
    if (!rateLists || rateLists.length === 0) return [];

    const cat = (
      mainPost.categories?.[0]?.slug ||
      mainPost.categories?.[0]?.name ||
      ''
    ).toLowerCase();

    // فیلتر کردن RateList های مرتبط بر اساس دسته‌بندی پست
    let relevantLists = rateLists;
    if (/حواله|مoney.?transfer|ارسال/.test(cat)) {
      // اگه دسته خودش حواله هست، همه رو نشون بده
      relevantLists = rateLists;
    } else if (/دلار|دلار آمریکا|usd/.test(cat)) {
      // اولویت لیست‌هایی که توشون USD هست
      relevantLists = rateLists.filter((l) =>
        l.rates.some((r) => /دلار|usd|افغانی/i.test(r.title)),
      );
      if (relevantLists.length === 0) relevantLists = rateLists;
    } else if (/یورو|eur/.test(cat)) {
      relevantLists = rateLists.filter((l) =>
        l.rates.some((r) => /یورو|eur/i.test(r.title)),
      );
      if (relevantLists.length === 0) relevantLists = rateLists;
    } else if (/افغان|افغانستان|afghani/.test(cat)) {
      relevantLists = rateLists.filter((l) =>
        l.rates.some((r) => /افغانی|afghani|افغانستان/i.test(r.title)),
      );
      if (relevantLists.length === 0) relevantLists = rateLists;
    }

    // از همه لیست‌های مرتبط، RateItem ها رو جمع می‌کنیم
    const items: RateItem[] = [];
    for (const list of relevantLists) {
      for (const item of list.rates) {
        // حذف duplicate title
        if (!items.some((i) => i.title === item.title)) {
          items.push(item);
        }
      }
      if (items.length >= 12) break;
    }
    return items;
  }, [rateLists, mainPost]);

  // morphTick حذف شد — قبلاً هر ۴ ثانیه یه tick می‌زد که باعث re-render کل می‌شد
  // الان viewCount مستقیماً نمایش داده می‌شه (بدون morph)

  // State برای pause کردن auto-rotate bridge نرخ‌ها از بیرون (مثلاً hover)
  const [isBridgePaused, setIsBridgePaused] = useState(false);

  return (
    <section className={`relative ${className}`}>
      {/* ─── Ticker Bar بالای اسلایدر — نرخ‌های بازار واقعی (طلا، ارز، سکه) ─── */}
      {marketRates && marketRates.length > 0 && (
        <div className="mb-3 sm:mb-4">
          <MarketRatesTickerBar rates={marketRates} />
        </div>
      )}

      {/* ─── Main Container ─── */}
      <div
        className="relative rounded-3xl overflow-hidden bg-neutral-50 dark:bg-neutral-900"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Animated theme glow border */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mainPost.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={`absolute inset-0 bg-gradient-to-br ${mainTheme.gradient} opacity-100 pointer-events-none`}
          />
        </AnimatePresence>

        {/* Inner subtle noise/texture (radial dots) */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

        {/* Inner card (slightly inset for depth) */}
        <div className="relative m-1.5 sm:m-2 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* ─── Main Featured Card ─── */}
            <div className="lg:col-span-8 relative">
              <AnimatePresence mode="wait">
                <MagneticSpotlightCard
                  key={mainPost.id}
                  tiltStrength={0.4}
                  enableHolographic
                  className="relative group h-[360px] sm:h-[440px] lg:h-[520px] overflow-hidden rounded-2xl"
                  innerClassName="relative h-full"
                >
                  <motion.div
                    key={`motion-${mainPost.id}`}
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.99 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className="relative h-full w-full"
                  >
                  {/* Image */}
                  <Link
                    href={getPostLink(mainPost.postType, mainPost.slug)}
                    className="absolute inset-0"
                    aria-label={mainPost.title}
                  >
                    <Image
                      src={mainPost.featuredImage || '/images/placeholder-large.png'}
                      alt={mainPost.title}
                      fill
                      className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      priority
                    />
                  </Link>

                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20" />
                  <motion.div
                    key={`overlay-${mainPost.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className={`absolute inset-0 bg-gradient-to-tr ${mainTheme.gradient} mix-blend-overlay opacity-30`}
                  />

                  {/* Top Badge Group */}
                  <motion.div
                    className="absolute top-4 sm:top-6 start-4 sm:start-6 z-20 flex items-center gap-2 flex-wrap max-w-[calc(100%-2rem)]"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {/* Live + Featured badge */}
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md text-white text-[11px] sm:text-xs font-bold rounded-full border border-white/20 shadow-lg">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                      </span>
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      ویژه
                    </span>

                    {/* Sentiment badge */}
                    <SentimentBadge sentiment={mainSentiment} size="sm" />
                  </motion.div>

                  {/* ─── Rotating Compact Transfer Rate Bridge — چرخش خودکار بین نرخ‌های حواله ─── */}
                  {transferRateItems.length > 0 && (
                    <motion.div
                      key={`bridge-${activeIndex}`}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ delay: 0.35, type: 'spring', stiffness: 200 }}
                      className="absolute top-14 sm:top-16 start-4 sm:start-6 z-20"
                    >
                      <CompactRateBridge
                        rates={transferRateItems}
                        externalPaused={isBridgePaused}
                        onHoverChange={setIsBridgePaused}
                      />
                    </motion.div>
                  )}

                  {/* Top-right: index counter + pause toggle */}
                  <motion.div
                    className="absolute top-4 sm:top-6 end-4 sm:end-6 z-20 flex items-center gap-2"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsPaused((p) => !p);
                      }}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                      aria-label={isPaused ? 'ادامه پخش خودکار' : 'توقف پخش خودکار'}
                    >
                      {isPaused ? (
                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" />
                      ) : (
                        <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" />
                      )}
                    </button>
                    <div className="px-2.5 py-1 bg-black/40 backdrop-blur-md text-white text-[11px] sm:text-xs font-mono font-bold rounded-md border border-white/10 tabular-nums">
                      {String(activeIndex + 1).padStart(2, '۰')}/
                      {String(initialPosts.length).padStart(2, '۰')}
                    </div>
                  </motion.div>

                  {/* Content */}
                  <div className="absolute bottom-0 start-0 end-0 p-4 sm:p-6 lg:p-8 z-10">
                    {/* Category */}
                    {mainPost.categories?.[0] && (
                      <motion.span
                        key={`cat-${mainPost.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 mb-3 ${mainTheme.badge} text-white text-[11px] sm:text-xs font-bold rounded-lg shadow-lg ${mainTheme.glow}`}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {mainPost.categories[0].name}
                      </motion.span>
                    )}

                    {/* Title */}
                    <motion.h2
                      key={`title-${mainPost.id}`}
                      className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-white leading-tight mb-4 line-clamp-2 drop-shadow-lg"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.35 }}
                    >
                      <Link
                        href={getPostLink(mainPost.postType, mainPost.slug)}
                        className="hover:opacity-90 transition-opacity"
                      >
                        {mainPost.title}
                      </Link>
                    </motion.h2>

                    {/* Excerpt — Quick-Read (فقط در lg+) */}
                    {mainPost.excerpt && (
                      <motion.p
                        key={`excerpt-${mainPost.id}`}
                        className="hidden lg:block text-sm xl:text-base text-white/85 leading-relaxed mb-4 line-clamp-2 max-w-2xl"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        {mainPost.excerpt}
                      </motion.p>
                    )}

                    {/* Meta Info */}
                    <motion.div
                      key={`meta-${mainPost.id}`}
                      className="flex items-center gap-3 sm:gap-4 flex-wrap"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.45 }}
                    >
                      {/* Author */}
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          sizeClass="h-9 w-9 sm:h-10 sm:w-10"
                          radius="rounded-full"
                          imgUrl={mainPost.author.profile?.avatar || mainPost.author.image}
                          userName={mainPost.author.name || ''}
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-white text-xs sm:text-sm">
                            {mainPost.author.name}
                          </span>
                          <span className="text-white/60 text-[10px] sm:text-xs flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {new Date(mainPost.createdAt).toLocaleDateString('fa-IR')}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <span className="w-px h-6 bg-white/20" />

                      {/* Views */}
                      {mainPost.viewCount > 0 && (
                        <div className="flex items-center gap-1.5 text-white/70 text-xs sm:text-sm">
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="tabular-nums">
                            {mainPost.viewCount.toLocaleString('fa-IR')}
                          </span>
                        </div>
                      )}

                      {/* Reading time estimate (اگر excerpt داشته باشیم) */}
                      {mainPost.excerpt && (
                        <div className="flex items-center gap-1.5 text-white/70 text-xs sm:text-sm">
                          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="tabular-nums">
                            {Math.max(1, Math.ceil(mainPost.excerpt.length / 300))} دقیقه
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* ─── Stats Cockpit — اتاق فرمان آمار زنده (فقط lg+) ─── */}
                  <motion.div
                    key={`cockpit-${mainPost.id}`}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 30, opacity: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                    className="absolute bottom-4 sm:bottom-6 start-4 sm:start-6 z-20 hidden lg:flex items-stretch gap-0 backdrop-blur-xl bg-black/40 border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    {/* Live Pulse Cell */}
                    <div className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 border-l border-white/10">
                      <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold">
                        Live
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-300">
                          ON
                        </span>
                      </span>
                    </div>

                    {/* Views Cell — Morphing */}
                    {mainPost.viewCount > 0 && (
                      <div className="flex flex-col items-start justify-center gap-0.5 px-3 py-2 border-l border-white/10 min-w-[80px]">
                        <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" /> بازدید
                        </span>
                        <span className="text-sm font-bold text-white tabular-nums">
                          {mainPost.viewCount.toLocaleString('fa-IR')}
                        </span>
                      </div>
                    )}

                    {/* Reading Time Cell */}
                    {mainPost.excerpt && (
                      <div className="flex flex-col items-start justify-center gap-0.5 px-3 py-2 border-l border-white/10 min-w-[70px]">
                        <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold flex items-center gap-1">
                          <BookOpen className="w-2.5 h-2.5" /> زمان
                        </span>
                        <span className="text-sm font-bold text-white flex items-baseline gap-0.5 tabular-nums">
                          {Math.max(1, Math.ceil(mainPost.excerpt.length / 300))}
                          <span className="text-[9px] text-white/50 font-medium">دقیقه</span>
                        </span>
                      </div>
                    )}

                    {/* Sentiment Mini-Cell */}
                    <div className="flex flex-col items-start justify-center gap-0.5 px-3 py-2 min-w-[70px]">
                      <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold">
                        روند
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          mainSentiment === 'bullish'
                            ? 'text-emerald-300'
                            : mainSentiment === 'bearish'
                              ? 'text-rose-300'
                              : 'text-amber-300'
                        }`}
                      >
                        {mainSentiment === 'bullish'
                          ? '▲ صعودی'
                          : mainSentiment === 'bearish'
                            ? '▼ نزولی'
                            : '◆ خنثی'}
                      </span>
                    </div>
                  </motion.div>

                  {/* Reading Progress Bar — پایین کارت */}
                  <div className="absolute bottom-0 start-0 end-0 h-1 bg-white/10 z-20 overflow-hidden">
                    <motion.div
                      key={`progress-${mainPost.id}-${activeIndex}-${isPaused ? 'p' : 'r'}`}
                      initial={{ width: '0%' }}
                      animate={{
                        width: isPaused ? '0%' : '100%',
                      }}
                      transition={{
                        duration: isPaused ? 0 : AUTO_PLAY_INTERVAL / 1000,
                        ease: 'linear',
                      }}
                      className={`h-full bg-gradient-to-r ${mainTheme.gradient}`}
                    />
                  </div>
                  </motion.div>
                </MagneticSpotlightCard>
              </AnimatePresence>
            </div>

            {/* ─── Side Cards ─── */}
            <div className="lg:col-span-4 flex flex-row lg:flex-col gap-2 sm:gap-3 p-2 sm:p-3 bg-neutral-100/80 dark:bg-neutral-950/80 backdrop-blur-sm">
              {otherPosts.slice(0, 2).map((post, i) => {
                const theme = sideThemes[i];
                const sentiment = sideSentiments[i];
                return (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex-1 h-[140px] sm:h-[170px] lg:h-auto lg:flex-1"
                    onClick={() => setActiveIndex(initialPosts.findIndex((p) => p.id === post.id))}
                  >
                    <MagneticSpotlightCard
                      tiltStrength={0.25}
                      enableHolographic
                      className="relative group h-full w-full rounded-2xl overflow-hidden cursor-pointer bg-neutral-200 dark:bg-neutral-900"
                      innerClassName="relative h-full"
                    >
                    {/* Image */}
                    <Image
                      src={post.featuredImage || '/images/placeholder-large.png'}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                    />

                    {/* Theme tint overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-tr ${theme.gradient} mix-blend-overlay opacity-25 group-hover:opacity-40 transition-opacity`}
                    />

                    {/* Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    {/* Quick-Read Overlay on Hover (lg+) */}
                    <AnimatePresence>
                      {post.excerpt && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hidden lg:flex absolute inset-0 bg-black/92 backdrop-blur-sm p-4 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <p className="text-white/95 text-sm leading-relaxed line-clamp-5 text-center">
                            {post.excerpt}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Top badges row */}
                    <div className="absolute top-2 start-2 end-2 z-10 flex items-center justify-between gap-1.5">
                      <SentimentBadge sentiment={sentiment} size="sm" showLabel={false} />
                      {post.categories?.[0] && (
                        <span
                          className={`px-2 py-0.5 ${theme.badge} text-white text-[9px] font-bold rounded-md shadow-md line-clamp-1 max-w-[60%]`}
                        >
                          {post.categories[0].name}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 start-0 end-0 p-3 sm:p-4 z-10">
                      <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug group-hover:text-white transition-colors">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar
                          sizeClass="h-5 w-5 sm:h-6 sm:w-6"
                          radius="rounded-full"
                          imgUrl={post.author.profile?.avatar || post.author.image}
                          userName={post.author.name || ''}
                        />
                        <span className="text-white/70 text-[10px] sm:text-xs truncate">
                          {post.author.name}
                        </span>
                        {post.viewCount > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                            <span className="text-white/60 text-[10px] sm:text-xs flex items-center gap-1 tabular-nums">
                              <Eye className="w-2.5 h-2.5" />
                              {post.viewCount > 999
                                ? `${(post.viewCount / 1000).toFixed(1)}K`
                                : post.viewCount.toLocaleString('fa-IR')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Active indicator stripe on left */}
                    <div
                      className={`absolute top-0 bottom-0 start-0 w-1 bg-gradient-to-b ${theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
                    />
                    </MagneticSpotlightCard>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Navigation Arrows ───
             چیدمان ریسپانسیو:
             • موبایل (پیش‌فرض): دکمه‌ها 36px، کنار هم در پایین-وسط، فاصله از لبه 12px
             • تبلت (sm 640px+): دکمه‌ها 44px، در طرفین، وسط عمودی
             • دسکتاپ (lg 1024px+): دکمه‌ها 48px، در طرفین با فاصله بیشتر
        */}
        <div
          className="absolute z-30 flex items-center pointer-events-none
                     /* موبایل: پایین-وسط، دکمه‌ها کوچک */
                     bottom-3 start-1/2 -translate-x-1/2 gap-2
                     /* تبلت: طرفین، وسط عمودی */
                     sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:start-0 sm:end-0 sm:translate-x-0 sm:justify-between sm:gap-0 sm:px-3
                     /* دسکتاپ: فاصله بیشتر از لبه */
                     lg:px-4"
        >
          <button
            type="button"
            onClick={goNext}
            aria-label="اسلاید بعدی"
            className="pointer-events-auto flex items-center justify-center rounded-full
                       bg-black/40 backdrop-blur-md border border-white/25 text-white
                       shadow-xl transition-all duration-300 ease-out
                       hover:bg-black/60 hover:scale-110 active:scale-95
                       /* موبایل */
                       w-9 h-9
                       /* تبلت */
                       sm:w-11 sm:h-11
                       /* دسکتاپ */
                       lg:w-12 lg:h-12"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </button>
          <button
            type="button"
            onClick={goPrev}
            aria-label="اسلاید قبلی"
            className="pointer-events-auto flex items-center justify-center rounded-full
                       bg-black/40 backdrop-blur-md border border-white/25 text-white
                       shadow-xl transition-all duration-300 ease-out
                       hover:bg-black/60 hover:scale-110 active:scale-95
                       /* موبایل */
                       w-9 h-9
                       /* تبلت */
                       sm:w-11 sm:h-11
                       /* دسکتاپ */
                       lg:w-12 lg:h-12"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </button>
        </div>
      </div>

      {/* ─── Bottom Dot Indicators + Keyboard Hint ─── */}
      <div className="flex items-center justify-center gap-3 mt-3 sm:mt-4 px-2">
        <div className="flex items-center gap-1.5">
          {initialPosts.map((post, i) => {
            const theme = i === activeIndex
              ? getCategoryTheme(post.categories?.[0]?.slug, post.categories?.[0]?.name)
              : null;
            return (
              <button
                type="button"
                key={post.id}
                onClick={() => setActiveIndex(i)}
                aria-label={`رفتن به اسلاید ${i + 1}`}
                className={`group relative h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-10' : 'w-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600'
                }`}
              >
                {i === activeIndex && theme && (
                  <motion.div
                    layoutId="activeDotIndicator"
                    className={`absolute inset-0 rounded-full bg-gradient-to-r ${theme.gradient}`}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Keyboard hint — فقط در sm+ */}
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-500 tabular-nums">
          <kbd className="px-1.5 py-0.5 bg-neutral-200/60 dark:bg-neutral-800/60 rounded border border-neutral-300/60 dark:border-neutral-700/60 font-mono">
            ←
          </kbd>
          <kbd className="px-1.5 py-0.5 bg-neutral-200/60 dark:bg-neutral-800/60 rounded border border-neutral-300/60 dark:border-neutral-700/60 font-mono">
            →
          </kbd>
          <span>برای جابه‌جایی</span>
        </div>
      </div>
    </section>
  );
}
