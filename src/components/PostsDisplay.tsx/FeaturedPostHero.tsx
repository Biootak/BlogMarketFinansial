'use client';

/**
 * FeaturedPostHero — نسخه ۲۰۲۶ (v2 — با Parallax + Spotlight)
 *
 * چیدمان Editorial:
 *  - موبایل: تصویر بالا، محتوا پایین
 *  - دسکتاپ: تصویر سمت راست (RTL) — 7/12 عرض، محتوا 5/12
 *
 * تکنیک‌ها:
 *  1.  Parallax تصویر (mouse-based, smooth spring)
 *  2.  Spotlight cursor (نور radial که cursor رو دنبال می‌کنه)
 *  3.  Tilt 3D subtle (3deg)
 *  4.  Glassmorphism overlay (gradient چندلایه)
 *  5.  Shimmer line (فقط hover)
 *  6.  Reading time + date با tabular-nums
 *  7.  View count (real from DB)
 *  8.  Comment count
 *  9.  CTA pill button (با arrow انیمیشنی)
 * 10.  RTL-aware
 * 11.  Keyboard accessible
 * 12.  respects prefers-reduced-motion
 *
 * رنگ‌بندی: refined، بدون saturation بالا
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import {
  Clock,
  Calendar,
  ArrowLeft,
  Sparkles,
  Eye,
  MessageCircle,
} from 'lucide-react';
import type { PostWithRelations } from '@/types/types';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';
import { getPostLink } from '@/lib/getPostLink';
import { TiltCard } from '@/components/ModernTrending/effects/TiltCard';
import { Shimmer } from '@/components/ModernTrending/effects/Shimmer';
import Spotlight from '@/components/Sections/effects/Spotlight';
import { STRIPE_EASE, staggerItem } from '@/lib/motion';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';

interface FeaturedPostHeroProps {
  post: PostWithRelations;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatJalaliDate(d: Date | string): string {
  const date = new Date(d);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function estimateReadingMinutes(text: string | undefined | null): number {
  if (!text) return 4;
  const words = text.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  return Math.max(2, Math.round(words / 150));
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function FeaturedPostHero({
  post,
  className,
}: FeaturedPostHeroProps) {
  const {
    title,
    slug,
    featuredImage,
    categories,
    postType,
    excerpt,
    createdAt,
    viewCount,
    readingTime,
    _count,
  } = post;
  const postLink = getPostLink(postType, slug);

  const [dateStr, setDateStr] = useState<string>('');
  useEffect(() => {
    setDateStr(formatJalaliDate(createdAt));
  }, [createdAt]);

  const readingMin =
    typeof readingTime === 'number' && readingTime > 0
      ? readingTime
      : estimateReadingMinutes(excerpt ?? '');

  /* ---------- Parallax: mouse-based image translation ---------- */
  const cardRef = useRef<HTMLDivElement>(null);
  const xPct = useMotionValue(0);
  const yPct = useMotionValue(0);
  const xSpring = useSpring(xPct, { stiffness: 180, damping: 22 });
  const ySpring = useSpring(yPct, { stiffness: 180, damping: 22 });
  const imgX = useTransform(xSpring, (v) => v * -12);
  const imgY = useTransform(ySpring, (v) => v * -12);

  const [parallaxEnabled, setParallaxEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setParallaxEnabled(fine && !reduce);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!parallaxEnabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    xPct.set((e.clientX - rect.left) / rect.width - 0.5);
    yPct.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    xPct.set(0);
    yPct.set(0);
  };

  return (
    <motion.article
      variants={staggerItem}
      className={cn('group/hero relative h-full', className)}
      dir="rtl"
    >
      <TiltCard intensity={3} perspective={1400} className="h-full w-full">
        <Spotlight
          className="h-full w-full"
          intensity={0.4}
          size={500}
        >
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.4, ease: STRIPE_EASE }}
            className={cn(
              'relative h-full overflow-hidden rounded-3xl',
              'border border-neutral-200/70 dark:border-neutral-800/80',
              'bg-white/70 dark:bg-neutral-900/70',
              'backdrop-blur-md',
              'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_20px_50px_-25px_rgba(20,23,32,0.18)]',
              'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_20px_50px_-25px_rgba(0,0,0,0.5)]',
              'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_32px_64px_-30px_rgba(94,106,230,0.28)]',
              'dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_32px_64px_-30px_rgba(94,106,230,0.32)]',
              'transition-shadow duration-500',
            )}
          >
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0 h-full">
              {/* ============================================================== */}
              {/*  Image column (Parallax)                                       */}
              {/* ============================================================== */}
              <div className="relative lg:col-span-7 aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[480px] overflow-hidden">
                <Link
                  href={postLink}
                  className="absolute inset-0 block"
                  aria-label={title}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{ x: imgX, y: imgY, scale: 1.08 }}
                  >
                    <Image
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      src={featuredImage || '/images/placeholder-large.png'}
                      alt={title}
                      className="object-cover"
                    />
                  </motion.div>

                  {/* Multi-layer glassy gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent 25%, rgba(20,23,32,0.30) 60%, rgba(20,23,32,0.70) 100%)',
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute inset-0 mix-blend-overlay opacity-50"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(94,106,230,0.20) 0%, transparent 50%, rgba(34,211,238,0.12) 100%)',
                    }}
                    aria-hidden
                  />

                  {/* Shimmer line on hover */}
                  <div className="opacity-0 group-hover/hero:opacity-100 transition-opacity duration-700">
                    <Shimmer color="light" />
                  </div>
                </Link>

                {/* Top badges */}
                <div className="absolute top-3 sm:top-5 end-3 sm:end-5 flex flex-col items-end gap-2 z-10">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                      'backdrop-blur-md',
                      'bg-white/85 dark:bg-neutral-900/80',
                      'border border-white/40 dark:border-neutral-700/50',
                      'text-[10px] sm:text-[11px] font-semibold',
                      'text-neutral-900 dark:text-neutral-100',
                      'shadow-sm',
                    )}
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" strokeWidth={2.25} />
                    <span>ویژه</span>
                  </span>

                  {categories && categories.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1.5 max-w-[260px]">
                      <CategoryBadgeList
                        categories={categories.slice(0, 2)}
                        className="flex flex-wrap gap-1.5"
                        itemClass="text-[10px] sm:text-[11px] px-2 py-0.5 font-semibold backdrop-blur-md bg-white/90 dark:bg-neutral-900/85 shadow-sm border border-white/30 dark:border-neutral-700/50"
                        disableLinks
                      />
                    </div>
                  )}
                </div>

                {/* Bottom post-type icon */}
                <div className="absolute bottom-3 sm:bottom-5 start-3 sm:start-5 z-10">
                  <PostTypeFeaturedIcon
                    wrapSize="h-9 w-9 sm:h-11 sm:w-11"
                    iconSize="h-4 w-4 sm:h-5 sm:w-5"
                    postType={postType}
                  />
                </div>
              </div>

              {/* ============================================================== */}
              {/*  Content column                                                */}
              {/* ============================================================== */}
              <div className="relative lg:col-span-5 p-5 sm:p-7 lg:p-8 flex flex-col justify-between gap-5 sm:gap-6">
                <div className="space-y-4">
                  {/* Date + reading time + views + comments */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-vazirmatn">
                    {dateStr && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar
                          className="h-3 w-3 text-neutral-400"
                          strokeWidth={2}
                          aria-hidden
                        />
                        <time
                          className="tabular-nums"
                          dateTime={new Date(createdAt).toISOString()}
                        >
                          {dateStr}
                        </time>
                      </span>
                    )}
                    <span
                      className="text-neutral-300 dark:text-neutral-700"
                      aria-hidden
                    >
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock
                        className="h-3 w-3 text-neutral-400"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span className="tabular-nums">
                        {toPersianNumber(readingMin)} دقیقه مطالعه
                      </span>
                    </span>
                    {typeof viewCount === 'number' && viewCount > 0 && (
                      <>
                        <span
                          className="text-neutral-300 dark:text-neutral-700"
                          aria-hidden
                        >
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Eye
                            className="h-3 w-3 text-neutral-400"
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span className="tabular-nums">
                            {toPersianNumber(formatNumber(viewCount))} بازدید
                          </span>
                        </span>
                      </>
                    )}
                    {typeof _count?.comments === 'number' && _count.comments > 0 && (
                      <>
                        <span
                          className="text-neutral-300 dark:text-neutral-700"
                          aria-hidden
                        >
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MessageCircle
                            className="h-3 w-3 text-neutral-400"
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span className="tabular-nums">
                            {toPersianNumber(_count.comments)} دیدگاه
                          </span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className={cn(
                      'text-xl sm:text-2xl lg:text-[28px] font-bold leading-[1.3]',
                      'text-neutral-900 dark:text-white',
                      'tracking-tight',
                    )}
                  >
                    <Link
                      href={postLink}
                      className={cn(
                        'transition-colors duration-300',
                        'hover:text-primary-700 dark:hover:text-primary-300',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 rounded-md',
                      )}
                      title={title}
                    >
                      {title}
                    </Link>
                  </h3>

                  {/* Excerpt */}
                  {excerpt && (
                    <p
                      className={cn(
                        'text-[13px] sm:text-sm leading-[1.75]',
                        'text-neutral-600 dark:text-neutral-400',
                        'line-clamp-3 sm:line-clamp-4',
                      )}
                    >
                      {excerpt}
                    </p>
                  )}
                </div>

                {/* Author + CTA */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-200/70 dark:border-neutral-800/80">
                  <PostCardMeta
                    hiddenAvatar={false}
                    avatarSize="h-8 w-8 sm:h-9 sm:w-9 text-xs"
                    meta={post}
                    className="text-[12px] sm:text-[13px] text-neutral-700 dark:text-neutral-300"
                  />

                  <Link
                    href={postLink}
                    className={cn(
                      'group/cta relative inline-flex items-center gap-1.5',
                      'h-9 sm:h-10 px-3.5 sm:px-4',
                      'rounded-full',
                      'bg-neutral-900 dark:bg-white',
                      'text-white dark:text-neutral-900',
                      'text-[12px] sm:text-sm font-medium',
                      'shadow-sm hover:shadow-md',
                      'transition-all duration-300',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                      'cursor-pointer',
                    )}
                    aria-label={`ادامه مطلب: ${title}`}
                  >
                    <span>ادامه مطلب</span>
                    <ArrowLeft
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:-translate-x-0.5"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </Link>
                </div>
              </div>
            </div>

            {/* Hairline highlight border — top */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--hairline) 8%, var(--hairline) 92%, transparent)',
              }}
              aria-hidden
            />
          </motion.div>
        </Spotlight>
      </TiltCard>
    </motion.article>
  );
}
