'use client';

/**
 * PulseRail — ریل عمودی (لیست فشرده) از مقالات اخیر (نسخه ۲۰۲۶)
 *
 * تکنیک‌ها:
 *  1.  Connector line عمودی (gradient) که بین آیتم‌ها می‌ره
 *  2.  Time-stamp pill سمت راست (RTL) با شمارنده‌ی انیمیشنی
 *  3.  Index dot که با accent رنگ category رنگ می‌شه
 *  4.  Slide-in reveal با stagger (IntersectionObserver)
 *  5.  Hover lift + image scale
 *  6.  Reading time + comments با PersianDigits و tabular-nums
 *  7.  prefers-reduced-motion respected
 *  8.  RTL کامل
 *
 * چیدمان: یک ستون عمودی — هر آیتم یک ردیف افقی (image کوچک + متن)
 */

import { useEffect, useRef, useState } from 'react';
import { SafeImage } from '@/components/SafeImage';
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from '@/lib/motion-shim';
import { Eye, MessageCircle, ArrowLeft } from 'lucide-react';
import type { PostWithRelations } from '@/types/types';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';
import { getPostLink } from '@/lib/getPostLink';
import { getCategoryAccent } from '@/components/Sections/effects/categoryAccent';
import { STRIPE_EASE, staggerContainer, staggerItem } from '@/lib/motion';

interface PulseRailProps {
  posts: PostWithRelations[];
  className?: string;
}

function relativeTime(d: Date | string): string {
  const diff = Date.now() - new Date(d).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'لحظاتی پیش';
  if (minutes < 60) return `${toPersianNumber(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toPersianNumber(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${toPersianNumber(days)} روز پیش`;
  return new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(
    new Date(d),
  );
}

function RailItem({ post, index }: { post: PostWithRelations; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  const cat = post.categories?.[0];
  const accent = cat ? getCategoryAccent(cat.name).color : '#5b6cff';

  return (
    <motion.div
      ref={ref}
      variants={staggerItem}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative"
    >
      {/* Connector dot */}
      <div
        className="absolute top-5 -end-[7px] sm:-end-[8px] z-10"
        aria-hidden
      >
        <span
          className="block h-3.5 w-3.5 rounded-full"
          style={{
            backgroundColor: accent,
            boxShadow: `0 0 0 3px rgb(var(--background)), 0 0 12px ${accent}80`,
          }}
        />
      </div>

      <Link
        href={getPostLink(post.postType, post.slug)}
        aria-label={post.title}
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
        {/* Index number (subtle) */}
        <span
          className="hidden sm:flex shrink-0 w-7 h-7 rounded-lg items-center justify-center text-[11px] font-bold tabular-nums"
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
            'h-14 w-20 sm:h-[68px] sm:w-[100px]',
            'border border-neutral-200/60 dark:border-neutral-800/80',
          )}
        >
          <SafeImage
            src={post.featuredImage}
            alt={post.title}
            fill
            sizes="120px"
            containerClassName="absolute inset-0"
            className={cn(
              'object-cover transition-transform duration-500 ease-out',
              !reduce && 'group-hover/rail:scale-110',
            )}
            variant="thumbnail"
            ratio="4/3"
          />
          {/* Accent gradient on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover/rail:opacity-100 transition-opacity duration-500"
            style={{
              background: `linear-gradient(135deg, ${accent}33, transparent 60%)`,
            }}
            aria-hidden
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Top row: category + relative time */}
          <div className="flex items-center justify-between gap-2 text-[10.5px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums">
            {cat && (
              <span
                className="inline-flex items-center gap-1 font-semibold"
                style={{ color: accent }}
              >
                <span
                  className="inline-block h-1 w-1 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                {cat.name}
              </span>
            )}
            <span className="text-neutral-500 dark:text-neutral-500 tabular-nums">
              {relativeTime(post.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h4
            className={cn(
              'text-[13px] sm:text-[14.5px] font-semibold leading-[1.45]',
              'text-neutral-900 dark:text-white',
              'line-clamp-2 text-balance',
              'transition-colors duration-300',
              'group-hover/rail:text-[var(--rail-accent)]',
            )}
          >
            {post.title}
          </h4>

          {/* Bottom row: stats + arrow */}
          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(formatNumber(post._count?.comments ?? 0))}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(formatNumber(post._count?.likes ?? 0))}
              </span>
            </div>
            <ArrowLeft
              className={cn(
                'h-3.5 w-3.5 transition-all duration-300',
                hovered
                  ? 'opacity-100 -translate-x-1'
                  : 'opacity-0 translate-x-1',
                'text-[var(--rail-accent)]',
              )}
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function PulseRail({ posts, className }: PulseRailProps) {
  if (posts.length === 0) return null;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={cn('relative', className)}
    >
      {/* Vertical connector line — gradient */}
      <div
        className="absolute top-3 bottom-3 end-[6.5px] sm:end-[7.5px] w-px pointer-events-none"
        aria-hidden
        style={{
          background:
            'linear-gradient(180deg, transparent, var(--hairline) 12%, var(--hairline) 88%, transparent)',
        }}
      />
      {posts.map((post, i) => (
        <RailItem key={post.id} post={post} index={i} />
      ))}
    </motion.div>
  );
}

export default PulseRail;
