'use client';

/**
 * CompactPostCard — کارت فشرده برای چیدمان Bento (CSS-driven)
 *
 * - Parallax تصویر با rAF + direct transform
 * - Tilt 3D از TiltCard
 * - Hover meta slide-up با CSS group-hover + transition
 * - Multi-layer glassmorphism overlay
 * - Shimmer line از Shimmer
 * - Spotlight cursor از Spotlight
 * - RTL-aware
 * - prefers-reduced-motion: global rule
 */

import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import { Shimmer } from '@/components/ModernTrending/effects/Shimmer';
import { TiltCard } from '@/components/ModernTrending/effects/TiltCard';
import PostTypeFeaturedIcon from '@/components/PostTypeFeaturedIcon/PostTypeFeaturedIcon';
import Spotlight from '@/components/Sections/effects/Spotlight';
import { getPostLink } from '@/lib/getPostLink';
import { getReadingMinutes } from '@/lib/readingTime';
import { cn, formatNumber, toPersianNumber } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import { ArrowLeft, Calendar, Clock, Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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

export default function CompactPostCard({ post, className }: CompactPostCardProps) {
  const { title, slug, featuredImage, categories, postType, createdAt, viewCount } = post;
  const postLink = getPostLink(postType, slug);

  const [dateStr, setDateStr] = useState<string>('');
  useEffect(() => {
    setDateStr(formatJalaliDate(createdAt));
  }, [createdAt]);

  const readingMin = getReadingMinutes(post);

  // Parallax: rAF-driven smoothing مستقیم روی transform
  // حلقه فقط وقتی پوینتر روی کارت است اجرا می‌شود و به محض settle شدن
  // متوقف می‌شود (قبلاً forever با 60fps می‌چرخید — در کنار TiltCard
  // یعنی ۲ حلقه همزمان روی هر کارت).
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
    const PARALLAX_EPSILON = 0.01;
    const tick = () => {
      const s = stateRef.current;
      s.x += (s.tx - s.x) * 0.12;
      s.y += (s.ty - s.y) * 0.12;
      if (imgRef.current) {
        imgRef.current.style.transform = `translate3d(${(s.x * -8).toFixed(2)}px, ${(s.y * -8).toFixed(2)}px, 0) scale(1.05)`;
      }
      const settled =
        Math.abs(s.x - s.tx) < PARALLAX_EPSILON && Math.abs(s.y - s.ty) < PARALLAX_EPSILON;
      if (settled) {
        // اگر به مرکز برگشته، transform را به حالت پایه برمی‌گردانیم؛
        // اگر hover باشد مقدار فعلی حفظ می‌شود — در هر دو حالت حلقه می‌ایستد.
        if (s.tx === 0 && s.ty === 0) {
          if (imgRef.current) imgRef.current.style.transform = 'scale(1.05)';
        }
        s.x = s.tx;
        s.y = s.ty;
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    const start = () => {
      if (rafId === 0) rafId = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    const el = cardRef.current;
    if (el) {
      el.addEventListener('pointerenter', start);
      el.addEventListener('pointerleave', start);
      el.addEventListener('pointermove', start);
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (el) {
        el.removeEventListener('pointerenter', start);
        el.removeEventListener('pointerleave', start);
        el.removeEventListener('pointermove', start);
      }
      stop();
    };
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
    <article className={cn('group relative h-full', className)} dir="rtl">
      <TiltCard intensity={3} perspective={1400} className="h-full w-full">
        <Spotlight className="h-full w-full" intensity={0.35} size={300}>
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
            <div className="relative aspect-[16/10] sm:aspect-[16/10] md:aspect-[16/10] lg:aspect-[16/11] xl:aspect-[16/10] overflow-hidden">
              <Link href={postLink} className="absolute inset-0 block" aria-label={title}>
                <div ref={imgRef} className="absolute inset-0 will-change-transform">
                  <Image
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    src={featuredImage || '/images/placeholder-large.png'}
                    alt={title}
                    className="object-cover"
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
                <div className="absolute top-2.5 end-2.5 sm:top-3 sm:end-3 z-10 max-w-[160px] sm:max-w-[180px]">
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
                    'text-[13.5px] sm:text-[15px] md:text-base lg:text-[15px] xl:text-base font-bold leading-[1.45] sm:leading-[1.4] text-balance',
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

            <div className="relative">
              <div
                className={cn(
                  'flex items-center justify-between gap-2',
                  'px-3.5 sm:px-5 py-2.5 sm:py-3',
                  'text-[10.5px] sm:text-xs text-neutral-500 dark:text-neutral-400',
                  'font-sans tabular-nums',
                  'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  'group-hover:opacity-0 group-hover:-translate-y-1',
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-neutral-400" strokeWidth={2} aria-hidden />
                  <time dateTime={new Date(createdAt).toISOString()}>{dateStr}</time>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-neutral-400" strokeWidth={2} aria-hidden />
                  {toPersianNumber(readingMin)} دقیقه
                </span>
              </div>

              <div
                className={cn(
                  'absolute inset-0',
                  'flex items-center justify-between gap-2',
                  'px-3.5 sm:px-5 py-2.5 sm:py-3',
                  'bg-gradient-to-t from-primary-50/80 to-transparent',
                  'dark:from-primary-900/20 dark:to-transparent',
                  'text-[11px] sm:text-xs',
                  'text-neutral-700 dark:text-neutral-200',
                  'font-sans tabular-nums',
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
                  <ArrowLeft className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                </Link>
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
