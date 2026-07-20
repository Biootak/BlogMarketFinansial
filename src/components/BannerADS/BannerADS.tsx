/**
 * BannerADS — بازطراحی ۲۰۲۶ (نسخه refined + immersive)
 * ----------------------------------------------------------------------------
 * چهار variant:
 *  - showcase  → نمایش اصلی (hero spotlight) با aurora mesh، perspective tilt،
 *                mouse-tracked parallax، scroll-driven mask reveal
 *  - rich      → کارت اسپلیت با تصویر + متن + CTA shimmer
 *  - image     → تصویر-محور با حاشیه conic-gradient چرخان روی hover
 *  - minimal   → سایدبار فشرده با AD eyebrow و hover scale
 *
 *  Server Component. تمام motion ها CSS-only هستن (ماوس ترک از کلاینت لایت
 *  با یه listener کوچک). Backward-compat shim برای prop های قدیمی حفظ شده.
 */

'use client';

import SafeImage from '@/components/SafeImage/SafeImage';
import { cn, parseCustomDimensions, toPersianNumber } from '@/lib/utils';
import type { AdPosition, AdSize, Advertisement, CustomAdDimensions } from '@/types/types';
import {
  ArrowUpLeft,
  Calendar,
  ExternalLink,
  Eye,
  Radio,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

export type BannerAdVariant = 'rich' | 'image' | 'showcase' | 'minimal' | 'spotlight';

export interface BannerAdsProps {
  className?: string;
  ad: Advertisement;
  customDimensions?: CustomAdDimensions;
  /** default: 'image' */
  variant?: BannerAdVariant;
  /** Legacy shim: if true → variant="image" */
  imageOnly?: boolean;
  /** Legacy shim: show the hairline "تبلیغ" pill (default true on rich/showcase) */
  showAdLabel?: boolean;
  /** Legacy shim: render title (used by rich) */
  showTitle?: boolean;
  /** Legacy shim: render description (used by rich) */
  showDescription?: boolean;
  /** Legacy shim: render CTA (used by rich) */
  showButton?: boolean;
  /** Legacy shim: override CTA node */
  customButton?: React.ReactNode;
}

/* ------------------------------------------------------------------------- */
/*  Helpers                                                                 */
/* ------------------------------------------------------------------------- */

function getRatioForSize(
  size: AdSize,
  custom?: CustomAdDimensions,
): { ratio: string; variant: 'card' | 'hero' | 'thumbnail' } {
  if (size === 'CUSTOM' && custom?.aspectRatio) {
    return { ratio: custom.aspectRatio, variant: 'card' };
  }
  switch (size) {
    case 'LARGE':
      return { ratio: '16/5', variant: 'hero' };
    case 'MEDIUM':
      return { ratio: '16/6', variant: 'card' };
    case 'SMALL':
      return { ratio: '16/7', variant: 'thumbnail' };
    default:
      return { ratio: '16/6', variant: 'card' };
  }
}

function resolveVariant(
  explicit: BannerAdVariant | undefined,
  legacy: {
    imageOnly?: boolean;
    showAdLabel?: boolean;
    showTitle?: boolean;
    showDescription?: boolean;
    showButton?: boolean;
  },
): BannerAdVariant {
  if (explicit) {
    // 'spotlight' is an alias for the new 'showcase' name
    if (explicit === 'spotlight') return 'showcase';
    return explicit;
  }
  if (legacy.imageOnly) return 'image';
  if (legacy.showTitle || legacy.showDescription || legacy.showButton) return 'rich';
  return 'image';
}

/* ------------------------------------------------------------------------- */
/*  Mouse parallax — یه listener کوچک 1KB که مختصات موس رو به CSS vars میریزه */
/* ------------------------------------------------------------------------- */

function useMouseParallax<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const onMove = (e: React.MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--mx', String(x));
    el.style.setProperty('--my', String(y));
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '0.5');
    el.style.setProperty('--my', '0.5');
  };
  return { ref, onMove, onLeave };
}

/* ------------------------------------------------------------------------- */
/*  Private sub-components                                                  */
/* ------------------------------------------------------------------------- */

function BannerAdLabel({
  text = 'تبلیغ',
  variant = 'primary',
  className,
}: {
  text?: string;
  variant?: 'primary' | 'minimal' | 'glass';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-[10px] font-bold uppercase tracking-[0.18em]',
        'backdrop-blur-sm',
        variant === 'minimal' &&
          'text-[9px] px-1.5 py-0.5 text-neutral-500 dark:text-neutral-400 bg-white/70 dark:bg-neutral-900/70 border border-[color:var(--hairline)] rounded-md tracking-[0.22em]',
        variant === 'glass' &&
          'text-primary-700 dark:text-primary-200 bg-white/80 dark:bg-neutral-900/70 border border-primary-500/30',
        variant === 'primary' &&
          'text-primary-500 dark:text-primary-300 bg-primary-500/10 dark:bg-primary-400/10 border border-primary-500/20 dark:border-primary-400/20',
        className,
      )}
    >
      {variant === 'minimal' ? null : (
        <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
      )}
      <span>{text}</span>
    </span>
  );
}

function BannerCta({
  href,
  label = 'مشاهده',
  size = 'md',
  tone = 'dark',
  asSpan = false,
}: {
  href: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'dark' | 'light' | 'primary';
  /** وقتی true باشه، به‌جای <a> یه <span> بصری رندر می‌کنه (برای جلوگیری از nested anchor) */
  asSpan?: boolean;
}) {
  const sizeClass =
    size === 'lg'
      ? 'px-5 py-2.5 text-sm'
      : size === 'sm'
        ? 'px-3 py-1.5 text-[11px]'
        : 'px-4 py-2 text-xs sm:text-sm';
  const toneClass =
    tone === 'primary'
      ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-[0_4px_18px_-6px_rgba(94,106,230,0.6)]'
      : tone === 'light'
        ? 'bg-white text-neutral-900 dark:bg-white dark:text-neutral-900'
        : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900';

  const sharedClass = cn(
    'ad-cta-shimmer group/cta relative inline-flex items-center gap-2 rounded-full',
    'font-semibold tracking-snug',
    'shadow-sm hover:shadow-md transition-all duration-300',
    'hover:gap-2.5',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
    toneClass,
    sizeClass,
  );

  const inner = (
    <>
      <span>{label}</span>
      <ArrowUpLeft
        className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:rotate-12"
        strokeWidth={2.25}
        aria-hidden
      />
    </>
  );

  // وقتی داخل یه <a> دیگه هستیم، از <span> بصری استفاده می‌کنیم
  if (asSpan) {
    return (
      <span aria-hidden className={sharedClass}>
        {inner}
      </span>
    );
  }

  return (
    <Link href={href} target="_blank" rel="noopener noreferrer sponsored" className={sharedClass}>
      {inner}
    </Link>
  );
}

function Sparkline() {
  return (
    <svg
      width="80"
      height="24"
      viewBox="0 0 80 24"
      fill="none"
      className="overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id="ad-spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(94 106 230)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="rgb(94 106 230)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M2 18 C 10 12, 15 20, 25 10 C 35 0, 40 16, 50 8 C 60 0, 65 14, 78 4"
        stroke="rgb(94 106 230)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M2 18 C 10 12, 15 20, 25 10 C 35 0, 40 16, 50 8 C 60 0, 65 14, 78 4 L 78 24 L 2 24 Z"
        fill="url(#ad-spark-grad)"
      />
      <circle cx="78" cy="4" r="3" fill="rgb(94 106 230)">
        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/*  Main component                                                          */
/* ------------------------------------------------------------------------- */

export default function BannerAds({
  className = '',
  ad,
  customDimensions,
  variant: variantProp,
  imageOnly,
  showAdLabel,
  showTitle,
  showDescription,
  showButton,
  customButton,
}: BannerAdsProps) {
  const { title, description, imageUrl, linkUrl, size, position, createdAt } = ad;
  const parsedCustom = customDimensions ?? parseCustomDimensions(ad.customDimensions);
  const { ratio, variant: imageVariant } = getRatioForSize(size, parsedCustom ?? undefined);

  const variant = resolveVariant(variantProp, {
    imageOnly,
    showAdLabel,
    showTitle,
    showDescription,
    showButton,
  });

  const showLabelResolved = typeof showAdLabel === 'boolean' ? showAdLabel : false;
  const showTitleResolved =
    typeof showTitle === 'boolean' ? showTitle : variant === 'rich' || variant === 'showcase';
  const showDescriptionResolved =
    typeof showDescription === 'boolean'
      ? showDescription
      : variant === 'rich' || variant === 'showcase';
  const showButtonResolved =
    typeof showButton === 'boolean' ? showButton : variant === 'rich' || variant === 'showcase';

  const isLcp = size === 'LARGE' || variant === 'showcase';

  // Rules of Hooks: همه هوک‌ها باید بدون شرط در بالای کامپوننت صدا زده شن
  const showcaseParallax = useMouseParallax<HTMLDivElement>();
  const imageLinkParallax = useMouseParallax<HTMLAnchorElement>();
  const richParallax = useMouseParallax<HTMLDivElement>();

  const [viewsCount, setViewsCount] = useState<number | null>(null);

  useEffect(() => {
    if (!ad?.id) return;
    const recordView = async () => {
      try {
        const res = await fetch('/api/pageview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page: `ad:${ad.id}` }),
        });
        const data = await res.json();
        if (data.success && typeof data.views === 'number') {
          setViewsCount(data.views);
        }
      } catch (err) {
        console.error('Failed to record ad view:', err);
      }
    };
    recordView();
  }, [ad?.id]);

  /* ------------------------------------------------------------------- */
  /*  Showcase — full-bleed editorial hero (the showpiece)               */
  /* ------------------------------------------------------------------- */
  if (variant === 'showcase') {
    const parallax = showcaseParallax;
    const created = new Date(createdAt);
    // Pin to Asia/Tehran so server (UTC) and client render identical
    // day/month strings — avoids a React hydration mismatch near midnight.
    const dateStr = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tehran',
    }).format(created);

    return (
      <div
        ref={parallax.ref}
        onMouseMove={parallax.onMove}
        onMouseLeave={parallax.onLeave}
        className={cn('nc-BannerADS ad-spotlight-3d relative w-full anim-fade-in-up', className)}
      >
        <Link
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`تبلیغ: ${title}`}
          className="ad-spotlight-inner block w-full"
        >
          <div
            className={cn(
              'group/ad relative w-full overflow-hidden',
              'rounded-3xl border border-[color:var(--hairline)]',
              'bg-gradient-to-br from-surface-elevated/80 via-surface-elevated/40 to-surface-elevated/80',
              'dark:from-surface-elevated/70 dark:via-surface-elevated/40 dark:to-surface-elevated/70',
              'backdrop-blur-xl',
              'shadow-[0_2px_24px_-12px_rgba(0,0,0,0.18)]',
              'transition-shadow duration-500 hover:shadow-[0_20px_60px_-20px_rgba(94,106,230,0.35)]',
              getPositionClass(position),
            )}
          >
            {/* Aurora mesh — gradient های drift کننده پشت کارت */}
            <div aria-hidden className="ad-mesh-aurora absolute inset-0 rounded-3xl" />

            {/* Glow ring pulse */}
            <div aria-hidden className="ad-pulse-glow absolute inset-0 rounded-3xl" />

            {/* Hairline مورب بالای کارت */}
            <div aria-hidden className="ad-spotlight-hairline absolute start-0 end-0 top-0 h-px" />

            {showLabelResolved && (
              <div className="absolute start-5 top-5 sm:start-7 sm:top-7 z-30 flex items-center gap-2">
                <BannerAdLabel />
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 tracking-wider">
                  <Radio className="h-3 w-3 text-primary-500" strokeWidth={2.5} aria-hidden />
                  <span>پیشنهاد ویژه</span>
                </span>
              </div>
            )}

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-5 md:gap-7 items-center p-5 sm:p-6 md:p-8">
              {/* Image با mask reveal + hover zoom */}
              <div className="order-1 md:order-none">
                <div
                  className={cn(
                    'relative w-full overflow-hidden rounded-2xl',
                    'ring-1 ring-[color:var(--hairline)]',
                    'shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)]',
                    'aspect-[16/8] md:aspect-[16/9]',
                  )}
                >
                  <div className="absolute inset-0 ad-mask-reveal">
                    <SafeImage
                      src={imageUrl}
                      alt={title}
                      variant="hero"
                      ratio="16/9"
                      sizes="(max-width: 768px) 100vw, 60vw"
                      priority={isLcp}
                      fill
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/ad:scale-[1.04]"
                    />
                  </div>

                  {/* Image overlay — vignette + gradient برای عمق */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.15) 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-2.5 sm:gap-3.5 min-w-0">
                {showTitleResolved && (
                  <h2 className="text-2xl sm:text-3xl md:text-[32px] lg:text-[36px] font-semibold tracking-[-0.02em] leading-[1.1] text-neutral-900 dark:text-white line-clamp-2 text-balance">
                    {title}
                  </h2>
                )}

                {showDescriptionResolved && description && (
                  <p className="text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-prose">
                    {description}
                  </p>
                )}

                {/* Sparkline — سیگنال واقعی «زنده» / داده‌محور */}
                {viewsCount !== null && (
                  <div className="flex items-center gap-4 py-1.5 animate-fade-in">
                    <Sparkline />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary-500 dark:text-primary-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        روند بازدید زنده
                      </span>
                      <span className="text-[11.5px] font-semibold text-neutral-600 dark:text-neutral-300 tabular-nums flex items-center gap-1.5">
                        <Eye
                          className="inline h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500"
                          strokeWidth={2.25}
                          aria-hidden
                        />
                        <span>{toPersianNumber(viewsCount)}</span> بازدید واقعی
                      </span>
                    </div>
                  </div>
                )}

                {/* Meta row — تاریخ + spacer */}
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  <Calendar className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                    {dateStr}
                  </span>
                </div>

                {/* CTA row */}
                {showButtonResolved && (
                  <div className="mt-2 sm:mt-3 flex items-center gap-3 flex-wrap">
                    {customButton ?? (
                      <BannerCta
                        href={linkUrl}
                        label="مشاهده پیشنهاد ویژه"
                        size="lg"
                        tone="primary"
                        asSpan
                      />
                    )}
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      یا کلیک روی هر نقطه از کارت
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom hairline */}
            <div
              aria-hidden
              className="ad-spotlight-hairline absolute start-0 end-0 bottom-0 h-px"
            />

            {/* Corner brackets — چهار گوشه، وقتی hover میشه fade in */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-3 sm:inset-4 opacity-0 group-hover/ad:opacity-100 transition-opacity duration-500"
            >
              <div className="absolute start-0 top-0 h-3 w-3 border-s border-t border-primary-500/60 rounded-tl-md" />
              <div className="absolute end-0 top-0 h-3 w-3 border-e border-t border-primary-500/60 rounded-tr-md" />
              <div className="absolute start-0 bottom-0 h-3 w-3 border-s border-b border-primary-500/60 rounded-bl-md" />
              <div className="absolute end-0 bottom-0 h-3 w-3 border-e border-b border-primary-500/60 rounded-br-md" />
            </div>
          </div>
        </Link>
      </div>
    );
  }

  /* ------------------------------------------------------------------- */
  /*  Image-only (the `image` + `minimal` variants)                      */
  /* ------------------------------------------------------------------- */
  if (variant === 'image' || variant === 'minimal') {
    const isMinimal = variant === 'minimal';
    const parallax = imageLinkParallax;
    return (
      <Link
        ref={parallax.ref}
        onMouseMove={parallax.onMove}
        onMouseLeave={parallax.onLeave}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`تبلیغ: ${title}`}
        className={cn(
          'nc-BannerADS group/ad ad-spotlight-3d relative block w-full anim-fade-in-up',
          isMinimal
            ? 'rounded-2xl overflow-hidden bg-surface-elevated/30 transition-all duration-300 hover:scale-[1.025] hover:shadow-[0_8px_28px_-12px_rgba(94,106,230,0.4)]'
            : 'ad-conic-border rounded-3xl overflow-hidden bg-surface-elevated/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_-18px_rgba(94,106,230,0.35)]',
          getPositionClass(position),
          className,
        )}
      >
        <div className="ad-spotlight-inner relative w-full overflow-hidden rounded-3xl">
          {/* Spotlight reflection gloss effect */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 group-hover/ad:opacity-100 transition-opacity duration-500 z-20 mix-blend-overlay"
            style={{
              background:
                'radial-gradient(circle 300px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(255, 255, 255, 0.15) 0%, var(--glow-soft) 40%, transparent 100%)',
            }}
          />

          <div
            className={cn(
              'relative w-full overflow-hidden',
              isMinimal ? 'aspect-[16/9] sm:aspect-[16/8]' : 'aspect-[16/5] sm:aspect-[16/6]',
            )}
          >
            <SafeImage
              src={imageUrl}
              alt={title}
              variant={imageVariant}
              ratio={ratio}
              containerClassName="absolute inset-0"
              sizes={isMinimal ? '(max-width: 1024px) 100vw, 320px' : '100vw'}
              priority={isLcp}
              fill
              fillMode="ambient"
              className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/ad:scale-[1.04]"
            />
          </div>

          {/* Top-end corner label (always shown for minimal; hover for image) */}
          {showLabelResolved && (
            <div
              className={cn(
                'absolute z-10',
                isMinimal
                  ? 'end-2 top-2 opacity-100'
                  : 'end-3 top-3 opacity-0 translate-y-1 group-hover/ad:opacity-100 group-hover/ad:translate-y-0 transition-all duration-300',
              )}
            >
              <BannerAdLabel
                text={isMinimal ? 'AD' : 'تبلیغ'}
                variant={isMinimal ? 'minimal' : 'primary'}
              />
            </div>
          )}

          {/* Bottom-start "مشاهده" pill (image variant only, on hover) */}
          {!isMinimal && (
            <div
              className={cn(
                'absolute z-10 start-4 bottom-4',
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5',
                'bg-white/95 text-neutral-900 backdrop-blur-md',
                'dark:bg-neutral-900/95 dark:text-white',
                'text-[11px] sm:text-xs font-semibold',
                'border border-[color:var(--hairline)]',
                'shadow-sm',
                'opacity-0 translate-y-2 group-hover/ad:opacity-100 group-hover/ad:translate-y-0',
                'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              )}
            >
              <span>مشاهده</span>
              <ExternalLink className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            </div>
          )}
        </div>
      </Link>
    );
  }

  /* ------------------------------------------------------------------- */
  /*  Rich — split image + text card                                     */
  /* ------------------------------------------------------------------- */
  const parallax = richParallax;
  return (
    <div
      ref={parallax.ref}
      onMouseMove={parallax.onMove}
      onMouseLeave={parallax.onLeave}
      className={cn(
        'nc-BannerADS group/ad ad-spotlight-3d relative w-full anim-fade-in-up',
        'rounded-3xl overflow-hidden',
        'border border-[color:var(--hairline)]',
        'bg-white/[0.04] dark:bg-white/[0.06]',
        'backdrop-blur-xl',
        'shadow-[0_2px_24px_-12px_rgba(0,0,0,0.18)]',
        'transition-all duration-300',
        'hover:shadow-[0_18px_44px_-18px_rgba(94,106,230,0.32)]',
        'hover:border-primary-500/30',
        getPositionClass(position),
        className,
      )}
    >
      <div className="ad-spotlight-inner relative w-full overflow-hidden rounded-3xl">
        {/* Spotlight reflection gloss effect */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover/ad:opacity-100 transition-opacity duration-500 z-20 mix-blend-overlay"
          style={{
            background:
              'radial-gradient(circle 300px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(255, 255, 255, 0.15) 0%, var(--glow-soft) 40%, transparent 100%)',
          }}
        />

        {/* Whole-card click layer — از <a> استفاده نمی‌کنیم تا nested anchor نشه */}
        <div
          role="link"
          tabIndex={0}
          aria-label={`تبلیغ: ${title}`}
          onClick={() => window.open(linkUrl, '_blank', 'noopener,noreferrer')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ')
              window.open(linkUrl, '_blank', 'noopener,noreferrer');
          }}
          className="absolute inset-0 z-0 cursor-pointer"
        />

        {/* Vertical accent strip (RTL start edge) — با glow نرم */}
        <div
          aria-hidden
          className="absolute inset-y-0 start-0 w-1 sm:w-1.5 shadow-[0_0_24px_-4px_rgba(94,106,230,0.6)]"
          style={{
            background:
              'linear-gradient(180deg, var(--aurora-a), var(--primary-500) 50%, var(--aurora-b))',
          }}
        />

        {/* Top hairline gradient — وقتی hover میشه glow می‌گیره */}
        <div
          aria-hidden
          className="absolute start-0 end-0 top-0 h-px opacity-50"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--primary-500) 50%, transparent)',
          }}
        />

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 sm:gap-5 items-center p-4 sm:p-5 md:p-6">
          {/* Image — با hover scale 1.04 و ring glow */}
          <div className="relative w-full sm:w-64 md:w-72 lg:w-80 aspect-[16/9] overflow-hidden rounded-2xl ring-1 ring-[color:var(--hairline)] shadow-sm transition-all duration-500 group-hover:ring-primary-500/30">
            <SafeImage
              src={imageUrl}
              alt={title}
              variant="card"
              ratio="16/9"
              sizes="(max-width: 640px) 100vw, 320px"
              fill
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            />
            {/* Subtle gradient overlay برای عمق */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.18) 100%)',
              }}
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2 sm:gap-3 min-w-0">
            {showLabelResolved && (
              <div className="flex">
                <BannerAdLabel />
              </div>
            )}
            {showTitleResolved && (
              <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight text-neutral-900 dark:text-white line-clamp-2 text-balance">
                {title}
              </h2>
            )}
            {showDescriptionResolved && description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">
                {description}
              </p>
            )}
            {showButtonResolved && (
              <div className="mt-1 sm:mt-2 relative z-10">
                {customButton ?? <BannerCta href={linkUrl} size="md" tone="primary" asSpan />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPositionClass(position: AdPosition): string {
  switch (position) {
    default:
      return 'w-full';
  }
}
