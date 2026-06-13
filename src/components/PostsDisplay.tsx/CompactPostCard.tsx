'use client';

/**
 * CompactPostCard — کارت فشرده برای چیدمان Bento
 *
 * تکنیک‌ها:
 *  1.  Parallax subtle روی تصویر
 *  2.  Tilt 3D (3deg، فقط دسکتاپ)
 *  3.  Hover meta slide-up (category + date از پایین)
 *  4.  Multi-layer glassmorphism overlay
 *  5.  Shimmer line (فقط hover)
 *  6.  Spotlight cursor (نور radial)
 *  7.  RTL-aware
 *  8.  respects prefers-reduced-motion + pointer: coarse
 *
 * استفاده: در PostsList برای 2 mini card کنار Hero.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Calendar,
  Clock,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import type { PostWithRelations } from '@/types/types';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';
import { getPostLink } from '@/lib/getPostLink';
import { TiltCard } from '@/components/ModernTrending/effects/TiltCard';
import { Shimmer } from '@/components/ModernTrending/effects/Shimmer';
import Spotlight from '@/components/Sections/effects/Spotlight';
import { STRIPE_EASE, staggerItem } from '@/lib/motion';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';

interface CompactPostCardProps {
  post: PostWithRelations;
  className?: string;
}

function formatJalaliDate(d: Date | string): string {
  const date = new Date(d);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function estimateReadingMinutes(excerpt: string | undefined | null): number {
  if (!excerpt) return 3;
  const words = excerpt.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  return Math.max(2, Math.round(words / 150));
}

export default function CompactPostCard({ post, className }: CompactPostCardProps) {
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

  /* ---------- Parallax: mouse move = image translate ---------- */
  const cardRef = useRef<HTMLDivElement>(null);
  const xPct = useMotionValue(0);
  const yPct = useMotionValue(0);
  const xSpring = useSpring(xPct, { stiffness: 200, damping: 20 });
  const ySpring = useSpring(yPct, { stiffness: 200, damping: 20 });
  const imgX = useTransform(xSpring, (v) => v * -8);
  const imgY = useTransform(ySpring, (v) => v * -8);

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
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    xPct.set(cx);
    yPct.set(cy);
  };
  const handleMouseLeave = () => {
    xPct.set(0);
    yPct.set(0);
  };

  return (
    <motion.article
      variants={staggerItem}
      className={cn('group relative h-full', className)}
      dir="rtl"
    >
      <TiltCard intensity={3} perspective={1400} className="h-full w-full">
        <Spotlight
          className="h-full w-full"
          intensity={0.35}
          size={300}
        >
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.4, ease: STRIPE_EASE }}
            className={cn(
              'relative h-full overflow-hidden rounded-3xl',
              'border border-neutral-200/70 dark:border-neutral-800/80',
              'bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md',
              'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-12px_rgba(20,23,32,0.12)]',
              'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.4)]',
              'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_20px_40px_-20px_rgba(94,106,230,0.25)]',
              'dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-20px_rgba(94,106,230,0.3)]',
              'transition-shadow duration-500',
            )}
          >
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden">
              <Link
                href={postLink}
                className="absolute inset-0 block"
                aria-label={title}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ x: imgX, y: imgY, scale: 1.05 }}
                >
                  <Image
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    src={featuredImage || '/images/placeholder-large.png'}
                    alt={title}
                    className="object-cover"
                  />
                </motion.div>

                {/* Multi-layer glassy gradient */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(20,23,32,0) 30%, rgba(20,23,32,0.45) 75%, rgba(20,23,32,0.85) 100%)',
                  }}
                  aria-hidden
                />
                <div
                  className="absolute inset-0 mix-blend-overlay opacity-50"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(94,106,230,0.18) 0%, transparent 60%, rgba(34,211,238,0.10) 100%)',
                  }}
                  aria-hidden
                />

                {/* Shimmer line on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <Shimmer color="light" />
                </div>
              </Link>

              {/* Top: post-type icon */}
              <div className="absolute top-3 start-3 z-10">
                <PostTypeFeaturedIcon
                  wrapSize="h-8 w-8"
                  iconSize="h-3.5 w-3.5"
                  postType={postType}
                />
              </div>

              {/* Top-end: categories chip (یکی) */}
              {categories && categories.length > 0 && (
                <div className="absolute top-3 end-3 z-10 max-w-[180px]">
                  <CategoryBadgeList
                    categories={categories.slice(0, 1)}
                    className="flex"
                    itemClass="text-[10px] px-2 py-0.5 font-semibold backdrop-blur-md bg-white/90 dark:bg-neutral-900/85 shadow-sm border border-white/30 dark:border-neutral-700/50"
                    disableLinks
                  />
                </div>
              )}

              {/* Bottom: title on image (روی gradient تیره) */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
                <h3
                  className={cn(
                    'text-base sm:text-lg font-bold leading-[1.4]',
                    'text-white',
                    'line-clamp-2',
                    'drop-shadow-lg',
                    'tracking-tight',
                  )}
                >
                  <Link
                    href={postLink}
                    className={cn(
                      'transition-colors duration-300',
                      'hover:text-primary-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 rounded',
                    )}
                  >
                    {title}
                  </Link>
                </h3>
              </div>
            </div>

            {/* Footer: meta info (با slide-up هنگام hover) */}
            <div className="relative">
              {/* Default state: date + reading time visible */}
              <motion.div
                initial={false}
                className={cn(
                  'flex items-center justify-between gap-2',
                  'px-4 sm:px-5 py-3',
                  'text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400',
                  'font-vazirmatn tabular-nums',
                  'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  'group-hover:opacity-0 group-hover:-translate-y-1',
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Calendar
                    className="h-3 w-3 text-neutral-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <time dateTime={new Date(createdAt).toISOString()}>
                    {dateStr}
                  </time>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock
                    className="h-3 w-3 text-neutral-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {toPersianNumber(readingMin)} دقیقه
                </span>
              </motion.div>

              {/* Hover state: views + CTA slide-up از پایین */}
              <motion.div
                initial={false}
                className={cn(
                  'absolute inset-0',
                  'flex items-center justify-between gap-2',
                  'px-4 sm:px-5 py-3',
                  'bg-gradient-to-t from-primary-50/80 to-transparent',
                  'dark:from-primary-900/20 dark:to-transparent',
                  'text-[11px] sm:text-xs',
                  'text-neutral-700 dark:text-neutral-200',
                  'font-vazirmatn tabular-nums',
                  'opacity-0 translate-y-2',
                  'group-hover:opacity-100 group-hover:translate-y-0',
                  'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Eye
                    className="h-3 w-3 text-primary-600 dark:text-primary-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {toPersianNumber(formatNumber(viewCount ?? 0))} بازدید
                </span>
                <Link
                  href={postLink}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5',
                    'rounded-full',
                    'bg-neutral-900 dark:bg-white',
                    'text-white dark:text-neutral-900',
                    'text-[10px] font-semibold',
                    'hover:opacity-90',
                    'transition-opacity duration-200',
                    'cursor-pointer',
                  )}
                >
                  <span>ادامه</span>
                  <ArrowLeft
                    className="h-2.5 w-2.5"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </Link>
              </motion.div>
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
