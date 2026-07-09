'use client';

/**
 * AdCard — سیستم کارت تبلیغاتی ۲۰۲۶
 *
 * فلسفه:
 *  - هماهنگی کامل با PostItem (همون border, radius, shadow, hover)
 *  - Glassmorphism + dark-first
 *  - هیچ المان بصری متفاوت از پست‌ها (به جز label "تبلیغ")
 *  - موتور تبلیغ: انتخاب هوشمند بر اساس context
 *  - Responsive: 1col موبایل، 2col تبلت، 3col دسکتاپ
 *
 *  Variants:
 *   - 'inline'  → کارت کامل بین پست‌ها (در masonry)
 *   - 'compact' → افقی فشرده (در sidebar)
 *   - 'showcase' → هیروی بزرگ (بالای بخش‌ها)
 *
 *  تکنیک‌های ۲۰۲۶:
 *   1. CSS columns masonry compatible
 *   2. Tilt 3D subtle
 *   3. Spotlight cursor (radial gradient)
 *   4. Mouse-tracked parallax
 *   5. Conic-gradient border on hover
 *   6. prefers-reduced-motion respected
 *   7. @container queries برای واکنش‌گرایی داخلی
 */

import { useRef, useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpLeft, ExternalLink, Sparkles, Eye } from 'lucide-react';
import type { Advertisement, AdSize } from '@/types/types';
import { cn, toPersianNumber } from '@/lib/utils';
import { TiltCard } from '@/components/ModernTrending/effects/TiltCard';

export type AdCardVariant = 'inline' | 'compact' | 'showcase';

interface AdCardProps {
  ad: Advertisement;
  variant?: AdCardVariant;
  /** برای masonry: span چند ستون */
  className?: string;
  /** شماره‌ی تبلیغ (برای de-dup) */
  position?: number;
  /** accent color دسته (برای pill) */
  accentColor?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getSizeForVariant(variant: AdCardVariant): AdSize {
  switch (variant) {
    case 'showcase':
      return 'LARGE';
    case 'compact':
      return 'SMALL';
    case 'inline':
    default:
      return 'MEDIUM';
  }
}

function getRatioForAd(ad: Advertisement, variant: AdCardVariant): string {
  // اگر custom dimensions داره، استفاده کن
  if (ad.size === 'CUSTOM' && ad.customDimensions) {
    try {
      // 2026-06-16: Prisma's `customDimensions` is typed as
      // `Prisma.JsonValue | null` (string | number | true | object | array).
      // Coerce to string before parsing so the TS build doesn't break.
      const raw =
        typeof ad.customDimensions === 'string'
          ? ad.customDimensions
          : JSON.stringify(ad.customDimensions);
      const dims = JSON.parse(raw);
      if (dims?.aspectRatio) return dims.aspectRatio;
    } catch {
      /* ignore */
    }
  }
  switch (variant) {
    case 'showcase':
      return '16/7';
    case 'compact':
      return '16/10';
    case 'inline':
    default:
      return '16/9';
  }
}

function formatJalaliShort(d: Date | string): string {
  const date = new Date(d);
  // Pin to Asia/Tehran so server (UTC) and client render identical strings
  // — avoids a React hydration mismatch in the showcase card.
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tehran',
  }).format(date);
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export default function AdCard({
  ad,
  variant = 'inline',
  className,
  position = 0,
  accentColor = 'rgb(94 106 230)',
}: AdCardProps) {
  if (!ad) return null;

  // showcase = متفاوت، compact = افقی، inline = پیش‌فرض
  if (variant === 'showcase') {
    return (
      <ShowcaseAd
        ad={ad}
        accentColor={accentColor}
        className={className}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <CompactAd
        ad={ad}
        accentColor={accentColor}
        className={className}
      />
    );
  }

  return (
    <InlineAd
      ad={ad}
      position={position}
      accentColor={accentColor}
      className={className}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Inline — برای masonry بین پست‌ها                                          */
/* -------------------------------------------------------------------------- */

function InlineAd({
  ad,
  position,
  accentColor,
  className,
}: {
  ad: Advertisement;
  position: number;
  accentColor: string;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const ratio = getRatioForAd(ad, 'inline');

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
    <article
      className={cn('group/ad relative w-full', className)}
      role="complementary"
      aria-label={`تبلیغ ${toPersianNumber(position + 1)}: ${ad.title}`}
      dir="rtl"
    >
      <TiltCard intensity={3} perspective={1400} className="w-full">
        <Link
          ref={ref}
          href={ad.linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className={cn(
            'ad-spotlight-3d block w-full',
            'relative overflow-hidden rounded-2xl sm:rounded-3xl',
            'border border-neutral-200/70 dark:border-neutral-800/80',
            'bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md',
            'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-12px_rgba(20,23,32,0.12)]',
            'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.4)]',
            'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_20px_40px_-20px_rgba(94,106,230,0.25)]',
            'dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-20px_rgba(94,106,230,0.3)]',
            'hover:-translate-y-0.5 transition-[transform,box-shadow] duration-500',
          )}
        >
          <div className="ad-spotlight-inner relative">
            {/* Image container — همون aspect ratio با PostItem */}
            <div
              className="relative aspect-[16/9] sm:aspect-[16/10] overflow-hidden"
            >
              <Image
                src={ad.imageUrl}
                alt={ad.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/ad:scale-[1.04]"
              />

              {/* Vignette overlay — همون overlay PostItem */}
              <div
                className="absolute inset-0 pointer-events-none"
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

              {/* Spotlight reflection */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 group-hover/ad:opacity-100 transition-opacity duration-500 z-10 mix-blend-overlay"
                style={{
                  background:
                    'radial-gradient(circle 240px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(255, 255, 255, 0.18) 0%, transparent 100%)',
                }}
              />

              {/* Top badges — "تبلیغ" pill + position */}
              <div className="absolute top-2.5 start-2.5 sm:top-3 sm:start-3 z-20 flex items-center gap-1.5">
                <AdLabel accentColor={accentColor} />
              </div>
              <div className="absolute top-2.5 end-2.5 sm:top-3 sm:end-3 z-20">
                <span
                  className="
                    inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1
                    rounded-full
                    bg-white/90 dark:bg-neutral-900/85 backdrop-blur-md
                    border border-white/30 dark:border-neutral-700/50
                    text-[9px] sm:text-[10px] font-bold text-neutral-700 dark:text-neutral-200
                    tabular-nums
                    shadow-sm
                  "
                  aria-hidden
                >
                  {toPersianNumber(position + 1)}
                </span>
              </div>

              {/* Bottom title — overlay on image */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4">
                <h3
                  className={cn(
                    'text-[13.5px] sm:text-[15px] md:text-base font-bold leading-[1.4] sm:leading-[1.4]',
                    'text-white line-clamp-2 text-balance',
                    'drop-shadow-lg tracking-tight',
                  )}
                >
                  {ad.title}
                </h3>
              </div>
            </div>

            {/* Footer — meta + CTA (همونند PostItem) */}
            <div className="relative">
              <div
                className={cn(
                  'flex items-center justify-between gap-2',
                  'px-3.5 sm:px-5 py-2.5 sm:py-3',
                  'text-[10.5px] sm:text-xs text-neutral-500 dark:text-neutral-400',
                  'font-vazirmatn tabular-nums',
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles
                    className="h-3 w-3"
                    style={{ color: accentColor }}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>پیشنهاد ویژه</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <ArrowUpLeft
                    className="h-3 w-3 rtl:-scale-x-100"
                    strokeWidth={2.2}
                    aria-hidden
                  />
                  <span>کلیک برای مشاهده</span>
                </span>
              </div>
            </div>

            {/* Top hairline — مثل PostItem */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--hairline) 8%, var(--hairline) 92%, transparent)',
              }}
              aria-hidden
            />
          </div>
        </Link>
      </TiltCard>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Compact — برای sidebar و rail                                             */
/* -------------------------------------------------------------------------- */

function CompactAd({
  ad,
  accentColor,
  className,
}: {
  ad: Advertisement;
  accentColor: string;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);

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
    <Link
      ref={ref}
      href={ad.linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        'group/ad ad-spotlight-3d relative flex items-stretch overflow-hidden',
        'rounded-2xl sm:rounded-3xl',
        'border border-[color:var(--hairline)]',
        'bg-white/[0.5] dark:bg-neutral-900/50 backdrop-blur-md',
        'min-h-[88px] sm:min-h-[100px]',
        'transition-shadow duration-300',
        'hover:shadow-[0_12px_32px_-12px_rgba(94,106,230,0.35)]',
        'hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300',
        className,
      )}
      aria-label={`تبلیغ: ${ad.title}`}
    >
      <div className="ad-spotlight-inner flex items-stretch w-full">
        {/* Accent strip */}
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
            <Image
              src={ad.imageUrl}
              alt={ad.title}
              fill
              sizes="120px"
              className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/ad:scale-110"
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <AdLabel compact accentColor={accentColor} />
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
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Showcase — بنر هیروی بزرگ                                                */
/* -------------------------------------------------------------------------- */

function ShowcaseAd({
  ad,
  accentColor,
  className,
}: {
  ad: Advertisement;
  accentColor: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [views, setViews] = useState<number | null>(null);

  // Record view on mount
  useEffect(() => {
    if (!ad?.id) return;
    const recordView = async () => {
      try {
        const res = await fetch('/api/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: `ad:${ad.id}` }),
        });
        const data = await res.json();
        if (data.success && typeof data.views === 'number') {
          setViews(data.views);
        }
      } catch {
        /* silent */
      }
    };
    recordView();
  }, [ad?.id]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
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

  const dateStr = formatJalaliShort(ad.createdAt);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        'group/ad ad-spotlight-3d relative w-full',
        'overflow-hidden rounded-2xl sm:rounded-3xl',
        'border border-[color:var(--hairline)]',
        'bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_8px_32px_-12px_rgba(20,23,32,0.18)]',
        'dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_8px_32px_-12px_rgba(0,0,0,0.4)]',
        'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_32px_64px_-24px_rgba(94,106,230,0.30)]',
        'transition-shadow duration-500',
        className,
      )}
      role="complementary"
      aria-label={`تبلیغ: ${ad.title}`}
    >
      <div className="ad-spotlight-inner relative">
        <Link
          href={ad.linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block w-full"
        >
          <div className="relative grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-0">
            {/* Image */}
            <div className="relative aspect-[16/9] md:aspect-auto md:min-h-[280px] overflow-hidden">
              <Image
                src={ad.imageUrl}
                alt={ad.title}
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/ad:scale-[1.04]"
                priority
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4) 100%)',
                }}
                aria-hidden
              />
              <div
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover/ad:opacity-100 transition-opacity duration-500 mix-blend-overlay"
                style={{
                  background:
                    'radial-gradient(circle 320px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(255, 255, 255, 0.20) 0%, transparent 100%)',
                }}
              />
            </div>

            {/* Content */}
            <div className="relative flex flex-col gap-3 sm:gap-4 p-4 sm:p-5 md:p-6">
              <div className="flex items-center gap-2">
                <AdLabel accentColor={accentColor} />
                <span
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400"
                >
                  <span
                    className="size-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden
                  />
                  <span>پیشنهاد ویژه</span>
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-[26px] font-bold tracking-[-0.015em] leading-[1.2] text-neutral-900 dark:text-white line-clamp-2 text-balance">
                {ad.title}
              </h2>

              {ad.description && (
                <p className="text-[13px] sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-prose">
                  {ad.description}
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-vazirmatn tabular-nums">
                <span>{dateStr}</span>
                {views !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                    {toPersianNumber(views)} بازدید
                  </span>
                )}
              </div>

              {/* CTA */}
              <div className="mt-1 sm:mt-2 flex items-center gap-3">
                <span
                  className="
                    inline-flex items-center gap-2
                    h-10 px-5 rounded-full
                    text-[12.5px] sm:text-sm font-semibold
                    text-white
                    transition-transform duration-200
                    group-hover/ad:scale-[1.02] active:scale-[0.98]
                  "
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                    boxShadow: `0 8px 24px -8px ${accentColor}80`,
                  }}
                >
                  <span>مشاهده پیشنهاد</span>
                  <ArrowUpLeft
                    className="size-3.5 rtl:-scale-x-100"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </span>
                <span className="text-[10.5px] text-neutral-500 dark:text-neutral-400">
                  یا کلیک روی هر نقطه از بنر
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                             */
/* -------------------------------------------------------------------------- */

function AdLabel({
  compact = false,
  accentColor = 'rgb(94 106 230)',
}: {
  compact?: boolean;
  accentColor?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        'font-bold uppercase tracking-[0.18em]',
        'backdrop-blur-md',
        compact
          ? 'text-[8.5px] sm:text-[9px] px-1.5 py-0.5 text-neutral-500 dark:text-neutral-400 bg-white/80 dark:bg-neutral-900/80 border border-[color:var(--hairline)]'
          : 'text-[9px] sm:text-[10px] px-2 py-0.5 sm:px-2.5 sm:py-1 text-white border shadow-sm',
      )}
      style={
        !compact
          ? {
              backgroundColor: `${accentColor}dd`,
              borderColor: `${accentColor}40`,
            }
          : undefined
      }
    >
      <Sparkles className={compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} strokeWidth={2.5} aria-hidden />
      <span>تبلیغ</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  AdPicker — انتخاب هوشمند تبلیغ با de-duplication                         */
/* -------------------------------------------------------------------------- */

/**
 * هوشمند تبلیغ‌ها رو از لیست می‌چینه. اگه چند تبلیغ برای یک موقعیت داشته باشیم،
 * چرخشی انتخاب می‌کنه تا همه دیده بشن.
 */
export function pickAd(
  ads: Advertisement[],
  position: number,
  excludeIds: Set<string> = new Set(),
): Advertisement | null {
  if (ads.length === 0) return null;
  const available = ads.filter((ad) => !excludeIds.has(ad.id));
  const pool = available.length > 0 ? available : ads;
  return pool[position % pool.length] ?? null;
}

/**
 * سازنده‌ی لیست entries برای masonry — با de-dup هوشمند
 */
export function buildAdEntries<T>(
  totalItems: number,
  ads: Advertisement[],
  interval: number,
  startIndex: number = 0,
): Array<{ ad: Advertisement; position: number }> {
  if (ads.length === 0 || totalItems === 0) return [];
  const out: Array<{ ad: Advertisement; position: number }> = [];
  const used = new Set<string>();
  let adPickIdx = 0;

  for (let i = startIndex + interval; i <= totalItems + startIndex; i += interval) {
    // سعی کن تبلیغ تکراری نیاد
    let attempts = 0;
    let chosen: Advertisement | null = null;
    while (attempts < ads.length) {
      const candidate = ads[adPickIdx % ads.length];
      adPickIdx++;
      attempts++;
      if (candidate && !used.has(candidate.id)) {
        chosen = candidate;
        used.add(candidate.id);
        break;
      }
    }
    // اگه همه تبلیغ‌ها تکراری شدن، reset کن
    if (!chosen) {
      used.clear();
      chosen = ads[adPickIdx % ads.length];
      adPickIdx++;
      if (chosen) used.add(chosen.id);
    }
    if (chosen) {
      out.push({ ad: chosen, position: out.length });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Responsive helpers — برای جای‌گذاری درست در container های مختلف         */
/* -------------------------------------------------------------------------- */

/**
 * چه سایزهایی برای چه container هایی مناسب هستن:
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ Container         │ Recommended Sizes / Positions                │
 * ├──────────────────────────────────────────────────────────────────┤
 * │ Masonry (1/2/3/4col) │ MEDIUM (inline) — اندازه پست‌ها          │
 * │ Sidebar              │ SMALL  (compact) — افقی                  │
 * │ Hero (above section) │ LARGE   (showcase) — عرض کامل             │
 * │ Header strip         │ SMALL  (compact) — افقی فشرده            │
 * │ Footer               │ SMALL  (compact) — افقی                   │
 * │ Between categories   │ LARGE   (showcase) — فول‌بلید             │
 * └──────────────────────────────────────────────────────────────────┘
 */
