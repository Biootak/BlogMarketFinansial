'use client';

/**
 * AdSlot — اسلات‌های تبلیغات داخل بخش آخرین مقالات
 *
 * - AdSlot: نوار افقی اصلی (inline) — همراه thumbnail و CTA
 * - AdBanner: بنر عریض با cover image تمام‌عرض — برای ریتم چیدمان
 *
 * هر دو:
 *  - Mouse-tracked 3D perspective (CSS vars) — سبک و بدون framer-motion per frame
 *  - Conic-gradient hover border
 *  - prefers-reduced-motion respected
 *  - semantic + rel="sponsored"
 */

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from '@/lib/motion-shim';
import { ExternalLink, Sparkles, Megaphone, ArrowLeft } from 'lucide-react';
import type { Advertisement } from '@/types/types';
import { cn } from '@/lib/utils';
import { STRIPE_EASE } from '@/lib/motion';

interface AdCommonProps {
  ad: Advertisement;
  accentColor?: string;
  className?: string;
}

/* ---------- helpers ---------- */

function useMouseSpotlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const onMove = (e: React.MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', String((e.clientX - rect.left) / rect.width));
    el.style.setProperty('--my', String((e.clientY - rect.top) / rect.height));
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '0.5');
    el.style.setProperty('--my', '0.5');
  };
  return { ref, onMove, onLeave };
}

/* ============================================================================
   AdSlot — نوار افقی اصلی (همراه thumbnail و CTA pill)
   ============================================================================ */
export function AdSlot({ ad, accentColor = '#5b6cff', className }: AdCommonProps) {
  const reduce = useReducedMotion();
  const { ref, onMove, onLeave } = useMouseSpotlight<HTMLAnchorElement>();
  if (!ad) return null;

  return (
    <motion.a
      ref={ref}
      href={ad.linkUrl}
      target="_blank"
      rel="noopener sponsored"
      aria-label={`تبلیغ: ${ad.title}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.3, ease: STRIPE_EASE }}
      className={cn(
        'group/ad ad-spotlight-3d relative flex items-stretch overflow-hidden',
        'rounded-2xl sm:rounded-3xl',
        'border border-[color:var(--hairline)]',
        'bg-white/[0.55] dark:bg-neutral-900/55 backdrop-blur-md',
        'min-h-[96px] sm:min-h-[112px]',
        'transition-shadow duration-300',
        'hover:shadow-[0_12px_32px_-12px_rgba(94,106,230,0.35)]',
        className,
      )}
    >
      <div className="ad-spotlight-inner flex items-stretch w-full">
        {/* Accent gradient strip — animated shine */}
        <div className="relative w-1 sm:w-1.5 shrink-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${accentColor}aa, ${accentColor}33)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-0 group-hover/ad:opacity-100 transition-opacity duration-300"
            style={{
              background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)`,
              animation: 'ad-cta-shimmer 1.6s linear infinite',
            }}
          />
        </div>

        <div className="relative flex flex-1 items-center gap-3 sm:gap-4 p-3 sm:p-4">
          {/* Thumbnail */}
          <div className="relative h-14 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-lg sm:rounded-xl ring-1 ring-[color:var(--hairline)]">
            {ad.imageUrl ? (
              <Image
                src={ad.imageUrl}
                alt={ad.title}
                fill
                sizes="120px"
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/ad:scale-110"
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}10)`,
                }}
                aria-hidden
              >
                <Megaphone className="h-5 w-5" style={{ color: accentColor }} strokeWidth={1.75} />
              </div>
            )}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, transparent 50%)',
              }}
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md',
                  'text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em]',
                  'text-neutral-500 dark:text-neutral-400',
                  'bg-neutral-100/80 dark:bg-neutral-800/80',
                  'border border-[color:var(--hairline)]',
                )}
              >
                <Sparkles className="h-2 w-2" strokeWidth={2.5} aria-hidden />
                <span>AD · تبلیغ</span>
              </span>
            </div>
            <h4 className="text-[13px] sm:text-[14.5px] font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-1 sm:line-clamp-2 text-balance">
              {ad.title}
            </h4>
            {ad.description && (
              <p className="mt-0.5 hidden sm:block text-[11.5px] leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-1">
                {ad.description}
              </p>
            )}
          </div>

          {/* CTA pill */}
          <div
            className="hidden sm:inline-flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-300 group-hover/ad:gap-1.5"
            style={{
              backgroundColor: `${accentColor}1a`,
              color: accentColor,
            }}
          >
            <span>مشاهده</span>
            <ExternalLink
              className="h-3 w-3 transition-transform duration-300 group-hover/ad:rotate-12"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </motion.a>
  );
}

/* ============================================================================
   AdBanner — بنر عریض تمام عرض با cover image
   ============================================================================ */
export function AdBanner({ ad, accentColor = '#5b6cff', className }: AdCommonProps) {
  const reduce = useReducedMotion();
  const { ref, onMove, onLeave } = useMouseSpotlight<HTMLAnchorElement>();
  if (!ad) return null;

  return (
    <motion.a
      ref={ref}
      href={ad.linkUrl}
      target="_blank"
      rel="noopener sponsored"
      aria-label={`تبلیغ: ${ad.title}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ duration: 0.3, ease: STRIPE_EASE }}
      className={cn(
        'group/bnr ad-spotlight-3d relative block overflow-hidden',
        'rounded-2xl sm:rounded-3xl',
        'border border-[color:var(--hairline)]',
        'bg-neutral-100/40 dark:bg-neutral-900/40 backdrop-blur-md',
        'min-h-[140px] sm:min-h-[180px] lg:min-h-[200px]',
        'transition-shadow duration-300',
        'hover:shadow-[0_16px_40px_-12px_rgba(94,106,230,0.35)]',
        className,
      )}
    >
      {/* تصویر پس‌زمینه */}
      <div className="absolute inset-0">
        {ad.imageUrl ? (
          <Image
            src={ad.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 1200px, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover/bnr:scale-[1.04]"
            aria-hidden
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${accentColor}40 0%, ${accentColor}10 100%)`,
            }}
            aria-hidden
          />
        )}
        {/* Gradient overlay برای خوانایی */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              'linear-gradient(90deg, rgba(20,23,32,0.85) 0%, rgba(20,23,32,0.55) 50%, rgba(20,23,32,0.15) 100%)',
          }}
        />
        {/* accent corner glow */}
        <div
          className="absolute -top-12 -end-12 h-48 w-48 rounded-full blur-3xl opacity-30 group-hover/bnr:opacity-50 transition-opacity duration-500"
          aria-hidden
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* محتوا */}
      <div className="relative h-full flex items-center gap-4 sm:gap-6 p-5 sm:p-7 lg:p-8 min-h-[inherit]">
        <div className="min-w-0 flex-1 space-y-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
              'text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em]',
              'text-white/90',
              'bg-white/10 backdrop-blur-md border border-white/15',
            )}
          >
            <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
            <span>AD · تبلیغ</span>
          </span>
          <h4 className="text-[16px] sm:text-[19px] lg:text-[22px] font-bold leading-snug text-white text-balance line-clamp-2">
            {ad.title}
          </h4>
          {ad.description && (
            <p className="hidden sm:block text-[12.5px] sm:text-[13.5px] leading-relaxed text-white/75 line-clamp-1 sm:line-clamp-2 max-w-2xl">
              {ad.description}
            </p>
          )}
        </div>

        <div
          className="hidden sm:inline-flex shrink-0 items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-[12.5px] sm:text-[13.5px] font-bold text-neutral-900 dark:text-white transition-all duration-300 group-hover/bnr:gap-3"
          style={{
            backgroundColor: '#fff',
            boxShadow: `0 8px 24px -8px ${accentColor}80`,
          }}
        >
          <span>مشاهده</span>
          <ArrowLeft
            className="h-4 w-4 transition-transform duration-300 group-hover/bnr:-translate-x-1"
            strokeWidth={2.5}
            style={{ color: accentColor }}
            aria-hidden
          />
        </div>
      </div>
    </motion.a>
  );
}

export default AdSlot;
