'use client';

/**
 * AdSlot — اسلات تبلیغات inline (نسخه ۲۰۲۶ immersive)
 *
 * تکنیک‌ها:
 *  1. Mouse-tracked 3D perspective tilt (CSS vars)
 *  2. Conic-gradient rotating border on hover
 *  3. Scroll-driven reveal
 *  4. Accent gradient strip با animated shine
 *  5. Respects prefers-reduced-motion
 */

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from '@/lib/motion-shim';
import { ExternalLink, Sparkles } from 'lucide-react';
import type { Advertisement } from '@/types/types';
import { cn } from '@/lib/utils';
import { STRIPE_EASE } from '@/lib/motion';

interface AdSlotProps {
  ad: Advertisement;
  accentColor?: string;
  className?: string;
}

export function AdSlot({ ad, accentColor = '#5b6cff', className }: AdSlotProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement | null>(null);
  if (!ad) return null;

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
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
        'bg-white/[0.5] dark:bg-neutral-900/50 backdrop-blur-md',
        'min-h-[88px] sm:min-h-[100px]',
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
          {/* Thumbnail با hover scale */}
          <div className="relative h-14 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-lg sm:rounded-xl ring-1 ring-[color:var(--hairline)]">
            <Image
              src={ad.imageUrl}
              alt={ad.title}
              fill
              sizes="120px"
              className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/ad:scale-110"
            />
            {/* Subtle inner shadow برای عمق */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, transparent 50%)',
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
            <ExternalLink className="h-3 w-3 transition-transform duration-300 group-hover/ad:rotate-12" strokeWidth={2.25} aria-hidden />
          </div>
        </div>
      </div>
    </motion.a>
  );
}

export default AdSlot;
