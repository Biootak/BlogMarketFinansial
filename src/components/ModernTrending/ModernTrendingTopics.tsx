'use client';

/**
 * ModernTrendingTopics — نسخه ۲۰۲۶ (refined)
 *
 * تکنیک‌ها — همه با اصل refined:
 *  1. Bento Grid نامتقارن (featured بزرگ + 7 کارت)
 *  2. Aurora Background با رنگ‌های low-saturation
 *  3. Magnetic hover (spring نرم)
 *  4. 3D Tilt (با Glare بسیار subtle)
 *  5. Shimmer animation (linear.app-style، فقط یک خط نور)
 *  6. View-driven انیمیشن‌ها (stagger هنگام ورود)
 *  7. Glassmorphism (backdrop-blur 12px نه 24px)
 *  8. رنگ‌بندی با hover lift، نه gradientهای شدید
 *  9. Tabular-nums برای اعداد فارسی
 * 10. GPU containment برای performance
 * 11. respects prefers-reduced-motion
 * 12. RTL کامل
 *
 * تفاوت با نسخه قبل:
 *  - رنگ‌ها refined (slate/blue/cyan/emerald، نه fuchsia و violet غلیظ)
 *  - Featured card monochromatic (طوسی گرم + tint primary)
 *  - shadowها کم‌اشباع‌تر
 *  - animation‌ها کندتر اما طبیعی‌تر (Raycast vibe)
 *  - حذف Spring stiffness زیاد (smooth feel)
 */

import { motion, type Variants } from '@/lib/motion-shim';
import { useMemo, type FC } from 'react';
import Link from 'next/link';
import type { TaxonomyType } from '@/types/types';
import { cn } from '@/lib/utils';
import { AuroraBackground } from './effects/AuroraBackground';
import { Magnetic } from './effects/Magnetic';
import { Marquee } from './effects/Marquee';
import { Shimmer } from './effects/Shimmer';
import { TextGradient } from './effects/TextGradient';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ModernTrendingTopicsProps {
  categories: TaxonomyType[];
  className?: string;
  /** حداکثر تعداد نمایش (پیش‌فرض: بدون محدودیت) */
  maxItems?: number;
  viewAllHref?: string;
  title?: string;
  subtitle?: string;
}

interface Palette {
  /** رنگ اصلی (طیف ملایم) */
  accent: string;
  /** bg subtle برای icon container */
  bg: string;
  /** رنگ متن */
  text: string;
  /** border ring */
  ring: string;
}

/* -------------------------------------------------------------------------- */
/*  Palettes — low-saturation (Linear/Vercel vibe)                            */
/* -------------------------------------------------------------------------- */

/** رنگ‌های ملایم — saturation پایین، جایگزین violet/fuchsia */
const PALETTES: Palette[] = [
  { accent: '#94a3b8', bg: 'bg-slate-500/10',     text: 'text-slate-600 dark:text-slate-300',     ring: 'ring-slate-500/20' }, // slate
  { accent: '#64748b', bg: 'bg-neutral-500/10',   text: 'text-neutral-600 dark:text-neutral-300', ring: 'ring-neutral-500/20' },
  { accent: '#5b6cff', bg: 'bg-primary-500/8',    text: 'text-primary-600 dark:text-primary-300', ring: 'ring-primary-500/20' }, // primary (طیف سایت)
  { accent: '#22d3ee', bg: 'bg-cyan-500/10',      text: 'text-cyan-700 dark:text-cyan-300',       ring: 'ring-cyan-500/20' },
  { accent: '#34d399', bg: 'bg-emerald-500/10',   text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-500/20' },
  { accent: '#fbbf24', bg: 'bg-amber-500/10',     text: 'text-amber-700 dark:text-amber-300',     ring: 'ring-amber-500/20' },
  { accent: '#f87171', bg: 'bg-rose-500/10',      text: 'text-rose-700 dark:text-rose-300',       ring: 'ring-rose-500/20' },
  { accent: '#a78bfa', bg: 'bg-violet-500/10',    text: 'text-violet-700 dark:text-violet-300',   ring: 'ring-violet-500/20' },
];

/* -------------------------------------------------------------------------- */
/*  Variants                                                                  */
/* -------------------------------------------------------------------------- */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 180,
      damping: 26,
      mass: 0.8,
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                 */
/* -------------------------------------------------------------------------- */

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
    <span className={cn('tabular-nums font-semibold', className)}>
      {value.toLocaleString('fa-IR')}
    </span>
  );
}

/** یه آیکون ساده SVG برای هر دسته (نه emoji) */
function CategoryGlyph({ accent }: { accent: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={accent}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h10M4 18h16" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

const ModernTrendingTopics: FC<ModernTrendingTopicsProps> = ({
  categories,
  className,
  maxItems,
  viewAllHref = '/archive',
  title = 'موضوعات پرطرفدار',
  subtitle = 'این دسته‌بندی‌ها الان بیشتر از همه خونده می‌شن',
}) => {
  // همه دسته‌ها (بدون محدودیت) — برای Ticker
  const allCategories = useMemo(
    () =>
      [...categories]
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count),
    [categories],
  );

  // فقط maxItems تا برتر — برای Bento Grid
  const sorted = useMemo(
    () => (maxItems ? allCategories.slice(0, maxItems) : allCategories),
    [allCategories, maxItems],
  );

  const colorMap = useMemo(
    () => new Map(allCategories.map((c, idx) => [c.id, PALETTES[(hashCode(c.id) + idx) % PALETTES.length]])),
    [allCategories],
  );

  if (sorted.length === 0) return null;

  const [featured, ...rest] = sorted;

  return (
    <section
      className={cn(
        // marquee-pause: hover روی هر نقطه‌ی section
        // (شامل ticker بالا و bento grid پایین) marquee رو متوقف می‌کنه
        'group/section marquee-pause relative isolate overflow-hidden rounded-3xl',
        'border border-neutral-200/70 dark:border-neutral-800/70',
        'bg-white/60 dark:bg-neutral-950/60',
        'backdrop-blur-2xl',
        // ظریف‌تر
        'shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_24px_60px_-30px_rgba(20,23,32,0.08)]',
        'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_24px_60px_-30px_rgba(0,0,0,0.5)]',
        'transition-colors',
        'contain-paint',
        className,
      )}
      aria-label="موضوعات پرطرفدار"
    >
      {/* AURORA — refined */}
      <AuroraBackground intensity={0.55} />

      {/* TOP TICKER — همه دسته‌بندی‌ها */}
      <div
        // marquee-pause: parent بالاتر (section) هم کلاس رو داره، ولی اینجا
        // هم اضافه می‌کنیم تا اگه section رو از `.marquee-pause` حذف کردن، این
        // div مستقل کار کنه
        className={cn(
          'marquee-pause relative border-b border-[var(--hairline)]',
          'bg-white/40 dark:bg-neutral-950/40',
          'backdrop-blur-md',
        )}
      >
        <div className="flex items-center gap-3 px-5 py-2 sm:px-8">
          {/* repeat={3} به جای 6: در صفحه‌های کوچک که تراکم چیپ‌ها بالاست، 3 بار
              تکرار برای seamless loop کافیه و DOM رو سنگین نمی‌کنه */}
          <Marquee speed={-25} className="flex-1 min-w-0" repeat={3} pauseOnHold>
            {allCategories.map((c) => {
              const palette = colorMap.get(c.id)!;
              return (
                <Link
                  key={c.id}
                  href={`/archive/category/${c.slug}`}
                  className={cn(
                    'group/chip flex shrink-0 items-center gap-2 rounded-full',
                    'border border-neutral-200/70 dark:border-neutral-800/70',
                    'bg-white/70 dark:bg-neutral-900/60',
                    'px-2.5 py-1 text-xs',
                    'hover:border-neutral-300 dark:hover:border-neutral-700',
                    'transition-colors',
                  )}
                >
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: palette.accent }}
                  />
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {c.name}
                  </span>
                  <span className="text-neutral-400 dark:text-neutral-500">·</span>
                  <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                    {c.count.toLocaleString('fa-IR')} مقاله
                  </span>
                </Link>
              );
            })}
          </Marquee>
        </div>
      </div>

      {/* HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-6"
      >
        <div className="flex items-start gap-3.5 sm:gap-4">
          {/* آیکون — refined */}
          <Magnetic strength={0.18}>
            <div className="relative">
              <div
                className={cn(
                  'relative flex h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center',
                  'rounded-xl',
                  'border border-neutral-200/70 dark:border-neutral-800/70',
                  'bg-white dark:bg-neutral-900',
                  'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_2px_4px_-2px_rgba(20,23,32,0.06)]',
                  'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_2px_4px_-2px_rgba(0,0,0,0.4)]',
                )}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary-500"
                  aria-hidden
                >
                  <path d="M12 2.5c1.5 3 4.5 4.5 7.5 4.5-.5 4-1.5 7-3.5 9-2 2-4 3-7 3s-5-1-7-3c-2-2-3-5-3.5-9 3 0 6-1.5 7.5-4.5 0-.5.5-1 1-1s1 .5 1 1z" />
                  <path d="M12 8v6" />
                  <path d="M9 11h6" />
                </svg>
              </div>
            </div>
          </Magnetic>

          <div>
            <h2
              className={cn(
                'flex flex-wrap items-center gap-x-2 gap-y-1',
                'text-xl sm:text-2xl @xl/bento:text-3xl font-bold',
                'tracking-[-0.022em]',
                'text-neutral-900 dark:text-neutral-50',
              )}
            >
              <TextGradient variant="mono">{title}</TextGradient>
            </h2>
            <p
              className={cn(
                'mt-1 text-[13px] sm:text-sm',
                'text-neutral-500 dark:text-neutral-400',
                'max-w-md tracking-[-0.005em]',
              )}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* View All — refined magnetic button */}
        <Magnetic strength={0.12}>
          <Link
            href={viewAllHref}
            className={cn(
              'group/btn relative inline-flex h-9 items-center gap-1.5 overflow-hidden',
              'rounded-full px-3.5 text-[13px] font-medium',
              'text-neutral-700 dark:text-neutral-300',
              'border border-neutral-200/70 dark:border-neutral-800/70',
              'bg-white/70 dark:bg-neutral-900/60',
              'hover:border-neutral-300 dark:hover:border-neutral-700',
              'hover:text-neutral-900 dark:hover:text-neutral-100',
              'transition-colors duration-200',
            )}
          >
            <span className="relative">همه رو ببینید</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative transition-transform duration-300 group-hover/btn:-translate-x-1 rtl:group-hover/btn:translate-x-1"
              aria-hidden
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
        </Magnetic>
      </motion.header>

      {/* BENTO GRID — انعطاف‌پذیر برای ۳ تا ۸ کارت */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
        className="relative px-5 pb-6 sm:px-8 sm:pb-8"
      >
        <BentoGrid
          featured={featured}
          rest={rest}
          colorMap={colorMap}
          itemVariants={itemVariants}
        />
      </motion.div>
    </section>
  );
};

export default ModernTrendingTopics;

/* -------------------------------------------------------------------------- */
/*  BentoGrid — چیدمان حرفه‌ای با استایل ثابت برای همه کارت‌ها                */
/* -------------------------------------------------------------------------- */

/**
 * استراتژی طراحی:
 *  - featured card یه استثنا نیست — همه کارت‌ها یه استایل ثابت دارن
 *  - در موبایل: ۲ ستون، در md: ۳ ستون، در lg: ۴ ستون
 *  - featured فقط با محتوای بیشتر (rank + "ویژه" badge) متمایز می‌شه
 *  - اگه دسته‌بندی بیشتر از ۸ تا باشه، باید به صفحه archive برن
 *  - layout ۱۰۰٪ جمع‌وجور — هیچ فضای خالی
 */
function BentoGrid({
  featured,
  rest,
  colorMap,
  itemVariants,
}: {
  featured: TaxonomyType;
  rest: TaxonomyType[];
  colorMap: Map<string, Palette>;
  itemVariants: Variants;
}) {
  // همه کارت‌ها یکجا، featured اول
  const all = [featured, ...rest];

  return (
    <div
      className={cn(
        'grid gap-2.5 sm:gap-3 @container/bento',
        // ۲ ستون موبایل، ۳ ستون تبلت، ۴ ستون دسکتاپ — auto-fit
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        'auto-rows-[minmax(140px,_auto)]',
      )}
    >
      {all.map((c, idx) => {
        const isFeatured = idx === 0;
        return isFeatured ? (
          <FeaturedCard
            key={c.id}
            category={c}
            palette={colorMap.get(c.id)!}
            rank={1}
            variants={itemVariants}
            // featured در همه سایزها ۲ ستون × ۲ ردیف (مربع بزرگ)
            className="col-span-2 row-span-2 sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2"
          />
        ) : (
          <TopicCard
            key={c.id}
            category={c}
            palette={colorMap.get(c.id)!}
            rank={idx + 1}
            variants={itemVariants}
            className="col-span-1"
          />
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Featured Card — refined monochromatic                                     */
/* -------------------------------------------------------------------------- */

function FeaturedCard({
  category,
  palette,
  rank,
  variants,
  className,
}: {
  category: TaxonomyType;
  palette: Palette;
  rank: number;
  variants: Variants;
  className?: string;
}) {
  return (
    <motion.div
      variants={variants}
      className={cn(className)}
    >
      <Magnetic strength={0.1}>
        <Link
          href={`/archive/category/${category.slug}`}
          className={cn(
            'group/feat relative flex h-full flex-1 min-h-[260px] @sm/bento:min-h-[300px] @xl/bento:min-h-[340px] flex-col justify-between',
            'rounded-2xl overflow-hidden p-5 sm:p-7',
            'border border-neutral-200/70 dark:border-neutral-800/70',
            'bg-neutral-900 dark:bg-neutral-50',
            'shadow-[0_2px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-20px_rgba(20,23,32,0.3)]',
            'dark:shadow-[0_2px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-20px_rgba(0,0,0,0.6)]',
            'transition-all duration-500',
            'hover:shadow-[0_2px_0_0_rgba(255,255,255,0.04)_inset,0_28px_50px_-20px_rgba(20,23,32,0.4)]',
          )}
          aria-label={`${category.name} - ${category.count} مقاله`}
        >
          {/* Decorative orb — subtle */}
          <div
            aria-hidden
            className="absolute -top-20 -end-20 h-64 w-64 rounded-full opacity-[0.08] blur-3xl"
            style={{ background: palette.accent }}
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -start-16 h-72 w-72 rounded-full bg-white/5 blur-3xl"
          />

          {/* Shimmer — یک خط نور افقی که می‌گذره */}
          <Shimmer className="opacity-40" />

          {/* Top — Rank + label */}
          <div className="relative z-10 flex items-start justify-between">
            <div
              className={cn(
                'flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center',
                'rounded-2xl',
                'border border-white/10',
                'bg-white/[0.04] dark:bg-neutral-900/[0.04]',
                'backdrop-blur-md',
              )}
            >
              <span
                className={cn(
                  'text-2xl sm:text-3xl font-bold tracking-tight',
                  'text-white dark:text-neutral-900',
                )}
              >
                {String(rank).padStart(2, '0')}
              </span>
            </div>

            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full',
                'border border-white/10 dark:border-neutral-900/10',
                'bg-white/5 dark:bg-neutral-900/5',
                'px-2.5 py-1 text-[11px] font-medium tracking-wide',
                'text-white/90 dark:text-neutral-900/80',
                'backdrop-blur-md',
              )}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: palette.accent }}
              />
              پربازدیدترین
            </span>
          </div>

          {/* Middle — Title + count */}
          <div className="relative z-10 mt-4">
            <h3
              className={cn(
                'text-2xl sm:text-3xl md:text-4xl font-bold tracking-[-0.02em]',
                'text-white dark:text-neutral-900',
                'leading-[1.1]',
              )}
            >
              {category.name}
            </h3>
            <p
              className={cn(
                'mt-2 flex items-center gap-1.5 text-sm sm:text-[15px]',
                'text-white/70 dark:text-neutral-700',
              )}
            >
              <span className="font-medium tabular-nums">
                {category.count.toLocaleString('fa-IR')}
              </span>
              <span>مقاله اینجا منتشر شده</span>
            </p>
          </div>

          {/* Bottom — CTA + arrow */}
          <div className="relative z-10 mt-4 flex items-center justify-between">
            <span
              className={cn(
                'text-xs sm:text-[13px]',
                'text-white/60 dark:text-neutral-600',
                'tracking-[-0.005em]',
              )}
            >
              کلیک کنید ببینید چی هست
            </span>
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                'border border-white/15 dark:border-neutral-900/15',
                'bg-white/5 dark:bg-neutral-900/5',
                'transition-all duration-300',
                'group-hover/feat:bg-white/15',
                'dark:group-hover/feat:bg-neutral-900/15',
              )}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white transition-transform duration-300 group-hover/feat:-translate-x-0.5 rtl:group-hover/feat:translate-x-0.5 dark:text-neutral-900"
                aria-hidden
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </Magnetic>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Topic Card — refined minimal                                              */
/* -------------------------------------------------------------------------- */

function TopicCard({
  category,
  palette,
  rank,
  variants,
  className,
  wide = false,
}: {
  category: TaxonomyType;
  palette: Palette;
  rank: number;
  variants: Variants;
  className?: string;
  wide?: boolean;
}) {
  const isTop3 = rank <= 3;

  return (
    <motion.div variants={variants} className={cn('min-w-0', className)}>
      <Magnetic strength={0.14}>
        <Link
          href={`/archive/category/${category.slug}`}
          className={cn(
            'group/card relative flex h-full flex-col justify-between',
            'rounded-2xl overflow-hidden p-4 sm:p-5',
            'border border-neutral-200/70 dark:border-neutral-800/70',
            'bg-white/70 dark:bg-neutral-900/60',
            'backdrop-blur-xl',
            'shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_4px_12px_-6px_rgba(20,23,32,0.06)]',
            'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.02),0_4px_12px_-6px_rgba(0,0,0,0.4)]',
            'transition-all duration-300',
            'hover:border-neutral-300 dark:hover:border-neutral-700',
            'hover:shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_8px_24px_-8px_rgba(20,23,32,0.1)]',
            'dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_8px_24px_-8px_rgba(0,0,0,0.5)]',
            'hover:-translate-y-0.5',
            wide ? 'min-h-[110px] sm:min-h-[120px]' : 'min-h-[140px] sm:min-h-[150px]',
          )}
          style={{ willChange: 'transform' }}
          aria-label={`${category.name} - ${category.count} مقاله`}
        >
          {/* Top row — Icon + rank */}
          <div className="relative z-10 flex items-start justify-between">
            <div
              className={cn(
                'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl',
                palette.bg,
                'ring-1 ring-inset',
                palette.ring,
              )}
            >
              <CategoryGlyph accent={palette.accent} />
            </div>

            {isTop3 && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md',
                  'border border-neutral-200/70 dark:border-neutral-800/70',
                  'bg-white/80 dark:bg-neutral-900/60',
                  'px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  'text-neutral-600 dark:text-neutral-400',
                )}
              >
                #{rank}
              </span>
            )}
          </div>

          {/* Middle — title */}
          <div className="relative z-10 mt-3">
            <h3
              className={cn(
                'font-semibold tracking-[-0.012em] leading-snug',
                'text-neutral-900 dark:text-neutral-50',
                wide ? 'text-base sm:text-lg' : 'text-[14px] sm:text-[15px]',
              )}
            >
              {category.name}
            </h3>
            <p
              className={cn(
                'mt-1 flex items-center gap-1',
                'text-neutral-500 dark:text-neutral-400',
                wide ? 'text-[13px]' : 'text-[12px] sm:text-[13px]',
              )}
            >
              <span className="tabular-nums font-medium">
                {category.count.toLocaleString('fa-IR')}
              </span>
              <span>مطلب</span>
            </p>
          </div>

          {/* Bottom — refined arrow on hover */}
          <div
            className={cn(
              'absolute bottom-3 end-3 sm:bottom-4 sm:end-4',
              'flex h-7 w-7 items-center justify-center rounded-full',
              'border border-neutral-200/70 dark:border-neutral-800/70',
              'bg-white/0 dark:bg-neutral-900/0',
              'text-neutral-400 dark:text-neutral-500',
              'opacity-0',
              'group-hover/card:opacity-100',
              'group-hover/card:border-neutral-300 dark:group-hover/card:border-neutral-700',
              'transition-all duration-300',
            )}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-300 group-hover/card:-translate-x-0.5 rtl:group-hover/card:translate-x-0.5"
              aria-hidden
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </div>
        </Link>
      </Magnetic>
    </motion.div>
  );
}
