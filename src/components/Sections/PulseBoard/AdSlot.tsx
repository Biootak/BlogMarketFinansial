'use client';

/**
 * AdSlot — اسلات تبلیغات inline (نسخه refined ۲۰۲۶)
 *
 * تکنیک‌ها:
 *  1. Hairline border + glassmorphism
 *  2. Subtle scale on hover (transform-only)
 *  3. Accent gradient strip چپ/راست
 *  4. ARIA label واضح
 *  5. Respects prefers-reduced-motion
 */

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
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
  if (!ad) return null;

  return (
    <motion.a
      href={ad.linkUrl}
      target="_blank"
      rel="noopener sponsored"
      aria-label={`تبلیغ: ${ad.title}`}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.3, ease: STRIPE_EASE }}
      className={cn(
        'group/ad relative flex items-stretch overflow-hidden',
        'rounded-2xl sm:rounded-3xl',
        'border border-neutral-200/70 dark:border-neutral-800/80',
        'bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md',
        'min-h-[88px] sm:min-h-[100px]',
        className,
      )}
    >
      {/* Accent gradient strip — left (RTL start) */}
      <div
        className="w-1 sm:w-1.5 shrink-0"
        style={{
          background: `linear-gradient(180deg, ${accentColor}aa, ${accentColor}33)`,
        }}
        aria-hidden
      />

      <div className="relative flex flex-1 items-center gap-3 sm:gap-4 p-3 sm:p-4">
        {/* Thumbnail */}
        <div className="relative h-14 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-lg sm:rounded-xl">
          <Image
            src={ad.imageUrl}
            alt={ad.title}
            fill
            sizes="120px"
            className="object-cover"
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-block text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
              AD · تبلیغ
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

        {/* CTA */}
        <div
          className="hidden sm:inline-flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
          style={{
            backgroundColor: `${accentColor}1a`,
            color: accentColor,
          }}
        >
          <span>مشاهده</span>
          <ExternalLink className="h-3 w-3" strokeWidth={2.25} aria-hidden />
        </div>
      </div>
    </motion.a>
  );
}

export default AdSlot;
