'use client';

/**
 * AdCardStrip — بازطراحی کامل نمایش تبلیغات صفحه اصلی (نسخه ۲۰۲۶)
 * ----------------------------------------------------------------------------
 * به‌جای ۱ تبلیغ بزرگ که فضای زیادی اشغال می‌کنه، چند کارت جمع‌وجور کنار هم
 * چیده می‌شن تا:
 *   - حس "بازاری" و متنوع منتقل بشه
 *   - کاربر بتونه چند گزینه رو یکجا ببینه
 *   - فضای عمودی صفحه کمتر اشغال بشه
 *
 * Layout:
 *   - 1 hero ادیتوریالی (با spotlight)
 *   - 2-3 کارت کوچک‌تر (rich-card) کنارش
 *   - mobile: horizontal scroll-snap با 1.1 کارت visible
 *   - tablet: 1 hero + 1 rich
 *   - desktop: 1 hero (50%) + 2 rich (50% تقسیم)
 *   - ultra-wide: 1 hero + 3 rich
 *
 * رفتار:
 *   - prefers-reduced-motion → همه چی static
 *   - mouse-tracked spotlight روی hero (CSS vars — بدون framer-motion)
 *   - shimmer CTA هنگام hover
 *   - bookmark / share در hero
 */

import SafeImage from '@/components/SafeImage/SafeImage';
import { motion, useReducedMotion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import type { Advertisement } from '@/types/types';
import { ArrowLeft, ArrowUpLeft, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

interface AdCardStripProps {
  ads: Advertisement[];
  className?: string;
  /** Heading کوچک بالای strip — اختیاری */
  eyebrow?: string;
  /** accent رنگ. اختیاری — primary می‌فتهه اگه ندی. */
  accentColor?: string;
}

export function AdCardStrip({
  ads,
  className,
  eyebrow = 'پیشنهاد سردبیران',
  accentColor = '#5b6cff',
}: AdCardStripProps) {
  const _reduce = useReducedMotion();

  // لیست ads رو فیلتر می‌کنیم (null/empty)
  const items = useMemo(() => (Array.isArray(ads) ? ads.filter(Boolean) : []), [ads]);

  if (items.length === 0) return null;

  const [hero, ...rest] = items;
  const richItems = rest.slice(0, 3);

  return (
    <section dir="rtl" aria-label="تبلیغات" className={cn('relative isolate', className)}>
      {/* Eyebrow */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
            aria-hidden
          >
            <Sparkles className="h-3 w-3" strokeWidth={2.25} />
          </span>
          <h2 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.18em] text-neutral-600 dark:text-neutral-300">
            {eyebrow}
          </h2>
        </div>
      </div>

      {/* Grid: hero + 1-3 rich cards */}
      <div
        className={cn(
          'grid gap-3 sm:gap-4',
          // mobile: 1 col
          'grid-cols-1',
          // md: hero + 1 rich
          richItems.length > 0 && 'md:grid-cols-[1.4fr_1fr]',
          // lg: hero + 2 rich
          richItems.length > 1 && 'lg:grid-cols-[1.4fr_1fr_1fr]',
          // xl: hero + 3 rich
          richItems.length > 2 && 'xl:grid-cols-[1.5fr_1fr_1fr_1fr]',
        )}
      >
        {/* HERO — spotlight */}
        {hero && (
          <HeroAdCard
            ad={hero}
            accentColor={accentColor}
            className={cn('h-full', richItems.length === 0 && 'md:col-span-1')}
          />
        )}

        {/* RICH CARDS — compact */}
        {richItems.map((ad, i) => (
          <div key={ad.id} className="h-full">
            <RichAdCard ad={ad} accentColor={accentColor} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   HeroAdCard — کارت اصلی
   ============================================================================ */
function HeroAdCard({
  ad,
  accentColor,
  className,
}: {
  ad: Advertisement;
  accentColor: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn('group/hero-ad relative', className)}
    >
      <Link
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        // WCAG 2.5.3 label-in-name: visible content is the accessible name.
        className={cn(
          'ad-spotlight-3d relative flex flex-col h-full overflow-hidden rounded-2xl sm:rounded-3xl',
          'border border-[color:var(--hairline)]',
          'bg-gradient-to-br from-white/80 to-neutral-50/40 dark:from-neutral-900/70 dark:to-neutral-900/40',
          'backdrop-blur-md',
          'min-h-[200px] sm:min-h-[220px] lg:min-h-[260px]',
          'shadow-[0_2px_24px_-12px_rgba(0,0,0,0.18)]',
          'transition-shadow duration-500',
          'hover:shadow-[0_24px_60px_-20px_rgba(94,106,230,0.4)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
        )}
        style={{ ['--ad-accent' as string]: accentColor } as React.CSSProperties}
      >
        <div className="ad-spotlight-inner relative h-full">
          {/* Background image (visible on hero) */}
          <div className="absolute inset-0">
            {ad.imageUrl ? (
              <SafeImage
                src={ad.imageUrl}
                alt=""
                fill
                sizes="(min-width: 1280px) 40vw, (min-width: 768px) 60vw, 100vw"
                containerClassName="absolute inset-0"
                className="object-cover transition-transform duration-700 ease-out group-hover/hero-ad:scale-[1.04]"
                variant="hero"
                ratio="16/10"
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
            {/* dark gradient overlay for readability */}
            <div
              className="absolute inset-0"
              aria-hidden
              style={{
                background:
                  'linear-gradient(135deg, rgba(20,23,32,0.85) 0%, rgba(20,23,32,0.55) 50%, rgba(20,23,32,0.15) 100%)',
              }}
            />
            {/* accent glow corner */}
            <div
              className="absolute -top-12 -end-12 h-48 w-48 rounded-full blur-3xl opacity-30 group-hover/hero-ad:opacity-50 transition-opacity duration-500"
              aria-hidden
              style={{ backgroundColor: accentColor }}
            />
          </div>

          {/* Content */}
          <div className="relative h-full flex flex-col justify-between p-4 sm:p-5 lg:p-6 min-h-[inherit] text-white">
            <div className="flex items-center gap-2">
            </div>

            <div className="space-y-2 sm:space-y-2.5">
              <h3 className="text-[16px] sm:text-[20px] lg:text-[22px] font-bold leading-[1.2] line-clamp-2 text-balance">
                {ad.title}
              </h3>
              {ad.description && (
                <p className="hidden sm:block text-[12.5px] sm:text-[13.5px] leading-relaxed text-white/80 line-clamp-2 max-w-xl text-pretty">
                  {ad.description}
                </p>
              )}

              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <span
                  className={cn(
                    'ad-cta-shimmer group/cta relative inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full',
                    'text-[12px] sm:text-[13px] font-bold text-neutral-900 dark:text-white bg-white',
                    'transition-all duration-300 hover:gap-2.5',
                    'shadow-md',
                  )}
                >
                  <span>مشاهده پیشنهاد</span>
                  <ArrowUpLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="text-[10.5px] sm:text-[11px] text-white/70 font-vazirmatn">
                  یا کلیک روی هر نقطه از کارت
                </span>
              </div>
            </div>
          </div>

          {/* Corner brackets (hover) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-3 sm:inset-4 opacity-0 group-hover/hero-ad:opacity-100 transition-opacity duration-500"
          >
            <div className="absolute start-0 top-0 h-3 w-3 border-s border-t border-white/40 rounded-tl-md" />
            <div className="absolute end-0 top-0 h-3 w-3 border-e border-t border-white/40 rounded-tr-md" />
            <div className="absolute start-0 bottom-0 h-3 w-3 border-s border-b border-white/40 rounded-bl-md" />
            <div className="absolute end-0 bottom-0 h-3 w-3 border-e border-b border-white/40 rounded-br-md" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ============================================================================
   RichAdCard — کارت جمع‌وجور
   ============================================================================ */
function RichAdCard({
  ad,
  accentColor,
  index,
}: {
  ad: Advertisement;
  accentColor: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="group/rich-ad relative h-full"
    >
      <Link
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        // WCAG 2.5.3 label-in-name: visible content is the accessible name.
        className={cn(
          'relative flex flex-col h-full overflow-hidden rounded-2xl',
          'border border-[color:var(--hairline)]',
          'bg-white/75 dark:bg-neutral-900/65 backdrop-blur-md',
          'shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_4px_16px_-8px_rgba(20,23,32,0.08)]',
          'transition-all duration-300',
          'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_14px_32px_-12px_rgba(94,106,230,0.3)]',
          'hover:-translate-y-0.5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
        )}
        style={{ ['--ad-accent' as string]: accentColor } as React.CSSProperties}
      >
        {/* Image — نسبت تصویر طوری تنظیم شد که با hero هم‌خونی داشته باشه
            و rich card ارتفاعش رو با hero هماهنگ کنه. */}
        <div className="relative aspect-[16/9] overflow-hidden shrink-0">
          {ad.imageUrl ? (
            <SafeImage
              src={ad.imageUrl}
              alt={ad.title}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
              containerClassName="absolute inset-0"
              className="object-cover transition-transform duration-500 ease-out group-hover/rich-ad:scale-[1.05]"
              variant="card"
              ratio="16/10"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
              }}
              aria-hidden
            />
          )}

          {/* Accent corner glow */}
          <div
            className="absolute -top-8 -end-8 h-24 w-24 rounded-full blur-2xl opacity-30 group-hover/rich-ad:opacity-50 transition-opacity duration-500"
            aria-hidden
            style={{ backgroundColor: accentColor }}
          />


          {/* Bottom-start "مشاهده" pill (on hover) */}
          <div
            className={cn(
              'absolute z-10 start-3 bottom-3',
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
              'bg-white/95 text-neutral-900 backdrop-blur-md',
              'dark:bg-neutral-900/95 dark:text-white',
              'text-[10.5px] sm:text-[11px] font-semibold',
              'border border-[color:var(--hairline)] shadow-sm',
              'opacity-0 translate-y-1 group-hover/rich-ad:opacity-100 group-hover/rich-ad:translate-y-0',
              'transition-all duration-300',
            )}
          >
            <span>مشاهده</span>
            <ExternalLink className="h-3 w-3" strokeWidth={2.5} aria-hidden />
          </div>
        </div>

        {/* Content — flex-1 پر کردن فضای خالی پایین */}
        <div className="relative flex-1 min-h-0 p-3.5 sm:p-4 flex flex-col gap-1.5">
          <h4 className="text-[13px] sm:text-[14px] font-bold leading-[1.4] text-neutral-900 dark:text-white line-clamp-2 text-balance">
            {ad.title}
          </h4>
          {ad.description && (
            <p className="hidden sm:block text-[11.5px] leading-relaxed text-neutral-600 dark:text-neutral-300 line-clamp-2">
              {ad.description}
            </p>
          )}

          <div className="mt-auto pt-1 flex items-center justify-between text-[10.5px] font-vazirmatn tabular-nums text-neutral-600 dark:text-neutral-300">
            <span>پیشنهاد ویژه</span>
            <ArrowLeft
              className={cn(
                'h-3 w-3 text-[var(--ad-accent)]',
                'transition-transform duration-300',
                'opacity-60 group-hover/rich-ad:opacity-100 group-hover/rich-ad:-translate-x-0.5',
              )}
              strokeWidth={2.5}
              aria-hidden
            />
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}66, transparent)`,
          }}
          aria-hidden
        />
      </Link>
    </motion.div>
  );
}

export default AdCardStrip;
