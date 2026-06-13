'use client';

import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, Flame, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useMemo, type FC } from 'react';
import type { TaxonomyType } from '@/types/types';
import { cn } from '@/lib/utils';
import { PopularTopicCard } from './components/PopularTopicCard';
import { getCategoryColor } from './utils/categoryColors';

export interface PopularTopicsBentoProps {
  categories: TaxonomyType[];
  className?: string;
  /** تعداد حداکثر نمایش (پیش‌فرض: 8) */
  maxItems?: number;
  /** لینک صفحه archive */
  viewAllHref?: string;
  /** عنوان بخش */
  title?: string;
  /** توضیح کوتاه */
  subtitle?: string;
}

/**
 * کانتینر اصلی "موضوعات پرطرفدار" — طراحی مدرن ۲۰۲۶
 *
 * ویژگی‌ها:
 * - Bento Grid Layout (نامتقارن، با کارت‌های بزرگ و کوچک)
 * - Aurora Background با mesh gradient
 * - Stagger animation موقع mount
 * - Glassmorphism
 * - کاملاً Responsive (mobile, tablet, desktop)
 * - Dark Mode Support
 * - RTL Support
 *
 * الگوی نمایش (8 کارت):
 * - کارت اول: featured (2x1 در md، 4x1 در sm)
 * - کارت دوم: 1x1
 * - کارت سوم: 1x1
 * - کارت چهارم: featured (2x1 در md)
 * - کارت‌های بعدی: 1x1
 */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 280,
      damping: 24,
    },
  },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const PopularTopicsBento: FC<PopularTopicsBentoProps> = ({
  categories,
  className = '',
  maxItems = 8,
  viewAllHref = '/archive',
  title = 'موضوعات پرطرفدار',
  subtitle = 'پربازدیدترین و داغ‌ترین موضوعات این هفته را کاوش کنید',
}) => {
  // Sort by count (بیشترین اول) و slice
  const sortedCategories = useMemo(() => {
    return [...categories]
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, maxItems);
  }, [categories, maxItems]);

  // pre-compute colors
  const colorMap = useMemo(() => {
    return new Map(
      sortedCategories.map((c, idx) => [c.id, getCategoryColor(c.color, idx, c.id)]),
    );
  }, [sortedCategories]);

  if (sortedCategories.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-3xl',
        'border border-neutral-200/60 dark:border-neutral-800/60',
        'bg-gradient-to-br from-neutral-50 via-white to-neutral-50',
        'dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950',
        'shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)]',
        className,
      )}
      aria-label="موضوعات پرطرفدار"
    >
      {/* ================== AURORA BACKGROUND ================== */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Blob 1 — purple/violet */}
        <motion.div
          className="absolute -top-32 -right-32 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-400/20 to-transparent blur-3xl"
          animate={{
            x: [0, 60, 0],
            y: [0, 40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Blob 2 — blue/cyan */}
        <motion.div
          className="absolute -bottom-32 -left-32 h-[350px] w-[350px] rounded-full bg-gradient-to-tr from-blue-500/25 via-cyan-400/15 to-transparent blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Blob 3 — pink/rose (مرکز) */}
        <motion.div
          className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-rose-500/20 via-pink-400/10 to-transparent blur-3xl"
          animate={{
            x: ['-50%', '-30%', '-50%'],
            y: ['-50%', '-70%', '-50%'],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Grid pattern — overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* ================== HEADER ================== */}
      <motion.header
        variants={headerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="relative px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* آیکون اصلی با gradient متحرک */}
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              whileInView={{ rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring' as const, stiffness: 200, damping: 18 }}
              className="relative flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-violet-500/30"
            >
              <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-white" strokeWidth={2.5} />
              {/* pulse ring */}
              <span className="absolute inset-0 rounded-2xl bg-violet-500/40 animate-ping opacity-30" />
            </motion.div>

            <div>
              <h2 className="flex items-center gap-2 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
                {title}
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 animate-pulse" />
              </h2>
              <p className="mt-1 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-md">
                {subtitle}
              </p>
            </div>
          </div>

          {/* View All button — سمت چپ (در RTL) */}
          <Link
            href={viewAllHref}
            className={cn(
              'group inline-flex items-center gap-1.5 sm:gap-2',
              'h-9 sm:h-10 px-3 sm:px-4 rounded-full',
              'bg-neutral-900/5 dark:bg-white/5',
              'hover:bg-neutral-900/10 dark:hover:bg-white/10',
              'text-sm font-semibold',
              'text-neutral-700 dark:text-neutral-300',
              'border border-neutral-200/60 dark:border-neutral-800/60',
              'transition-all duration-300',
              'hover:scale-105 active:scale-95',
            )}
          >
            <span>مشاهده همه</span>
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>
        </div>

        {/* Stats — line پایین هدر */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-4 flex items-center gap-4 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400"
        >
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              {sortedCategories.length} موضوع فعال
            </span>
          </span>
          <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <span>
            به‌روزرسانی لحظه‌ای
          </span>
        </motion.div>
      </motion.header>

      {/* ================== BENTO GRID ================== */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        className="relative px-5 sm:px-8 pb-6 sm:pb-8"
      >
        <div
          className={cn(
            'grid gap-3 sm:gap-4',
            // mobile: 2 ستون
            'grid-cols-2',
            // tablet: 4 ستون
            'md:grid-cols-4',
            // grid auto-rows
            'auto-rows-[minmax(140px,_auto)]',
          )}
        >
          {sortedCategories.map((category, idx) => {
            // featured pattern — کارت‌های اول و چهارم بزرگ
            const isFeatured = idx === 0 || idx === 3;
            // در حالت featured، در md دو ستون رو اشغال می‌کنه
            const colSpan = isFeatured
              ? 'col-span-2 md:col-span-2'
              : 'col-span-1';
            // در featured اول، یه ردیف کامل باشه
            const rowSpan = idx === 0 ? 'row-span-2 md:row-span-2' : 'row-span-1';

            return (
              <motion.div
                key={category.id}
                variants={itemVariants}
                className={cn(colSpan, rowSpan)}
              >
                <PopularTopicCard
                  taxonomy={category}
                  index={idx}
                  featured={isFeatured}
                  colorConfig={colorMap.get(category.id)}
                  rank={idx + 1}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Empty slot placeholder — اگه تعداد فرد بود */}
        {sortedCategories.length % 2 !== 0 && (
          <motion.div
            variants={itemVariants}
            className="mt-3 sm:mt-4 flex items-center justify-center h-[140px] rounded-2xl border border-dashed border-neutral-300/60 dark:border-neutral-800/60"
          >
            <Link
              href={viewAllHref}
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              کاوش بیشتر ←
            </Link>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};

export default PopularTopicsBento;
