'use client';

/**
 * ModernTrendingTopics — نسخه ۲۰۲۶ "موضوعات پرطرفدار"
 *
 * ترکیب تکنیک‌های مدرن:
 * 1. Bento Grid نامتقارن با featured card بزرگ
 * 2. Aurora Background با mesh gradient پویا
 * 3. Magnetic hover effect
 * 4. Spotlight + Tilt3D
 * 5. Shimmer animation روی featured card
 * 6. Animated Counter با spring
 * 7. Trending badge با pulse rings
 * 8. LiveIndicator برای حس real-time
 * 9. Marquee ticker بالای بخش
 * 10. Noise texture برای عمق
 * 11. Glassmorphism (backdrop-blur)
 * 12. Stagger animation با framer-motion
 * 13. رنگ‌بندی پویا بر اساس دسته
 * 14. RTL کامل و Responsive
 *
 * Layout (8 کارت):
 * ┌──────────┬──────┬──────┐
 * │ FEATURED │ S2   │ S3   │
 * │  (4×2)   ├──────┴──────┤
 * │          │   S4 (4×1)  │
 * ├──────────┤             │
 * │   S5     │             │
 * │  (2×1)   ├──────┬──────┤
 * ├──────────┤ S6   │ S7   │
 * │   S8     │      │      │
 * └──────────┴──────┴──────┘
 */

import { motion, type Variants } from 'framer-motion';
import {
  ArrowUpLeft,
  Eye,
  Flame,
  Hash,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, type FC } from 'react';
import type { TaxonomyType } from '@/types/types';
import { cn } from '@/lib/utils';
import { AuroraBackground } from './effects/AuroraBackground';
import { LiveIndicator } from './effects/LiveIndicator';
import { Magnetic } from './effects/Magnetic';
import { Marquee } from './effects/Marquee';
import { Shimmer } from './effects/Shimmer';
import { TextGradient } from './effects/TextGradient';
import { TiltCard } from './effects/TiltCard';

export interface ModernTrendingTopicsProps {
  categories: TaxonomyType[];
  className?: string;
  maxItems?: number;
  viewAllHref?: string;
  title?: string;
  subtitle?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 240, damping: 24 },
  },
};

/** رنگ‌بندی مدرن ۲۰۲۶ — هر دسته یه طیف اختصاصی */
const PALETTES = [
  { from: 'from-violet-500', to: 'to-fuchsia-500', soft: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-300', glow: 'shadow-violet-500/40' },
  { from: 'from-cyan-500', to: 'to-blue-500', soft: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-300', glow: 'shadow-cyan-500/40' },
  { from: 'from-rose-500', to: 'to-orange-500', soft: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-300', glow: 'shadow-rose-500/40' },
  { from: 'from-emerald-500', to: 'to-teal-500', soft: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', glow: 'shadow-emerald-500/40' },
  { from: 'from-amber-500', to: 'to-yellow-500', soft: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300', glow: 'shadow-amber-500/40' },
  { from: 'from-indigo-500', to: 'to-purple-500', soft: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-300', glow: 'shadow-indigo-500/40' },
  { from: 'from-pink-500', to: 'to-red-500', soft: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-300', glow: 'shadow-pink-500/40' },
  { from: 'from-sky-500', to: 'to-indigo-500', soft: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-300', glow: 'shadow-sky-500/40' },
] as const;

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('tabular-nums font-bold', className)}>
      {value.toLocaleString('fa-IR')}
    </span>
  );
}

const ModernTrendingTopics: FC<ModernTrendingTopicsProps> = ({
  categories,
  className = '',
  maxItems = 8,
  viewAllHref = '/archive',
  title = 'موضوعات پرطرفدار',
  subtitle = 'داغ‌ترین ترندهای بازار — به‌روزرسانی لحظه‌ای',
}) => {
  const sorted = useMemo(
    () =>
      [...categories]
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, maxItems),
    [categories, maxItems],
  );

  const colorMap = useMemo(
    () => new Map(sorted.map((c, idx) => [c.id, PALETTES[hashCode(c.id) % PALETTES.length]])),
    [sorted],
  );

  if (sorted.length === 0) return null;

  // featured (rank 1 و 2)
  const [featured, ...rest] = sorted;

  return (
    <section
      className={cn(
        'group/section relative isolate overflow-hidden rounded-3xl',
        'border border-neutral-200/60 dark:border-neutral-800/60',
        'bg-gradient-to-br from-neutral-50 via-white/80 to-neutral-100/60',
        'dark:from-neutral-950 dark:via-neutral-900/80 dark:to-neutral-950',
        'shadow-[0_20px_70px_-20px_rgba(0,0,0,0.15)]',
        'dark:shadow-[0_20px_70px_-20px_rgba(0,0,0,0.6)]',
        className,
      )}
      aria-label="موضوعات پرطرفدار"
    >
      {/* AURORA BACKGROUND */}
      <AuroraBackground />

      {/* TICKER BAR */}
      <div className="relative border-b border-neutral-200/40 bg-white/40 backdrop-blur-sm dark:border-neutral-800/40 dark:bg-neutral-900/40">
        <div className="flex items-center gap-3 px-5 py-2 sm:px-8">
          <LiveIndicator label="LIVE" size="sm" color="rose" />
          <Marquee speed={-50} className="flex-1" pauseOnHover>
            {sorted.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/archive/category/${c.slug}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                  'bg-white/60 text-neutral-700 hover:bg-white',
                  'dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  'transition-colors',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', colorMap.get(c.id)?.soft)} />
                <span className="font-bold">{c.name}</span>
                <span className="text-neutral-400">•</span>
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                  {c.count.toLocaleString('fa-IR')}
                </span>
              </Link>
            ))}
          </Marquee>
        </div>
      </div>

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* آیکون اصلی با glow متحرک */}
            <Magnetic strength={0.3}>
              <div className="relative">
                <motion.div
                  initial={{ rotate: -180, scale: 0 }}
                  whileInView={{ rotate: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                  className={cn(
                    'relative flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center',
                    'rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500',
                    'shadow-[0_8px_30px_-5px_rgba(168,85,247,0.5)]',
                  )}
                >
                  <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-md" strokeWidth={2.5} />
                  <span className="absolute inset-0 rounded-2xl bg-violet-500/40 animate-ping opacity-30" />
                </motion.div>
              </div>
            </Magnetic>

            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
                <TextGradient from="from-violet-600 dark:from-violet-400" via="via-fuchsia-500 dark:via-fuchsia-400" to="to-pink-500 dark:to-pink-400">
                  {title}
                </TextGradient>
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 animate-pulse" />
              </h2>
              <p className="mt-1 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-md">
                {subtitle}
              </p>
            </div>
          </div>

          {/* View All — magnetic button */}
          <Magnetic strength={0.2}>
            <Link
              href={viewAllHref}
              className={cn(
                'group/btn relative inline-flex items-center gap-2 overflow-hidden',
                'h-10 sm:h-11 px-4 sm:px-5 rounded-full',
                'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600',
                'text-white text-sm font-bold',
                'shadow-[0_8px_24px_-8px_rgba(168,85,247,0.6)]',
                'hover:shadow-[0_12px_32px_-8px_rgba(168,85,247,0.8)]',
                'transition-all duration-300',
                'hover:scale-105 active:scale-95',
              )}
            >
              {/* shimmer داخل دکمه */}
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover/btn:translate-x-full transition-transform duration-700"
              />
              <span className="relative">مشاهده همه</span>
              <ArrowUpLeft className="relative h-4 w-4 transition-transform duration-300 group-hover/btn:-translate-x-1 group-hover/btn:-translate-y-1" />
            </Link>
          </Magnetic>
        </div>

        {/* Stats line */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-5 flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400"
        >
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              <AnimatedNumber value={sorted.length} className="text-emerald-600 dark:text-emerald-400" /> موضوع فعال
            </span>
          </span>
          <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-blue-500" />
            <span>مرتب‌سازی بر اساس محبوبیت</span>
          </span>
          <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700 hidden sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>لحظه‌ای</span>
          </span>
        </motion.div>
      </motion.div>

      {/* BENTO GRID */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        className="relative px-5 pb-6 sm:px-8 sm:pb-8"
      >
        <div
          className={cn(
            'grid gap-3 sm:gap-4',
            'grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
            'auto-rows-[minmax(150px,_auto)]',
          )}
        >
          {/* FEATURED CARD (top 1) — بزرگ، 2 ستون در موبایل، 3 ستون در md+ */}
          {featured && (
            <FeaturedCard
              category={featured}
              palette={colorMap.get(featured.id)!}
              rank={1}
              index={0}
              variants={itemVariants}
            />
          )}

          {/* S2 */}
          {rest[0] && (
            <SmallCard
              category={rest[0]}
              palette={colorMap.get(rest[0].id)!}
              rank={2}
              variants={itemVariants}
              colSpan="col-span-1"
            />
          )}

          {/* S3 */}
          {rest[1] && (
            <SmallCard
              category={rest[1]}
              palette={colorMap.get(rest[1].id)!}
              rank={3}
              variants={itemVariants}
              colSpan="col-span-1"
            />
          )}

          {/* S4 — متوسط عرض کامل */}
          {rest[2] && (
            <SmallCard
              category={rest[2]}
              palette={colorMap.get(rest[2].id)!}
              rank={4}
              variants={itemVariants}
              colSpan="col-span-2 md:col-span-2"
            />
          )}

          {/* S5 — featured دوم عرض کامل */}
          {rest[3] && (
            <SmallCard
              category={rest[3]}
              palette={colorMap.get(rest[3].id)!}
              rank={5}
              variants={itemVariants}
              colSpan="col-span-2 md:col-span-4"
              wide
            />
          )}

          {/* S6, S7 */}
          {rest[4] && (
            <SmallCard
              category={rest[4]}
              palette={colorMap.get(rest[4].id)!}
              rank={6}
              variants={itemVariants}
              colSpan="col-span-1"
            />
          )}

          {rest[5] && (
            <SmallCard
              category={rest[5]}
              palette={colorMap.get(rest[5].id)!}
              rank={7}
              variants={itemVariants}
              colSpan="col-span-1"
            />
          )}

          {/* S8 — wide */}
          {rest[6] && (
            <SmallCard
              category={rest[6]}
              palette={colorMap.get(rest[6].id)!}
              rank={8}
              variants={itemVariants}
              colSpan="col-span-2 md:col-span-2"
            />
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default ModernTrendingTopics;

/* -------------------------------------------------------------------------- */
/*  Featured Card — کارت بزرگ ویژه                                            */
/* -------------------------------------------------------------------------- */

function FeaturedCard({
  category,
  palette,
  rank,
  index,
  variants,
}: {
  category: TaxonomyType;
  palette: (typeof PALETTES)[number];
  rank: number;
  index: number;
  variants: Variants;
}) {
  return (
    <motion.div
      variants={variants}
      className="col-span-2 row-span-2 md:col-span-3 md:row-span-2"
    >
      <Magnetic strength={0.15}>
        <TiltCard intensity={6} glare={false} className="h-full">
          <Link
            href={`/archive/category/${category.slug}`}
            className={cn(
              'group/feat relative flex h-full min-h-[280px] sm:min-h-[320px] flex-col justify-between',
              'rounded-3xl overflow-hidden p-5 sm:p-7',
              'border border-white/20 dark:border-white/10',
              'bg-white/70 dark:bg-neutral-900/60',
              'backdrop-blur-xl backdrop-saturate-150',
              'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)]',
              'dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]',
              'hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.3)]',
              'transition-shadow duration-500',
            )}
            aria-label={`دسته ${category.name} - ویژه با ${category.count} مقاله`}
          >
            {/* Gradient overlay پویا */}
            <div
              className={cn(
                'absolute inset-0 opacity-70 transition-opacity duration-500',
                'bg-gradient-to-br',
                palette.from,
                'via-fuchsia-500/20',
                palette.to,
                'group-hover/feat:opacity-90',
              )}
            />

            {/* Shimmer animation */}
            <Shimmer className="opacity-60" />

            {/* Decorative orbs */}
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-black/10 blur-3xl" />

            {/* Top — Rank + badge */}
            <div className="relative z-10 flex items-start justify-between">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 + index * 0.05 }}
                className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/90 text-3xl sm:text-4xl font-black text-neutral-900 shadow-lg"
              >
                #{rank}
              </motion.div>

              <motion.div
                initial={{ scale: 0, rotate: 12 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
                className={cn(
                  'relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5',
                  'bg-white/95 text-rose-600 text-xs font-black uppercase tracking-wider',
                  'shadow-lg',
                )}
              >
                <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping opacity-50" />
                <Flame className="relative h-3.5 w-3.5" />
                <span className="relative">ترند برتر</span>
              </motion.div>
            </div>

            {/* Middle — Title + count */}
            <div className="relative z-10 mt-4">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-md">
                {category.name}
              </h3>
              <p className="mt-2 flex items-center gap-2 text-sm sm:text-base text-white/90 font-medium">
                <Hash className="h-4 w-4" />
                <AnimatedNumber value={category.count} className="text-white" />
                <span>مقاله و تحلیل</span>
              </p>
            </div>

            {/* Bottom — CTA + arrow */}
            <div className="relative z-10 mt-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-xs text-white/80 font-medium">
                <span>برای کاوش کلیک کنید</span>
                <span className="text-lg">←</span>
              </div>
              <motion.div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  'bg-white text-neutral-900 shadow-lg',
                  'transition-transform duration-300',
                  'group-hover/feat:rotate-[-45deg] group-hover/feat:scale-110',
                )}
              >
                <ArrowUpLeft className="h-5 w-5" />
              </motion.div>
            </div>
          </Link>
        </TiltCard>
      </Magnetic>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small Card                                                                 */
/* -------------------------------------------------------------------------- */

function SmallCard({
  category,
  palette,
  rank,
  variants,
  colSpan = 'col-span-1',
  wide = false,
}: {
  category: TaxonomyType;
  palette: (typeof PALETTES)[number];
  rank: number;
  variants: Variants;
  colSpan?: string;
  wide?: boolean;
}) {
  const isTop3 = rank <= 3;

  return (
    <motion.div variants={variants} className={cn(colSpan, wide && 'row-span-1')}>
      <Magnetic strength={0.2}>
        <TiltCard intensity={wide ? 5 : 8} className="h-full">
          <Link
            href={`/archive/category/${category.slug}`}
            className={cn(
              'group/card relative flex h-full flex-col justify-between',
              'rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-5',
              'border border-neutral-200/60 dark:border-neutral-800/60',
              'bg-white/70 dark:bg-neutral-900/60',
              'backdrop-blur-xl backdrop-saturate-150',
              'shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)]',
              'dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.4)]',
              'hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]',
              'transition-shadow duration-500',
              wide ? 'min-h-[120px] sm:min-h-[130px]' : 'min-h-[150px] sm:min-h-[160px]',
            )}
            aria-label={`دسته ${category.name} با ${category.count} مقاله`}
          >
            {/* Gradient overlay */}
            <div
              className={cn(
                'absolute inset-0 opacity-50 transition-opacity duration-500',
                'bg-gradient-to-br',
                palette.from,
                'via-white/5',
                palette.to,
                'group-hover/card:opacity-80',
              )}
            />

            {/* Top row */}
            <div className="relative z-10 flex items-start justify-between">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: rank * 0.04 }}
                className={cn(
                  'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl',
                  palette.soft,
                  palette.text,
                  'ring-1 ring-inset ring-white/10',
                )}
              >
                <Hash className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
              </motion.div>

              {isTop3 && (
                <motion.div
                  initial={{ scale: 0, rotate: -12 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }}
                  className={cn(
                    'relative inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                    'bg-gradient-to-br',
                    palette.from,
                    palette.to,
                    'text-white text-[10px] font-black uppercase tracking-wider',
                    'shadow-md',
                  )}
                >
                  <Flame className="h-2.5 w-2.5" />
                  <span>#{rank}</span>
                </motion.div>
              )}
            </div>

            {/* Middle — title */}
            <div className="relative z-10 mt-3">
              <h3
                className={cn(
                  'font-bold text-neutral-900 dark:text-neutral-50 leading-tight tracking-tight',
                  wide ? 'text-lg sm:text-xl' : 'text-sm sm:text-base',
                )}
              >
                {category.name}
              </h3>
              <p
                className={cn(
                  'mt-1 flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300',
                  wide ? 'text-sm' : 'text-xs sm:text-sm',
                )}
              >
                <AnimatedNumber value={category.count} />
                <span>مقاله</span>
              </p>
            </div>

            {/* Bottom — arrow */}
            <div className="relative z-10 mt-3 flex items-center justify-end">
              <motion.div
                className={cn(
                  'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full',
                  'bg-neutral-900/5 dark:bg-white/5',
                  'text-neutral-700 dark:text-neutral-300',
                  'opacity-0 -translate-x-1',
                  'group-hover/card:opacity-100 group-hover/card:translate-x-0',
                  'transition-all duration-300',
                )}
              >
                <ArrowUpLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </motion.div>
            </div>
          </Link>
        </TiltCard>
      </Magnetic>
    </motion.div>
  );
}
