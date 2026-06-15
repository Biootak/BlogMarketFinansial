'use client';

/**
 * PulseCard — کارت مقاله با حس «زنده» (نسخه ۲۰۲۶ — برای آخرین مقالات)
 *
 * تکنیک‌ها:
 *  1.  Border gradient پویا (conic) که با mouse position می‌چرخه
 *  2.  Inner glow (radial) که دنبال cursor می‌ره
 *  3.  Image scale + reveal overlay در hover
 *  4.  Tilt 3D بسیار subtle (2deg)
 *  5.  Reading time + date با tabular-nums و PersianDigits
 *  6.  Category pill با accent رنگ دسته
 *  7.  Smooth focus ring (دسترس‌پذیری)
 *  8.  respects prefers-reduced-motion + pointer: coarse
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useReducedMotion } from '@/lib/motion-shim';
import { Clock, Eye, MessageCircle, ArrowLeft } from 'lucide-react';
import type { PostWithRelations } from '@/types/types';
import { cn, toPersianNumber, formatNumber } from '@/lib/utils';
import { getPostLink } from '@/lib/getPostLink';
import { getCategoryAccent } from '@/components/Sections/effects/categoryAccent';
import { STRIPE_EASE } from '@/lib/motion';
import { SafeImage } from '@/components/SafeImage';

interface PulseCardProps {
  post: PostWithRelations;
  /** اندازه — بزرگ = hero variant */
  size?: 'default' | 'lg';
  className?: string;
  /** رنگ accent override (اگه ندی، از اولین دسته‌ی مقاله برمی‌داره) */
  accentColor?: string;
}

function formatJalaliDate(d: Date | string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(d));
}

function estimateReadingMinutes(text: string | undefined | null): number {
  if (!text) return 3;
  const words = text.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  return Math.max(2, Math.round(words / 180));
}

export function PulseCard({
  post,
  size = 'default',
  className,
  accentColor,
}: PulseCardProps) {
  const {
    title,
    slug,
    excerpt,
    featuredImage,
    categories,
    postType,
    _count,
    createdAt,
  } = post;

  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // accent — از اولین دسته یا override
  const primaryCategory = categories?.[0];
  const accent =
    accentColor ?? (primaryCategory ? getCategoryAccent(primaryCategory.name).color : '#5b6cff');

  // mouse position → conic gradient origin
  const xPct = useMotionValue(50);
  const yPct = useMotionValue(50);
  const xSpring = useSpring(xPct, { stiffness: 200, damping: 22 });
  const ySpring = useSpring(yPct, { stiffness: 200, damping: 22 });

  // Tilt (subtle)
  const tiltX = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });
  const tiltY = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });
  const [pointerCoarse, setPointerCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPointerCoarse(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pointerCoarse || reduce) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xp = ((e.clientX - rect.left) / rect.width) * 100;
    const yp = ((e.clientY - rect.top) / rect.height) * 100;
    xPct.set(xp);
    yPct.set(yp);
    tiltX.set(((yp - 50) / 50) * -1.5);
    tiltY.set(((xp - 50) / 50) * 1.5);
  };

  const handleMouseLeave = () => {
    xPct.set(50);
    yPct.set(50);
    tiltX.set(0);
    tiltY.set(0);
  };

  const postLink = getPostLink(postType, slug);
  const reading = estimateReadingMinutes(excerpt);
  const isLg = size === 'lg';

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: pointerCoarse || reduce ? 0 : tiltX,
        rotateY: pointerCoarse || reduce ? 0 : tiltY,
        transformPerspective: 1400,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ y: reduce ? 0 : -4 }}
      transition={{ duration: 0.32, ease: STRIPE_EASE }}
      className={cn('group/pulse relative h-full', className)}
    >
      <Link
        href={postLink}
        aria-label={title}
        className={cn(
          'relative block h-full overflow-hidden rounded-2xl sm:rounded-3xl',
          'border border-neutral-200/70 dark:border-neutral-800/80',
          'bg-white/75 dark:bg-neutral-900/70 backdrop-blur-md',
          'shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_8px_24px_-12px_rgba(20,23,32,0.08)]',
          'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.35)]',
          'transition-shadow duration-500',
          'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_20px_40px_-16px_rgba(20,23,32,0.18)]',
          'dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_20px_40px_-16px_rgba(0,0,0,0.55)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'focus-visible:ring-offset-transparent',
          'focus-visible:ring-[var(--pulse-accent)]',
        )}
        style={
          {
            ['--pulse-accent' as string]: accent,
          } as React.CSSProperties
        }
      >
        {/* Conic gradient border (animated with mouse) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/pulse:opacity-100"
          style={{
            background: `conic-gradient(from 0deg at ${xSpring.get()}% ${ySpring.get()}%, ${accent}55, transparent 25%, ${accent}30 50%, transparent 75%, ${accent}55)`,
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: '1px',
            borderRadius: 'inherit',
          }}
        />

        {/* Inner spotlight (follows mouse) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/pulse:opacity-100"
          style={{
            background: `radial-gradient(420px circle at ${xSpring.get()}% ${ySpring.get()}%, ${accent}1a, transparent 55%)`,
          }}
        />

        {/* Image */}
        <div
          className={cn(
            'relative overflow-hidden',
            isLg ? 'aspect-[16/10]' : 'aspect-[16/9]',
          )}
        >
          <SafeImage
            src={featuredImage}
            alt={title}
            fill
            sizes="(min-width: 1280px) 50vw, (min-width: 768px) 70vw, 100vw"
            containerClassName="absolute inset-0"
            className={cn(
              'object-cover transition-transform duration-700 ease-out',
              !reduce && 'group-hover/pulse:scale-[1.05]',
            )}
            ratio={isLg ? '16/10' : '16/9'}
            priority={isLg}
          />

          {/* Gradient overlay (readability) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)',
            }}
            aria-hidden
          />

          {/* Category pill — top right (RTL) */}
          {primaryCategory && (
            <div className="absolute top-3 end-3 sm:top-4 sm:end-4 flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full',
                  'px-2.5 py-1 text-[10.5px] sm:text-[11px] font-semibold',
                  'border backdrop-blur-md',
                )}
                style={{
                  backgroundColor: `${accent}28`,
                  borderColor: `${accent}55`,
                  color: '#fff',
                }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
                  aria-hidden
                />
                {primaryCategory.name}
              </span>
            </div>
          )}

          {/* Reading time — bottom right (RTL) */}
          <div className="absolute bottom-3 end-3 sm:bottom-4 sm:end-4 flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-md px-2 py-1 text-[10.5px] sm:text-[11px] font-medium text-white tabular-nums">
            <Clock className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            <span>
              <span>{toPersianNumber(reading)}</span> دقیقه
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-4 sm:p-5 space-y-2.5">
          {/* Meta row: date + views + comments */}
          <div className="flex items-center justify-between gap-2 text-[10.5px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums">
            <time dateTime={new Date(createdAt).toISOString()}>
              {toPersianNumber(formatJalaliDate(createdAt))}
            </time>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(formatNumber(_count?.comments ?? 0))}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {toPersianNumber(formatNumber(_count?.likes ?? 0))}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3
            className={cn(
              'font-bold tracking-tight text-neutral-900 dark:text-white',
              'text-balance leading-snug line-clamp-2',
              isLg ? 'text-lg sm:text-xl lg:text-2xl' : 'text-[15px] sm:text-base',
            )}
          >
            {title}
          </h3>

          {/* Excerpt — only in lg */}
          {isLg && excerpt && (
            <p className="text-[12.5px] sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-2 sm:line-clamp-3">
              {excerpt.replace(/<[^>]+>/g, ' ').trim().slice(0, 180)}
              {excerpt.length > 180 ? '…' : ''}
            </p>
          )}

          {/* CTA */}
          <div
            className="pt-1 flex items-center gap-1.5 text-[11.5px] sm:text-xs font-semibold tabular-nums"
            style={{ color: accent }}
          >
            <span>ادامه مطلب</span>
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover/pulse:-translate-x-1"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`,
          }}
          aria-hidden
        />
      </Link>
    </motion.div>
  );
}

export default PulseCard;
