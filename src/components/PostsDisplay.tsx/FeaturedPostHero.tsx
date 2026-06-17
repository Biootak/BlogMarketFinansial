'use client';

/**
 * FeaturedPostHero — نسخه ۲۰۲۶ (CSS-driven, no framer-motion runtime)
 *
 * چیدمان Editorial: موبایل تصویر بالا، دسکتاپ تصویر سمت راست (RTL).
 *
 * تکنیک‌ها:
 *  1.  Parallax تصویر (rAF + direct style transform)
 *  2.  Spotlight cursor از Spotlight
 *  3.  Tilt 3D subtle از TiltCard
 *  4.  Glassmorphism overlay
 *  5.  Shimmer line از Shimmer
 *  6.  Reading time + date با tabular-nums
 *  7.  View count + comment count
 *  8.  CTA pill button
 *  9.  RTL-aware
 * 10.  Keyboard accessible
 * 11.  respects prefers-reduced-motion
 */

import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import { Shimmer } from '@/components/ModernTrending/effects/Shimmer';
import { TiltCard } from '@/components/ModernTrending/effects/TiltCard';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import { SafeImage } from '@/components/SafeImage';
import Spotlight from '@/components/Sections/effects/Spotlight';
import { getPostLink } from '@/lib/getPostLink';
import { getReadingMinutes } from '@/lib/readingTime';
import { cn, formatNumber, toPersianNumber } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import { ArrowLeft, Calendar, Clock, Eye, MessageCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface FeaturedPostHeroProps {
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

export default function FeaturedPostHero({ post, className }: FeaturedPostHeroProps) {
  const {
    title,
    slug,
    featuredImage,
    categories,
    postType,
    excerpt,
    createdAt,
    viewCount,
    _count,
  } = post;
  const postLink = getPostLink(postType, slug);

  const [dateStr, setDateStr] = useState<string>('');
  useEffect(() => {
    setDateStr(formatJalaliDate(createdAt));
  }, [createdAt]);

  const readingMin = getReadingMinutes(post);

  /* ---------- Parallax: rAF-driven smoothing مستقیم روی transform ---------- */
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [parallaxEnabled, setParallaxEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setParallaxEnabled(fine && !reduce);
  }, []);

  useEffect(() => {
    if (!parallaxEnabled) return;
    let rafId = 0;
    const tick = () => {
      const s = stateRef.current;
      s.x += (s.tx - s.x) * 0.12;
      s.y += (s.ty - s.y) * 0.12;
      if (imgRef.current) {
        imgRef.current.style.transform = `translate3d(${(s.x * -12).toFixed(2)}px, ${(s.y * -12).toFixed(2)}px, 0) scale(1.08)`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [parallaxEnabled]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!parallaxEnabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    stateRef.current.tx = (e.clientX - rect.left) / rect.width - 0.5;
    stateRef.current.ty = (e.clientY - rect.top) / rect.height - 0.5;
  };
  const handleMouseLeave = () => {
    stateRef.current.tx = 0;
    stateRef.current.ty = 0;
  };

  return (
    <article className={cn('group/hero relative h-full anim-fade-in-up', className)} dir="rtl">
      <TiltCard intensity={3} perspective={1400} className="h-full w-full">
        <Spotlight className="h-full w-full" intensity={0.4} size={500}>
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={cn(
              'relative h-full overflow-hidden rounded-3xl flex flex-col',
              'border border-neutral-200/70 dark:border-neutral-800/80',
              'bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md',
              'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-12px_rgba(20,23,32,0.12)]',
              'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.4)]',
              'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_20px_40px_-20px_rgba(94,106,230,0.25)]',
              'dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-20px_rgba(94,106,230,0.3)]',
              'hover:-translate-y-0.5 transition-[transform,box-shadow] duration-500',
            )}
          >
            {/* Image */}
            <div className="relative aspect-[16/10] sm:aspect-[16/10] md:aspect-[16/10] lg:aspect-[16/11] xl:aspect-[16/10] overflow-hidden">
              <Link href={postLink} className="absolute inset-0 block" aria-label={title}>
                <div ref={imgRef} className="absolute inset-0 will-change-transform">
                  <SafeImage
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    src={featuredImage}
                    alt={title}
                    className="object-cover"
                    containerClassName="absolute inset-0"
                    variant="hero"
                  />
                </div>

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

                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <Shimmer color="light" />
                </div>
              </Link>

              <div className="absolute top-2.5 start-2.5 sm:top-3 sm:start-3 z-10">
                <PostTypeFeaturedIcon
                  wrapSize="h-8 w-8"
                  iconSize="h-3.5 w-3.5"
                  postType={postType}
                />
              </div>

              {categories && categories.length > 0 && (
                <div className="absolute top-2.5 end-2.5 sm:top-3 sm:end-3 z-10 max-w-[180px] sm:max-w-[220px]">
                  <CategoryBadgeList
                    categories={categories.slice(0, 1)}
                    className="flex"
                    itemClass="text-[10px] px-2 py-0.5 font-semibold backdrop-blur-md bg-white/90 dark:bg-neutral-900/85 shadow-sm border border-white/30 dark:border-neutral-700/50"
                    disableLinks
                  />
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4 md:p-5">
                <h3
                  className={cn(
                    'text-[15px] sm:text-[17px] md:text-lg lg:text-[17px] xl:text-lg font-bold leading-[1.45] sm:leading-[1.4] text-balance',
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

            {/* Body */}
            <div className="flex flex-col flex-1 p-4 sm:p-5 md:p-6 gap-3">
              {excerpt && (
                <p
                  className={cn(
                    'text-[12.5px] sm:text-sm leading-relaxed',
                    'text-neutral-600 dark:text-neutral-300',
                    'line-clamp-2 sm:line-clamp-3',
                  )}
                >
                  {excerpt}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" strokeWidth={2} aria-hidden />
                  <time dateTime={new Date(createdAt).toISOString()}>{dateStr}</time>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" strokeWidth={2} aria-hidden />
                  {toPersianNumber(readingMin)} دقیقه
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" strokeWidth={2} aria-hidden />
                  {toPersianNumber(formatNumber(viewCount ?? 0))} بازدید
                </span>
                {_count?.comments !== undefined && (
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" strokeWidth={2} aria-hidden />
                    {toPersianNumber(formatNumber(_count.comments))} نظر
                  </span>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between">
                <Link
                  href={postLink}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full',
                    'bg-neutral-900 dark:bg-white',
                    'text-white dark:text-neutral-900',
                    'text-[11px] sm:text-xs font-semibold',
                    'hover:opacity-90',
                    'transition-opacity duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50',
                  )}
                >
                  <span>ادامه مطلب</span>
                  <ArrowLeft className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                </Link>
                {categories && categories.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500 font-semibold">
                    <Sparkles
                      className="h-3 w-3 text-amber-500/80"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    ویژه
                  </span>
                )}
              </div>
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--hairline) 8%, var(--hairline) 92%, transparent)',
              }}
              aria-hidden
            />
          </div>
        </Spotlight>
      </TiltCard>
    </article>
  );
}
